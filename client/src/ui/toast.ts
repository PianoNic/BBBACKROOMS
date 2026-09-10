import { toastState } from "./hud/state";

export type ToastAction = { label: string; key?: string; run: () => void };

let timer: number | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;

function clearKeyHandler(): void {
  if (!keyHandler) return;
  window.removeEventListener("keydown", keyHandler, true);
  keyHandler = null;
}

export function showToast(text: string, action?: ToastAction, durationMs = 8000): void {
  clearKeyHandler();
  toastState.value = { text, action: action ?? null, visible: true };

  if (action?.key) {
    const code = action.key;
    const fire = () => {
      action.run();
      hideToast();
    };
    keyHandler = (e: KeyboardEvent) => {
      if (e.code !== code) return;
      e.preventDefault();
      e.stopPropagation();
      fire();
    };
    window.addEventListener("keydown", keyHandler, true);
  }

  if (timer !== null) window.clearTimeout(timer);
  if (durationMs > 0) {
    timer = window.setTimeout(hideToast, durationMs);
  }
}

export function hideToast(): void {
  const current = toastState.value;
  if (current.visible) toastState.value = { ...current, visible: false };
  clearKeyHandler();
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
}
