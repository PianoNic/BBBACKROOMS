import { encodeBbpack, type BbpackAsset } from "../../../../core/bbpack";
import { MAX_TEACHER_ENTRIES, PACK_ID_RE } from "../../../../core/texturePacks";
import type { RosterEntry } from "../../../../net/protocol";

export const MAX_IMAGE_BYTES = 512 * 1024;
export const MAX_IMAGE_DIM = 1024;
const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];

export type ProcessedImage = { blob: Blob; width: number; height: number };

export function slugifyImage(image: string): string {
  const base = image.replace(/\.[^./]+$/, "");
  return base.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

export function sanitizePackName(base: string): string {
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "-") || "pack";
  return cleaned.toLowerCase().endsWith(".bbpack") ? cleaned : `${cleaned}.bbpack`;
}

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function processImageFile(file: File | Blob): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  const targetRatio = 3 / 4;
  const bitmapRatio = bitmap.width / bitmap.height;
  let cropWidth: number;
  let cropHeight: number;
  if (bitmapRatio > targetRatio) {
    cropHeight = bitmap.height;
    cropWidth = Math.min(bitmap.width, Math.round(cropHeight * targetRatio));
  } else {
    cropWidth = bitmap.width;
    cropHeight = Math.min(bitmap.height, Math.round(cropWidth / targetRatio));
  }
  const sx = (bitmap.width - cropWidth) / 2;
  const sy = (bitmap.height - cropHeight) / 2;
  const outHeight = Math.min(cropHeight, MAX_IMAGE_DIM);
  const outWidth = Math.round(outHeight * targetRatio);
  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas nicht verfügbar");
  }
  ctx.drawImage(bitmap, sx, sy, cropWidth, cropHeight, 0, 0, outWidth, outHeight);
  bitmap.close();
  for (const quality of QUALITIES) {
    const blob = await encodeCanvas(canvas, quality);
    if (blob && blob.size <= MAX_IMAGE_BYTES) return { blob, width: outWidth, height: outHeight };
  }
  throw new Error("Bild zu groß, auch bei niedrigster Qualität");
}

export async function drawIntoCanvas(canvas: HTMLCanvasElement, blob: Blob): Promise<void> {
  const bitmap = await createImageBitmap(blob);
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
}

export type PackMeta = { id: string; version: string; name: string };

export type SlotEntry = { blob: Blob; nameOverride: string };

export async function buildPack(
  roster: RosterEntry[], slots: Map<number, SlotEntry>, meta: PackMeta,
): Promise<Uint8Array<ArrayBuffer>> {
  const editedIndices = [...slots.keys()].sort((a, b) => a - b);
  if (editedIndices.length > MAX_TEACHER_ENTRIES) {
    throw new Error(`höchstens ${MAX_TEACHER_ENTRIES} Bilder pro Pack`);
  }

  const teachers: Record<string, { image: string; name?: string }> = {};
  const assets: BbpackAsset[] = [];

  for (const index of editedIndices) {
    const slot = slots.get(index);
    if (!slot) continue;
    const entry = roster[index];
    const path = `teachers/${slugifyImage(entry.image)}.jpg`;
    assets.push({ name: path, mime: "image/jpeg", bytes: new Uint8Array(await slot.blob.arrayBuffer()) });
    const overrideName = slot.nameOverride.trim();
    const teacherEntry: { image: string; name?: string } = { image: path };
    if (overrideName) teacherEntry.name = overrideName;
    teachers[String(index)] = teacherEntry;
  }

  for (const index of editedIndices) {
    if (Object.keys(teachers).length >= MAX_TEACHER_ENTRIES) break;
    const entry = roster[index];
    if (Object.prototype.hasOwnProperty.call(teachers, entry.ability)) continue;
    teachers[entry.ability] = teachers[String(index)];
  }

  return encodeBbpack({ id: meta.id, version: meta.version, name: meta.name, teachers }, assets);
}

export function isIdValid(id: string): boolean {
  return PACK_ID_RE.test(id);
}

export function isVersionValid(version: string): boolean {
  return version.trim().length > 0 && version.length <= 64;
}

export function isNameValid(name: string): boolean {
  return name.trim().length > 0 && name.length <= 64;
}

export function bumpPatchVersion(version: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return version;
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

export type OpenedTeacherEntry = { image: string; name?: string };

export function slotIndicesFromTeachers(
  teachers: Record<string, OpenedTeacherEntry>, rosterLength: number,
): Map<number, OpenedTeacherEntry> {
  const out = new Map<number, OpenedTeacherEntry>();
  for (const key of Object.keys(teachers)) {
    if (!/^\d+$/.test(key)) continue;
    const index = Number(key);
    if (index < 0 || index >= rosterLength) continue;
    out.set(index, teachers[key]);
  }
  return out;
}
