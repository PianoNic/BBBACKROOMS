import type { RosterEntry } from "../net/protocol";
import { fetchRoster } from "../net/roster";
import { decodeBbpack } from "./bbpack";
import { migrateLegacyTexturePackDb } from "./legacyStorage";
import { MUSIC_DEFINITIONS, SOUND_DEFINITIONS } from "./soundRegistry";

export type PackTeacherEntry = { image?: string; name?: string; sound?: string };

export type StoredPack = {
  id: string;
  name: string;
  version: string;
  hash: string;
  teachers: Record<string, PackTeacherEntry>;
  images: Record<string, Blob>;
  sounds: Record<string, string>;
  music: Record<string, string>;
  audio: Record<string, Blob>;
};

export type PackSummary = {
  id: string;
  name: string;
  version: string;
  hash: string;
  teacherCount: number;
};

const DB_NAME = "nachsitzen_texture_packs";
const STORE_NAME = "packs";
const DB_VERSION = 1;
const ACTIVE_PACK_KEY = "nachsitzen_active_pack";

export const PACK_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_STRING_LEN = 64;
const MAX_IMAGE_BYTES = 512 * 1024;
const MAX_IMAGE_DIM = 1024;
export const MAX_TEACHER_ENTRIES = 256;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_SOUND_BYTES = 1024 * 1024;
export const MAX_MUSIC_BYTES = 6 * 1024 * 1024;
const ALLOWED_AUDIO_MIME = new Set(["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"]);
const KNOWN_SOUND_IDS = new Set(SOUND_DEFINITIONS.map((d) => d.id));
const KNOWN_MUSIC_IDS = new Set(MUSIC_DEFINITIONS.map((d) => d.id));

async function openDb(): Promise<IDBDatabase> {
  await migrateLegacyTexturePackDb();
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("failed to open pack database"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("pack database request failed"));
    });
  } finally {
    db.close();
  }
}

async function getAllPacks(): Promise<StoredPack[]> {
  const result = await withStore<StoredPack[]>("readonly", (store) => store.getAll());
  return result ?? [];
}

async function getPack(id: string): Promise<StoredPack | undefined> {
  return withStore<StoredPack | undefined>("readonly", (store) => store.get(id));
}

async function putPack(pack: StoredPack): Promise<void> {
  await withStore<IDBValidKey>("readwrite", (store) => store.put(pack));
}

async function deletePackRecord(id: string): Promise<void> {
  await withStore<undefined>("readwrite", (store) => store.delete(id));
}

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

async function hashBytes(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(digest);
}

async function checkImageDimensions(blob: Blob): Promise<void> {
  const bitmap = await createImageBitmap(blob);
  try {
    if (bitmap.width > MAX_IMAGE_DIM || bitmap.height > MAX_IMAGE_DIM) {
      throw new Error(`image exceeds ${MAX_IMAGE_DIM}px on a side`);
    }
  } finally {
    bitmap.close();
  }
}

type ManifestTeachers = Record<string, { image?: unknown; name?: unknown; sound?: unknown }>;
type Manifest = {
  id?: unknown; version?: unknown; name?: unknown; teachers?: unknown;
  sounds?: unknown; music?: unknown;
};

function validateManifestShape(raw: unknown): asserts raw is Manifest {
  if (!raw || typeof raw !== "object") throw new Error("pack.json is not an object");
}

function validateString(value: unknown, field: string, maxLen = MAX_STRING_LEN): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLen) {
    throw new Error(`pack.json field "${field}" must be a non-empty string up to ${maxLen} chars`);
  }
  return value;
}

function validateAudioAsset(
  assetsByName: Map<string, { name: string; mime: string; bytes: Uint8Array<ArrayBuffer> }>,
  assetName: string, field: string, maxBytes: number,
): Blob {
  const asset = assetsByName.get(assetName);
  if (!asset) {
    throw new Error(`pack.json field "${field}" references missing asset "${assetName}"`);
  }
  if (!ALLOWED_AUDIO_MIME.has(asset.mime)) {
    throw new Error(`audio asset "${assetName}" must be MP3, OGG, WAV or WebM`);
  }
  if (asset.bytes.byteLength > maxBytes) {
    throw new Error(`audio asset "${assetName}" exceeds ${maxBytes} bytes`);
  }
  return new Blob([asset.bytes], { type: asset.mime });
}

