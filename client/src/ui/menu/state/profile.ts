import { signal } from "@preact/signals";
import { AVATAR_KEY, COLOR_KEY, NAME_KEY } from "./storageKeys";

const AVATAR_SIZE = 128;

function readName(): string {
  const stored = localStorage.getItem(NAME_KEY);
  if (stored) return stored;
  const tag = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
  const generated = `player-${tag}`;
  localStorage.setItem(NAME_KEY, generated);
  return generated;
}

export const playerName = signal<string>(localStorage.getItem(NAME_KEY) ?? "");
export const playerAvatar = signal<string | null>(localStorage.getItem(AVATAR_KEY));

export function getStoredName(): string {
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function getStoredAvatar(): string | null {
  return localStorage.getItem(AVATAR_KEY);
}

export function getStoredColor(): string {
  let c = localStorage.getItem(COLOR_KEY);
  if (!c) {
    c = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    localStorage.setItem(COLOR_KEY, c);
  }
  return c;
}

export function ensureName(): string {
  const name = readName();
  playerName.value = name;
  return name;
}

export function setPlayerName(value: string): void {
  localStorage.setItem(NAME_KEY, value);
  playerName.value = value;
}

export function setPlayerAvatar(dataUrl: string): void {
  localStorage.setItem(AVATAR_KEY, dataUrl);
  playerAvatar.value = dataUrl;
}

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("image load failed"));
    img.src = url;
  });
  URL.revokeObjectURL(url);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(img, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export async function sampleCornerColor(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("image load failed"));
  });
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(img, img.width - 1, img.height - 1, 1, 1, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}
