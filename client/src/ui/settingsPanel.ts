import { getSettings, resetSettings, updateSetting } from "../core/settings";
import type { Settings } from "../core/settings";
import { el } from "./dom";
import {
  cameraDeviceRow, camPreviewRow, micDeviceRow, micMeterRow,
} from "./settingsDevices";

function rangeRow<K extends keyof Settings>(
  label: string,
  key: K,
  min: number,
  max: number,
  step: number,
  formatter: (v: number) => string,
): HTMLElement {
  const row = el<HTMLDivElement>("div", "set-row");
  row.appendChild(el("label", undefined, label));
  const ctrl = el<HTMLDivElement>("div", "set-ctrl");
  const input = el<HTMLInputElement>("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(getSettings()[key]);
  const value = el<HTMLSpanElement>("span", "set-value", formatter(getSettings()[key] as number));
  input.oninput = () => {
    const v = parseFloat(input.value);
    updateSetting(key, v as Settings[K]);
    value.textContent = formatter(v);
  };
  ctrl.append(input, value);
  row.appendChild(ctrl);
  return row;
}

function selectRow<K extends keyof Settings>(
  label: string,
  key: K,
  options: { label: string; value: Settings[K] }[],
): HTMLElement {
  const row = el<HTMLDivElement>("div", "set-row");
  row.appendChild(el("label", undefined, label));
  const ctrl = el<HTMLDivElement>("div", "set-ctrl");
  const current = getSettings()[key];
  for (const opt of options) {
    const btn = el<HTMLButtonElement>("button", "seg-btn", opt.label);
    if (opt.value === current) btn.classList.add("active");
    btn.onclick = () => {
      updateSetting(key, opt.value);
      for (const c of ctrl.children) c.classList.remove("active");
      btn.classList.add("active");
    };
    ctrl.appendChild(btn);
  }
  row.appendChild(ctrl);
  return row;
}

function toggleRow<K extends keyof Settings>(
  label: string, key: K, note?: string,
): HTMLElement {
  const row = el<HTMLDivElement>("div", "set-row");
  const lab = el<HTMLLabelElement>("label", undefined, label);
  if (note) {
    const sub = el<HTMLSpanElement>("span", "set-note", ` (${note})`);
    lab.appendChild(sub);
  }
  row.appendChild(lab);
  const ctrl = el<HTMLDivElement>("div", "set-ctrl");
  const current = getSettings()[key] as boolean;
  const onBtn = el<HTMLButtonElement>("button", "seg-btn", "ON");
  const offBtn = el<HTMLButtonElement>("button", "seg-btn", "OFF");
  if (current) onBtn.classList.add("active"); else offBtn.classList.add("active");
  onBtn.onclick = () => { updateSetting(key, true as Settings[K]); onBtn.classList.add("active"); offBtn.classList.remove("active"); };
  offBtn.onclick = () => { updateSetting(key, false as Settings[K]); offBtn.classList.add("active"); onBtn.classList.remove("active"); };
  ctrl.append(onBtn, offBtn);
  row.appendChild(ctrl);
  return row;
}

export type SettingsList = { element: HTMLElement; dispose: () => void };

/** Build the settings list. Caller must invoke `dispose()` on teardown so
 *  the mic meter's AudioContext + preview stream don't leak. */
export function buildSettingsList(): SettingsList {
  const root = el<HTMLDivElement>("div", "settings-list");
  const disposables: Array<() => void> = [];

  root.appendChild(el("div", "set-section", "DISPLAY"));
  root.appendChild(rangeRow("Field of view", "fov", 60, 110, 1, (v) => `${v}°`));
  root.appendChild(rangeRow("Pixelation", "pixelation", 1, 8, 1, (v) => `${v}x`));
  root.appendChild(selectRow("FPS cap", "fpsCap", [
    { label: "30",   value: 30 },
    { label: "60",   value: 60 },
    { label: "120",  value: 120 },
    { label: "144",  value: 144 },
    { label: "OFF",  value: 0 },
  ]));
  root.appendChild(toggleRow("VSync", "vsync", "browser default"));
  root.appendChild(toggleRow("Show FPS", "showFps"));

  root.appendChild(el("div", "set-section", "INPUT"));
  root.appendChild(rangeRow("Mouse sensitivity", "mouseSensitivity", 0.2, 3.0, 0.05, (v) => `${v.toFixed(2)}x`));
  root.appendChild(rangeRow("Arrow-key turn speed", "arrowTurnRate", 0.5, 6.0, 0.1,
    (v) => `${Math.round(v * (180 / Math.PI))}°/s`));

  root.appendChild(el("div", "set-section", "AUDIO"));
  root.appendChild(rangeRow("Music", "musicVolume", 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`));
  root.appendChild(rangeRow("Sound", "sfxVolume", 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`));
  root.appendChild(rangeRow("Jumpscare", "jumpscareVolume", 0, 1, 0.01,
    (v) => v === 0 ? "MUTED" : `${Math.round(v * 100)}%`));

  root.appendChild(el("div", "set-section", "VOICE"));
  root.appendChild(selectRow("Voice activation", "voiceMode", [
    { label: "Off",              value: "off" },
    { label: "Push-to-talk (V)", value: "ptt" },
    { label: "Always on",        value: "open" },
  ]));
  root.appendChild(toggleRow("Noise gate", "noiseGate", "silences quiet background"));
  root.appendChild(rangeRow("Gate threshold", "noiseGateThresholdDb", -70, -20, 1,
    (v) => `${v} dB`));
  root.appendChild(rangeRow("PS1 voice filter", "ps1VoiceAmount", 0, 1, 0.01,
    (v) => v === 0 ? "OFF" : `${Math.round(v * 100)}%`));

  root.appendChild(el("div", "set-section", "DEVICES"));
  root.appendChild(selectRow("Camera", "cameraMode", [
    { label: "Off", value: "off" },
    { label: "On",  value: "on" },
  ]));
  root.appendChild(cameraDeviceRow());
  const camRow = camPreviewRow();
  root.appendChild(camRow.row);
  disposables.push(camRow.dispose);
  root.appendChild(micDeviceRow());
  const meterRow = micMeterRow();
  root.appendChild(meterRow.row);
  disposables.push(meterRow.dispose);

  const reset = el<HTMLButtonElement>("button", "menu-btn reset", "RESET TO DEFAULTS");
  reset.onclick = () => {
    resetSettings();
    const fresh = buildSettingsList();
    root.replaceChildren(...fresh.element.children);
    disposables.push(fresh.dispose);
  };
  root.appendChild(reset);

  return { element: root, dispose: () => disposables.forEach((d) => d()) };
}

/** Floating in-game settings overlay. Returns a closer fn. */
export function showSettingsOverlay(onClose: () => void): () => void {
  const overlay = el<HTMLDivElement>("div");
  overlay.id = "settings-overlay";
  const panel = el<HTMLDivElement>("div", "panel panel-brackets");
  panel.appendChild(el("h2", undefined, "OPTIONS"));
  const list = buildSettingsList();
  panel.appendChild(list.element);
  const back = el<HTMLButtonElement>("button", "menu-btn back", "← RESUME");
  back.onclick = () => close();
  panel.appendChild(back);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const close = () => {
    list.dispose();
    overlay.remove();
    window.removeEventListener("keydown", onKey);
    onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.code === "Escape") { e.preventDefault(); close(); }
  };
  window.addEventListener("keydown", onKey);
  return close;
}
