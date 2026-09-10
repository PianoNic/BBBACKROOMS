import { signal } from "@preact/signals";
import type { ScreenDirection } from "../screenTransition";

export type MenuRoute = "title" | "servers" | "options" | "shop" | "tutorial" | "lobby" | null;

export const route = signal<MenuRoute>(null);
export const direction = signal<ScreenDirection>("forward");

const ORDER: Exclude<MenuRoute, null>[] = ["title", "servers", "options", "shop", "tutorial", "lobby"];

export function navigate(next: MenuRoute, dir?: ScreenDirection): void {
  if (next === route.value) return;
  if (dir) {
    direction.value = dir;
  } else {
    const from = ORDER.indexOf(route.value as Exclude<MenuRoute, null>);
    const to = ORDER.indexOf(next as Exclude<MenuRoute, null>);
    direction.value = to >= from ? "forward" : "back";
  }
  route.value = next;
}

export const infoOpen = signal(false);
export const createLobbyOpen = signal(false);
export const adminModalOpen = signal(false);
export const packEditorOpen = signal(false);
export const shopOverlayOpen = signal(false);
export const deleteAccountOpen = signal(false);
export const settingsOverlayOpen = signal(false);