export async function importPackFromFile(file: File): Promise<StoredPack> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = await hashBytes(bytes);
  const { manifest: manifestRaw, assets } = decodeBbpack(bytes);
  const assetsByName = new Map(assets.map((a) => [a.name, a]));
  validateManifestShape(manifestRaw);

  const id = validateString(manifestRaw.id, "id");
  if (!PACK_ID_RE.test(id)) {
    throw new Error("pack.json field \"id\" must match /^[a-z0-9][a-z0-9-]{0,63}$/");
  }
  const version = validateString(manifestRaw.version, "version");
  const name = validateString(manifestRaw.name, "name");

  if (
    manifestRaw.teachers !== undefined
    && (typeof manifestRaw.teachers !== "object" || manifestRaw.teachers === null)
  ) {
    throw new Error("pack.json field \"teachers\" must be an object");
  }
  const teachersRaw = (manifestRaw.teachers ?? {}) as ManifestTeachers;
  const teacherKeys = Object.keys(teachersRaw);
  if (teacherKeys.length > MAX_TEACHER_ENTRIES) {
    throw new Error(`pack.json declares more than ${MAX_TEACHER_ENTRIES} teacher entries`);
  }

  const audio: Record<string, Blob> = {};
  const sounds: Record<string, string> = {};
  const music: Record<string, string> = {};

  if (manifestRaw.sounds !== undefined) {
    if (typeof manifestRaw.sounds !== "object" || manifestRaw.sounds === null) {
      throw new Error("pack.json field \"sounds\" must be an object");
    }
    const soundsRaw = manifestRaw.sounds as Record<string, unknown>;
    for (const soundId of Object.keys(soundsRaw)) {
      if (!KNOWN_SOUND_IDS.has(soundId)) {
        throw new Error(`pack.json field "sounds" references unknown sound id "${soundId}"`);
      }
      const assetName = validateString(soundsRaw[soundId], `sounds.${soundId}`, 256);
      const blob = validateAudioAsset(assetsByName, assetName, `sounds.${soundId}`, MAX_SOUND_BYTES);
      sounds[soundId] = assetName;
      audio[assetName] = blob;
    }
  }

  if (manifestRaw.music !== undefined) {
    if (typeof manifestRaw.music !== "object" || manifestRaw.music === null) {
      throw new Error("pack.json field \"music\" must be an object");
    }
    const musicRaw = manifestRaw.music as Record<string, unknown>;
    for (const trackId of Object.keys(musicRaw)) {
      if (!KNOWN_MUSIC_IDS.has(trackId)) {
        throw new Error(`pack.json field "music" references unknown track id "${trackId}"`);
      }
      const assetName = validateString(musicRaw[trackId], `music.${trackId}`, 256);
      const blob = validateAudioAsset(assetsByName, assetName, `music.${trackId}`, MAX_MUSIC_BYTES);
      music[trackId] = assetName;
      audio[assetName] = blob;
    }
  }

  if (teacherKeys.length === 0 && Object.keys(sounds).length === 0 && Object.keys(music).length === 0) {
    throw new Error("pack.json must declare at least one teacher entry");
  }

  const teachers: Record<string, PackTeacherEntry> = {};
  const images: Record<string, Blob> = {};

  for (const key of teacherKeys) {
    const entryRaw = teachersRaw[key];
    if (!entryRaw || typeof entryRaw !== "object") {
      throw new Error(`pack.json teacher entry "${key}" must be an object`);
    }
    if (entryRaw.image === undefined && entryRaw.sound === undefined) {
      throw new Error(`pack.json teacher entry "${key}" must include an image or a sound`);
    }

    const entry: PackTeacherEntry = {};
    if (entryRaw.image !== undefined) {
      const imageName = validateString(entryRaw.image, `teachers.${key}.image`, 256);
      const asset = assetsByName.get(imageName);
      if (!asset) {
        throw new Error(`pack.json teacher entry "${key}" references missing asset "${imageName}"`);
      }
      if (!ALLOWED_MIME.has(asset.mime)) {
        throw new Error(`image "${imageName}" must be JPEG, PNG or WebP`);
      }
      if (asset.bytes.byteLength > MAX_IMAGE_BYTES) {
        throw new Error(`image "${imageName}" exceeds ${MAX_IMAGE_BYTES} bytes`);
      }
      const blob = new Blob([asset.bytes], { type: asset.mime });
      await checkImageDimensions(blob);
      entry.image = imageName;
      images[imageName] = blob;
    }
    if (entryRaw.name !== undefined) {
      entry.name = validateString(entryRaw.name, `teachers.${key}.name`);
    }
    if (entryRaw.sound !== undefined) {
      const soundName = validateString(entryRaw.sound, `teachers.${key}.sound`, 256);
      const soundBlob = validateAudioAsset(assetsByName, soundName, `teachers.${key}.sound`, MAX_SOUND_BYTES);
      entry.sound = soundName;
      audio[soundName] = soundBlob;
    }
    teachers[key] = entry;
  }

  const stored: StoredPack = { id, name, version, hash, teachers, images, sounds, music, audio };
  await putPack(stored);
  return stored;
}

