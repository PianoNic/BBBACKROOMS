import { settingsOverlayOpen } from "./menu/routes";

let closeCallback: (() => void) | null = null;

export function showSettingsOverlay(onClose: () => void): () => void {
  closeCallback = onClose;
  settingsOverlayOpen.value = true;
  return () => closeSettingsOverlay();
}

export function closeSettingsOverlay(): void {
  if (!settingsOverlayOpen.value) return;
  settingsOverlayOpen.value = false;
  const cb = closeCallback;
  closeCallback = null;
  cb?.();
}
