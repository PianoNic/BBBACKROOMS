import type { EquippedCosmetics } from "../net/protocol";
import { resolveCosmetic } from "./cosmetics";

export const RARITY_COLORS: Record<string, string> = {
  common: "#9fb3c8",
  rare: "#5aa9e6",
  epic: "#b06ae6",
  legendary: "#ffd24a",
};

export function rarityColor(rarity: string | undefined): string {
  return (rarity && RARITY_COLORS[rarity]) || RARITY_COLORS.common;
}

export type TitleStyle = { text: string; color: string };

export function parseTitleRef(assetRef: string | undefined): TitleStyle | null {
  if (!assetRef) return null;
  const i = assetRef.indexOf("|");
  if (i < 0) return null;
  const text = assetRef.slice(0, i);
  const color = assetRef.slice(i + 1);
  if (!text || !/^#[0-9a-fA-F]{3,8}$/.test(color)) return null;
  return { text, color };
}

export function bodyColor(equipped: EquippedCosmetics, fallback: string): string {
  const ref = resolveCosmetic(equipped.body)?.assetRef;
  return ref ? ref : fallback;
}
