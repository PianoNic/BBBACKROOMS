let el: HTMLDivElement | null = null;
let timer: number | null = null;

export function showBanner(text: string, durationMs = 4000): void {
  if (!el) {
    el = document.createElement("div");
    el.id = "banner";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.remove("hidden");
  if (timer !== null) window.clearTimeout(timer);
  if (durationMs > 0) {
    timer = window.setTimeout(() => el?.classList.add("hidden"), durationMs);
  }
}

export function hideBanner(): void {
  el?.classList.add("hidden");
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
}
