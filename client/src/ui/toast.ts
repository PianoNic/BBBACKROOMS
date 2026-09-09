export type ToastAction = { label: string; key?: string; run: () => void };

let el: HTMLDivElement | null = null;
let textEl: HTMLSpanElement | null = null;
let timer: number | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;

function clearKeyHandler(): void {
  if (!keyHandler) return;
  window.removeEventListener("keydown", keyHandler, true);
  keyHandler = null;
}

export function showToast(text: string, action?: ToastAction, durationMs = 8000): void {
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    textEl = document.createElement("span");
    el.appendChild(textEl);
    document.body.appendChild(el);
  }
  if (!textEl) return;
  textEl.textContent = text;

  el.querySelector(".toast-undo")?.remove();
  clearKeyHandler();

  if (action) {
    const fire = () => {
      action.run();
      hideToast();
    };
    const button = document.createElement("button");
    button.className = "toast-undo";
    button.textContent = action.label;
    button.addEventListener("click", fire);
    el.appendChild(button);
    if (action.key) {
      const code = action.key;
      keyHandler = (e: KeyboardEvent) => {
        if (e.code !== code) return;
        e.preventDefault();
        e.stopPropagation();
        fire();
      };
      window.addEventListener("keydown", keyHandler, true);
    }
  }

  el.classList.remove("hidden");
  if (timer !== null) window.clearTimeout(timer);
  if (durationMs > 0) {
    timer = window.setTimeout(hideToast, durationMs);
  }
}

export function hideToast(): void {
  el?.classList.add("hidden");
  clearKeyHandler();
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
}
