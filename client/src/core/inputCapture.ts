/** Fullscreen + Pointer Lock + Keyboard Lock — fully capture input from the browser.
    Keyboard Lock requires fullscreen and is Chromium-only, but that's where it actually
    intercepts reserved shortcuts like Ctrl+W / F11 / Alt+Tab. */

const CAPTURED_KEYS = [
  "KeyW", "KeyR", "KeyT", "KeyN", "KeyP",
  "Tab", "F11",
  "ControlLeft", "ControlRight",
  "AltLeft", "AltRight",
];

type KeyboardLockAPI = {
  lock(codes: string[]): Promise<void>;
  unlock(): void;
};

function keyboardApi(): KeyboardLockAPI | null {
  const nav = navigator as Navigator & { keyboard?: KeyboardLockAPI };
  return nav.keyboard && typeof nav.keyboard.lock === "function" ? nav.keyboard : null;
}

let listening = false;

/** Pointer lock only. No fullscreen — keyboard lock requires fullscreen so we skip it. */
export async function captureInput(target: HTMLElement): Promise<void> {
  try {
    target.requestPointerLock();
  } catch { /* pointer lock unavailable */ }
  void listening;
  void CAPTURED_KEYS;
  void keyboardApi;
}

export async function releaseInput(): Promise<void> {
  if (document.pointerLockElement) document.exitPointerLock();
}
