import { showSettingsOverlay } from "./settingsPanel";
import { el } from "./dom";

export type CamControl = {
  isOn: () => boolean;
  toggle: () => Promise<void>;
};

export type MicControl = {
  isOn: () => boolean;
  toggle: () => Promise<void>;
};

/** PAUSE menu with RESUME / MIC / CAM / OPTIONS / LEAVE. */
export function showPauseMenu(opts: {
  onResume: () => void;
  onLeave: () => void;
  cam?: CamControl;
  mic?: MicControl;
}): void {
  const overlay = el<HTMLDivElement>("div");
  overlay.id = "pause-overlay";

  const panel = el<HTMLDivElement>("div", "panel panel-brackets");
  panel.appendChild(el("h2", undefined, "PAUSED"));

  const menu = el<HTMLDivElement>("div", "menu");
  const resumeBtn = el<HTMLButtonElement>("button", "menu-btn primary", "RESUME");
  const camBtn = opts.cam
    ? el<HTMLButtonElement>("button", "menu-btn", opts.cam.isOn() ? "CAM OFF" : "CAM ON")
    : null;
  const micBtn = opts.mic
    ? el<HTMLButtonElement>("button", "menu-btn", opts.mic.isOn() ? "MIC OFF" : "MIC ON")
    : null;
  const optionsBtn = el<HTMLButtonElement>("button", "menu-btn", "OPTIONS");
  const leaveBtn = el<HTMLButtonElement>("button", "menu-btn", "LEAVE");
  menu.append(resumeBtn);
  if (micBtn) menu.append(micBtn);
  if (camBtn) menu.append(camBtn);
  menu.append(optionsBtn, leaveBtn);
  panel.appendChild(menu);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    window.removeEventListener("keydown", onKey);
  };

  resumeBtn.onclick = () => { close(); opts.onResume(); };
  if (camBtn && opts.cam) {
    camBtn.onclick = async () => {
      camBtn.disabled = true;
      await opts.cam!.toggle();
      camBtn.textContent = opts.cam!.isOn() ? "CAM OFF" : "CAM ON";
      camBtn.disabled = false;
    };
  }
  if (micBtn && opts.mic) {
    micBtn.onclick = async () => {
      micBtn.disabled = true;
      await opts.mic!.toggle();
      micBtn.textContent = opts.mic!.isOn() ? "MIC OFF" : "MIC ON";
      micBtn.disabled = false;
    };
  }
  optionsBtn.onclick = () => {
    close();
    showSettingsOverlay(() => { showPauseMenu(opts); });
  };
  leaveBtn.onclick = () => { close(); opts.onLeave(); };

  const onKey = (e: KeyboardEvent) => {
    if (e.code === "Escape") { e.preventDefault(); close(); opts.onResume(); }
  };
  window.addEventListener("keydown", onKey);
}
