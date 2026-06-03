/** Persistent player settings. Single store, subscribers apply on change. */

export type Settings = {
  fov: number;          // 60..110
  pixelation: number;   // 1..8 (RenderPixelatedPass pixelSize)
  fpsCap: number;       // 0 = uncapped, else 30/60/120/144
  vsync: boolean;       // informational — browser handles vsync
  musicVolume: number;  // 0..1
  sfxVolume: number;    // 0..1
  jumpscareVolume: number;  // 0..1, separate so players can tame the scream
  showFps: boolean;
  mouseSensitivity: number;  // 0.2..3.0 multiplier on base look speed
  arrowTurnRate: number;     // 0.5..6.0 rad/s — arrow-key camera turn speed
  /** PS1-style lo-fi voice filter intensity. 0 = clean, 1 = full bit-crush. */
  ps1VoiceAmount: number;    // 0..1
  /** "" means "use browser default device". */
  cameraDeviceId: string;
  micDeviceId: string;
  /** Noise gate on the outgoing mic. Drops audio below the threshold. */
  noiseGate: boolean;
  /** Noise gate cutoff in dBFS. Anything quieter than this is silenced. */
  noiseGateThresholdDb: number;
  /** "off": mic fully disabled. "ptt": only while V is held. "open": always live. */
  voiceMode: "off" | "ptt" | "open";
  /** "off" blocks the camera from being enabled at all (pause-menu CAM
   *  button becomes a no-op + any active webcam track is stopped). */
  cameraMode: "off" | "on";
};

const KEY = "bbb_settings";

export const DEFAULTS: Settings = {
  fov: 75,
  pixelation: 4,
  fpsCap: 0,
  vsync: true,
  musicVolume: 0.4,
  sfxVolume: 0.8,
  jumpscareVolume: 0.6,
  showFps: true,
  mouseSensitivity: 1.0,
  arrowTurnRate: 2.5,
  ps1VoiceAmount: 0.6,
  cameraDeviceId: "",
  micDeviceId: "",
  noiseGate: false,
  noiseGateThresholdDb: -45,
  voiceMode: "ptt",
  cameraMode: "on",
};

let current: Settings = load();
const listeners = new Set<(s: Settings) => void>();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
}

export function getSettings(): Settings {
  return current;
}

export function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  current = { ...current, [key]: value };
  persist();
  for (const l of listeners) l(current);
}

export function onSettingsChange(fn: (s: Settings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetSettings(): void {
  current = { ...DEFAULTS };
  persist();
  for (const l of listeners) l(current);
}
