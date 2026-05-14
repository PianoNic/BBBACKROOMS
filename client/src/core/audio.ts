/** Master music + sfx routing. Lazy-creates the AudioContext on first user gesture. */
import { getSettings, onSettingsChange } from "./settings";

let ctx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicOscillators: { stop(): void } | null = null;

const FOOTSTEP_URLS = [1, 2, 3, 4, 5].map((i) => `/sounds/footsteps/step-${i}.ogg`);
const footstepBuffers: AudioBuffer[] = [];
let footstepLoadStarted = false;

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctx();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.connect(ctx.destination);
    sfxGain.connect(ctx.destination);
    const s = getSettings();
    musicGain.gain.value = s.musicVolume;
    sfxGain.gain.value = s.sfxVolume;
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Call from any user-initiated event to start audio. Browsers block AudioContext until a gesture. */
export function unlockAudio(): void {
  const c = ensureCtx();
  if (c && c.state === "suspended") c.resume().catch(() => undefined);
}

/** Returns the sfx destination gain. Use this as the final output for one-shot sounds. */
export function getSfxDestination(): GainNode | null {
  ensureCtx();
  return sfxGain;
}

async function loadFootsteps(): Promise<void> {
  if (footstepLoadStarted) return;
  footstepLoadStarted = true;
  const c = ensureCtx();
  if (!c) return;
  for (const url of FOOTSTEP_URLS) {
    try {
      const res = await fetch(url);
      const data = await res.arrayBuffer();
      const buf = await c.decodeAudioData(data);
      footstepBuffers.push(buf);
    } catch {
      // skip — file missing or undecodable
    }
  }
}

const sfxBuffers = new Map<string, AudioBuffer>();
const sfxLoading = new Set<string>();

async function loadSfx(url: string): Promise<AudioBuffer | null> {
  if (sfxBuffers.has(url)) return sfxBuffers.get(url)!;
  if (sfxLoading.has(url)) return null;
  sfxLoading.add(url);
  const c = ensureCtx();
  if (!c) { sfxLoading.delete(url); return null; }
  try {
    const res = await fetch(url);
    const data = await res.arrayBuffer();
    const buf = await c.decodeAudioData(data);
    sfxBuffers.set(url, buf);
    return buf;
  } catch {
    return null;
  } finally {
    sfxLoading.delete(url);
  }
}

function spawnSfxSource(buf: AudioBuffer, volume: number, pitch: number): void {
  if (!ctx || !sfxGain) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = pitch;
  const g = ctx.createGain();
  g.gain.value = volume;
  src.connect(g);
  g.connect(sfxGain);
  src.start();
}

/** Play a one-shot SFX by URL. If not cached, loads then plays (delayed by load time). */
export function playSfx(url: string, volume = 1, pitch = 1): void {
  ensureCtx();
  if (!ctx || !sfxGain) return;
  const buf = sfxBuffers.get(url);
  if (buf) { spawnSfxSource(buf, volume, pitch); return; }
  loadSfx(url).then((b) => { if (b) spawnSfxSource(b, volume, pitch); });
}

/** Preload an sfx so it plays without a network round trip on first use. */
export function preloadSfx(url: string): void {
  loadSfx(url);
}

/** Play a random footstep sound. Loads on first call. */
export function playFootstep(volume = 1): void {
  const c = ensureCtx();
  if (!c || !sfxGain) return;
  if (footstepBuffers.length === 0) {
    loadFootsteps();
    return;
  }
  const buf = footstepBuffers[Math.floor(Math.random() * footstepBuffers.length)];
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 0.92 + Math.random() * 0.16; // slight pitch variation per step
  const g = c.createGain();
  g.gain.value = volume;
  src.connect(g);
  g.connect(sfxGain);
  src.start();
}

const AMBIENT_URL = "/sounds/ambient/drone.mp3";
let ambientBuffer: AudioBuffer | null = null;

async function loadAmbientBuffer(): Promise<AudioBuffer | null> {
  if (ambientBuffer) return ambientBuffer;
  const c = ensureCtx();
  if (!c) return null;
  try {
    const res = await fetch(AMBIENT_URL);
    const data = await res.arrayBuffer();
    ambientBuffer = await c.decodeAudioData(data);
  } catch {
    ambientBuffer = null;
  }
  return ambientBuffer;
}

/** Start the ambient music track from /sounds/ambient/drone.mp3 (loops). */
export function startAmbient(): void {
  if (musicOscillators) return;
  const c = ensureCtx();
  if (!c || !musicGain) return;
  // Block immediately so a slow load can't double-start.
  musicOscillators = { stop() {} };
  loadAmbientBuffer().then((buf) => {
    if (!buf || !ctx || !musicGain) {
      musicOscillators = null;
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const pad = ctx.createGain();
    pad.gain.value = 0.6;
    src.connect(pad);
    pad.connect(musicGain);
    src.start();
    musicOscillators = {
      stop() {
        try { src.stop(); } catch {}
        try { pad.disconnect(); } catch {}
      },
    };
  });
}

export function stopAmbient(): void {
  musicOscillators?.stop();
  musicOscillators = null;
}

onSettingsChange((s) => {
  if (musicGain) musicGain.gain.value = s.musicVolume;
  if (sfxGain) sfxGain.gain.value = s.sfxVolume;
});
