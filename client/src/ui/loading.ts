import { loadingText } from "./hud/state";

export function showLoading(text: string): void {
  loadingText.value = text;
}

export function setLoading(text: string): void {
  loadingText.value = text;
}

export function hideLoading(): void {
  loadingText.value = null;
}

/** Yields to the browser so the loading screen actually repaints. */
export function yieldToPaint(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}