export async function listPacks(): Promise<PackSummary[]> {
  const packs = await getAllPacks();
  return packs.map((p) => ({
    id: p.id, name: p.name, version: p.version, hash: p.hash,
    teacherCount: Object.keys(p.teachers).length,
  }));
}

function revokeMemoryUrls(id: string): void {
  const mem = memoryByPackId.get(id);
  if (!mem) return;
  for (const url of mem.urls.values()) URL.revokeObjectURL(url);
  memoryByPackId.delete(id);
}

type PackChangeListener = () => void;
const packChangeListeners = new Set<PackChangeListener>();

export function onActivePackChange(cb: PackChangeListener): () => void {
  packChangeListeners.add(cb);
  return () => packChangeListeners.delete(cb);
}

function notifyActivePackChange(): void {
  for (const cb of packChangeListeners) cb();
}

export async function removePack(id: string): Promise<void> {
  revokeMemoryUrls(id);
  if (active && active.id === id) active = null;
  if (getActivePackId() === id) {
    try { localStorage.removeItem(ACTIVE_PACK_KEY); } catch {}
  }
  await deletePackRecord(id);
  notifyActivePackChange();
}

export async function getStoredPack(id: string): Promise<StoredPack | undefined> {
  return getPack(id);
}

export function invalidatePackCache(id: string): void {
  revokeMemoryUrls(id);
  if (active && active.id === id) active = null;
  notifyActivePackChange();
}

type LoadedPack = {
  id: string;
  name: string;
  hash: string;
  teachers: Record<string, PackTeacherEntry>;
  sounds: Record<string, string>;
  music: Record<string, string>;
  urls: Map<string, string>;
};

const memoryByPackId = new Map<string, LoadedPack>();
let active: LoadedPack | null = null;

async function loadIntoMemory(pack: StoredPack): Promise<LoadedPack> {
  const cached = memoryByPackId.get(pack.id);
  if (cached) return cached;
  const urls = new Map<string, string>();
  for (const [path, blob] of Object.entries(pack.images)) {
    urls.set(path, URL.createObjectURL(blob));
  }
  for (const [path, blob] of Object.entries(pack.audio ?? {})) {
    urls.set(path, URL.createObjectURL(blob));
  }
  const loaded: LoadedPack = {
    id: pack.id, name: pack.name, hash: pack.hash, teachers: pack.teachers,
    sounds: pack.sounds ?? {}, music: pack.music ?? {}, urls,
  };
  memoryByPackId.set(pack.id, loaded);
  return loaded;
}

export function getActivePackId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PACK_KEY);
  } catch {
    return null;
  }
}

export async function setActivePackId(id: string | null): Promise<void> {
  if (id === null) {
    active = null;
    try { localStorage.removeItem(ACTIVE_PACK_KEY); } catch {}
    notifyActivePackChange();
    return;
  }
  const pack = await getPack(id);
  if (!pack) throw new Error(`no locally stored pack with id "${id}"`);
  active = await loadIntoMemory(pack);
  try { localStorage.setItem(ACTIVE_PACK_KEY, id); } catch {}
  notifyActivePackChange();
}

export async function activatePack(id: string, hash: string): Promise<boolean> {
  const pack = await getPack(id);
  if (!pack || pack.hash !== hash) return false;
  active = await loadIntoMemory(pack);
  notifyActivePackChange();
  return true;
}

export function deactivatePack(): void {
  active = null;
  notifyActivePackChange();
}

export function activePack(): { id: string; name: string; hash: string } | null {
  if (!active) return null;
  return { id: active.id, name: active.name, hash: active.hash };
}

function resolveEntry(abilityId: string | undefined, rosterIndex: number): PackTeacherEntry | null {
  if (!active) return null;
  if (rosterIndex >= 0) {
    const byIndex = active.teachers[String(rosterIndex)];
    if (byIndex) return byIndex;
  }
  if (abilityId && active.teachers[abilityId]) return active.teachers[abilityId];
  return null;
}

export function resolveSound(id: string, defaultUrl: string): string {
  if (!active) return defaultUrl;
  const assetName = active.sounds[id];
  if (!assetName) return defaultUrl;
  return active.urls.get(assetName) ?? defaultUrl;
}

