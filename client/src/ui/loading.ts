let el: HTMLDivElement | null = null;
let msgEl: HTMLDivElement | null = null;

export function showLoading(text: string): void {
  if (el) {
    setLoading(text);
    return;
  }
  el = document.createElement("div");
  el.id = "loading";
  msgEl = document.createElement("div");
  msgEl.className = "msg";
  msgEl.textContent = text;
  const spinner = document.createElement("div");
  spinner.className = "spinner";
  el.append(spinner, msgEl);
  document.body.appendChild(el);
}

export function setLoading(text: string): void {
  if (msgEl) msgEl.textContent = text;
}

export function hideLoading(): void {
  el?.remove();
  el = null;
  msgEl = null;
}

/** Yields to the browser so the loading screen actually repaints. */
export function yieldToPaint(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}
