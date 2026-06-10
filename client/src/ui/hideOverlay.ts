/** Fullscreen vent-slat overlay while hiding in a closet. */
import { el } from "./dom";

let overlay: HTMLDivElement | null = null;

export function showHideOverlay(): void {
  if (overlay) return;
  overlay = el<HTMLDivElement>("div");
  overlay.id = "hide-overlay";
  overlay.appendChild(el("div", "hide-hint", "[E] Verlassen"));
  document.body.appendChild(overlay);
}

export function hideHideOverlay(): void {
  overlay?.remove();
  overlay = null;
}
