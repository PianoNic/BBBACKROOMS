import type { RosterEntry } from "../net/protocol";
import { fetchRoster } from "../net/roster";
import { decodeBbpack } from "./bbpack";

export type PackTeacherEntry = { image: string; name?: string };

export type StoredPack = {
  id: string;
  name: string;
  version: string;
  hash: string;
  teachers: Record<string, PackTeacherEntry>;
  images: Record<string, Blob>;
};

export type PackSummary = {
  id: string;
  name: string;
  version: string;
  hash: string;
  teacherCount: number;
};

const DB_NAME = "bbb_texture_packs";
const STORE_NAME = "packs";
const DB_VERSION = 1;
const ACTIVE_PACK_KEY = "bbb_active_pack";

export const PACK_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_STRING_LEN = 64;
const MAX_IMAGE_BYTES = 512 * 1024;
const MAX_IMAGE_DIM = 1024;
export const MAX_TEACHER_ENTRIES = 256;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function openDb(): Promise<IDBDatabase> {
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

type ManifestTeachers = Record<string, { image?: unknown; name?: unknown }>;
type Manifest = { id?: unknown; version?: unknown; name?: unknown; teachers?: unknown };

function validateManifestShape(raw: unknown): asserts raw is Manifest {
  if (!raw || typeof raw !== "object") throw new Error("pack.json is not an object");
}

function validateString(value: unknown, field: string, maxLen = MAX_STRING_LEN): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLen) {
    throw new Error(`pack.json field "${field}" must be a non-empty string up to ${maxLen} chars`);
  }
  return value;
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

  if (!manifestRaw.teachers || typeof manifestRaw.teachers !== "object") {
    throw new Error("pack.json field \"teachers\" must be an object");
  }
  const teachersRaw = manifestRaw.teachers as ManifestTeachers;
  const teacherKeys = Object.keys(teachersRaw);
  if (teacherKeys.length === 0) throw new Error("pack.json must declare at least one teacher entry");
  if (teacherKeys.length > MAX_TEACHER_ENTRIES) {
    throw new Error(`pack.json declares more than ${MAX_TEACHER_ENTRIES} teacher entries`);
  }

  const teachers: Record<string, PackTeacherEntry> = {};
  const images: Record<string, Blob> = {};

  for (const key of teacherKeys) {
    const entryRaw = teachersRaw[key];
    if (!entryRaw || typeof entryRaw !== "object") {
      throw new Error(`pack.json teacher entry "${key}" must be an object`);
    }
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

    const entry: PackTeacherEntry = { image: imageName };
    if (entryRaw.name !== undefined) {
      entry.name = validateString(entryRaw.name, `teachers.${key}.name`);
    }
    teachers[key] = entry;
    images[imageName] = blob;
  }

  const stored: StoredPack = { id, name, version, hash, teachers, images };
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

export async function removePack(id: string): Promise<void> {
  revokeMemoryUrls(id);
  if (active && active.id === id) active = null;
  if (getActivePackId() === id) {
    try { localStorage.removeItem(ACTIVE_PACK_KEY); } catch {}
  }
  await deletePackRecord(id);
}

type LoadedPack = {
  id: string;
  name: string;
  hash: string;
  teachers: Record<string, PackTeacherEntry>;
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
  const loaded: LoadedPack = { id: pack.id, name: pack.name, hash: pack.hash, teachers: pack.teachers, urls };
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
    return;
  }
  const pack = await getPack(id);
  if (!pack) throw new Error(`no locally stored pack with id "${id}"`);
  active = await loadIntoMemory(pack);
  try { localStorage.setItem(ACTIVE_PACK_KEY, id); } catch {}
}

export async function activatePack(id: string, hash: string): Promise<boolean> {
  const pack = await getPack(id);
  if (!pack || pack.hash !== hash) return false;
  active = await loadIntoMemory(pack);
  return true;
}

export function deactivatePack(): void {
  active = null;
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
  if (!entry || !active) return defaultUrl;
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
  if (!entry || !active) return teacherThumbUrl(imageFile);
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