export function resolveMusic(id: string, defaultUrl: string): string {
  if (!active) return defaultUrl;
  const assetName = active.music[id];
  if (!assetName) return defaultUrl;
  return active.urls.get(assetName) ?? defaultUrl;
}

export function resolveTeacherSound(abilityId: string | undefined, rosterIndex: number): string | null {
  const entry = resolveEntry(abilityId, rosterIndex);
  if (!entry || !active || !entry.sound) return null;
  return active.urls.get(entry.sound) ?? null;
}

const rosterImageIndex = new Map<string, number>();
const rosterNameIndex = new Map<string, number>();
let rosterFetchStarted = false;

export function cacheRoster(entries: RosterEntry[]): void {
  rosterImageIndex.clear();
  rosterNameIndex.clear();
  entries.forEach((entry, index) => {
    if (!rosterImageIndex.has(entry.image)) rosterImageIndex.set(entry.image, index);
    const lower = entry.image.toLowerCase();
    if (!rosterImageIndex.has(lower)) rosterImageIndex.set(lower, index);
    const name = entry.name.trim();
    if (!rosterNameIndex.has(name)) rosterNameIndex.set(name, index);
  });
}

function ensureRosterCache(): void {
  if (rosterImageIndex.size > 0 || rosterFetchStarted) return;
  rosterFetchStarted = true;
  fetchRoster()
    .then((entries) => {
      cacheRoster(entries);
    })
    .catch(() => {});
}

function basename(url: string): string {
  const withoutQuery = url.split(/[?#]/)[0];
  const idx = withoutQuery.lastIndexOf("/");
  return idx >= 0 ? withoutQuery.slice(idx + 1) : withoutQuery;
}

function deriveIndexFromImage(defaultUrl: string): number {
  const name = basename(defaultUrl);
  const exact = rosterImageIndex.get(name);
  if (exact !== undefined) return exact;
  const lower = rosterImageIndex.get(name.toLowerCase());
  if (lower !== undefined) return lower;
  const match = /^(\d{1,4})-/.exec(name);
  if (match) {
    const n = Number(match[1]);
    if (n >= 1) return n - 1;
  }
  return -1;
}

function deriveIndexFromName(defaultName: string): number {
  const index = rosterNameIndex.get(defaultName.trim());
  return index !== undefined ? index : -1;
}

function resolvePackEntry(
  abilityId: string | undefined, rosterIndex: number, defaultUrl: string,
): PackTeacherEntry | null {
  let effectiveIndex = rosterIndex;
  if (rosterIndex < 0) {
    ensureRosterCache();
    effectiveIndex = deriveIndexFromImage(defaultUrl);
  }
  return resolveEntry(abilityId, effectiveIndex);
}

export function resolveTeacherImage(
  abilityId: string | undefined, rosterIndex: number, defaultUrl: string,
): string {
  const entry = resolvePackEntry(abilityId, rosterIndex, defaultUrl);
  if (!entry || !active || !entry.image) return defaultUrl;
  const url = active.urls.get(entry.image);
  return url ?? defaultUrl;
}

export function teacherThumbUrl(imageFile: string): string {
  const stem = imageFile.replace(/\.[^.]+$/, "");
  return `/teachers/thumbs/${stem}.webp`;
}

export function resolveTeacherThumb(
  abilityId: string | undefined, rosterIndex: number, imageFile: string,
): string {
  const defaultUrl = `/teachers/${imageFile}`;
  const entry = resolvePackEntry(abilityId, rosterIndex, defaultUrl);
  if (!entry || !active || !entry.image) return teacherThumbUrl(imageFile);
  const url = active.urls.get(entry.image);
  return url ?? teacherThumbUrl(imageFile);
}

export function resolveTeacherName(
  abilityId: string | undefined, rosterIndex: number, defaultName: string,
): string {
  let effectiveIndex = rosterIndex;
  if (rosterIndex < 0) {
    ensureRosterCache();
    effectiveIndex = deriveIndexFromName(defaultName);
  }
  const entry = resolveEntry(abilityId, effectiveIndex);
  return entry?.name ?? defaultName;
}

export type PackAudioDevHandle = { resolveSound: typeof resolveSound };

export function installPackAudioDevHook(): void {
  if (!import.meta.env.DEV) return;
  (window as unknown as { nachsitzenPackAudioDev?: PackAudioDevHandle }).nachsitzenPackAudioDev = {
    resolveSound,
  };
}

installPackAudioDevHook();
