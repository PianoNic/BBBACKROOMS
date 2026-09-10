import { bannerText, bannerVisible } from "./hud/state";

let timer: number | null = null;

export function showBanner(text: string, durationMs = 4000): void {
  bannerText.value = text;
  bannerVisible.value = true;
  if (timer !== null) window.clearTimeout(timer);
  if (durationMs > 0) {
    timer = window.setTimeout(() => { bannerVisible.value = false; }, durationMs);
  }
}

export function hideBanner(): void {
  bannerVisible.value = false;
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
}
