/** Fullscreen vent-slat overlay while hiding in a closet. */
import { hideOverlayVisible } from "./hud/state";

export function showHideOverlay(): void {
  hideOverlayVisible.value = true;
}

export function hideHideOverlay(): void {
  hideOverlayVisible.value = false;
}
