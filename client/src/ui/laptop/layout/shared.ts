/** Tiny helpers shared by the Teams + Moodle challenge apps. */
import { el } from "../../dom";

export type SendFn = (choice: string) => void;

/** Stable initials for a name — used on fake avatar tiles. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "#6264A7", "#8378DE", "#0078D4", "#005A9E", "#A33EA1",
  "#D83B01", "#107C10", "#498205", "#C239B3", "#005E60",
];

export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function avatarTile(name: string, size = 32): HTMLDivElement {
  const a = el<HTMLDivElement>("div", "avatar");
  a.style.background = avatarColor(name);
  a.style.width = `${size}px`;
  a.style.height = `${size}px`;
  a.style.fontSize = `${Math.max(10, size * 0.4)}px`;
  a.textContent = initials(name);
  return a;
}

/** Map a fake filename to an Office-style file-type swatch. */
export function fileSwatch(name: string): { label: string; color: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return { label: "PDF", color: "#d13438" };
  if (ext === "docx" || ext === "doc") return { label: "W", color: "#185abd" };
  if (ext === "xlsx" || ext === "xls") return { label: "X", color: "#107c41" };
  if (ext === "pptx" || ext === "ppt") return { label: "P", color: "#c43e1c" };
  if (ext === "md" || ext === "txt") return { label: "TXT", color: "#605e5c" };
  return { label: "?", color: "#605e5c" };
}
