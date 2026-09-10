import { getAudioContext, getSfxDestination } from "./audio";
import { PositionalSound, type SpatialListener } from "./spatialAudio";
import { AMBIENCE } from "../rendering/ambience";

const FAR_SOUND_URLS = [
  "/sounds/actions/door-open.ogg",
  "/sounds/actions/door-close.ogg",
  "/sounds/actions/locker-open.ogg",
  "/sounds/actions/lever.ogg",
  "/sounds/actions/fusebox-door.ogg",
  "/sounds/actions/chair-impact.ogg",
  "/sounds/actions/throw.ogg",
  "/sounds/footsteps/step-1.ogg",
  "/sounds/footsteps/step-2.ogg",
  "/sounds/footsteps/step-3.ogg",
  "/sounds/footsteps/step-4.ogg",
  "/sounds/footsteps/step-5.ogg",
];

const EAR_HEIGHT = 1.6;
const HUM_RAMP_S = 0.5;
const FLICKER_ATTACK_S = 0.02;
const FLICKER_HOLD_S = 0.12;
const FLICKER_RELEASE_S = 0.08;
const AUTO_FLICKER_THRESHOLD = 0.86;
const AUTO_FLICKER_COOLDOWN_S = 1.5;
const DRONE_RAMP_S = 0.8;
const DRONE_EPSILON = 0.002;
const CATCH_ANTICIPATION_RAMP_S = 0.08;
const FAR_MIN_GAIN = 0.16;
const FAR_MAX_GAIN = 0.26;
const FAR_MIN_RATE = 0.75;
const FAR_MAX_RATE = 0.9;

const farBufferCache = new Map<string, AudioBuffer>();
const farBufferLoading = new Set<string>();

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

async function loadFarBuffer(url: string, ctx: AudioContext): Promise<AudioBuffer | null> {
  const cached = farBufferCache.get(url);
  if (cached) return cached;
  if (farBufferLoading.has(url)) return null;
  farBufferLoading.add(url);
  try {
    const res = await fetch(url);
    const data = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(data);
    farBufferCache.set(url, buf);
    return buf;
  } catch {
    return null;
  } finally {
    farBufferLoading.delete(url);
  }
}

export class HorrorAudio {
  private readonly listener: SpatialListener;

  private humStarted = false;
  private humOsc1: OscillatorNode | null = null;
  private humOsc2: OscillatorNode | null = null;
  private humFilter: BiquadFilterNode | null = null;
  private humGain: GainNode | null = null;
  private humTarget = 0;
  private lastAutoFlickerN = 0;
  private lastAutoFlickerAt = -Infinity;

  private droneStarted = false;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private droneTarget = -1;

  private farInited = false;
  private farNextAt = 0;
  private farSound: PositionalSound | null = null;

  private catchAnticipationArmed = false;

  constructor(listener: SpatialListener) {
    this.listener = listener;
  }

  armCatchAnticipation(): void {
    this.catchAnticipationArmed = true;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (this.humGain) {
      this.humTarget = 0;
      this.humGain.gain.setTargetAtTime(0, now, CATCH_ANTICIPATION_RAMP_S);
    }
    if (this.droneGain) {
      this.droneTarget = 0;
      this.droneGain.gain.setTargetAtTime(0, now, CATCH_ANTICIPATION_RAMP_S);
    }
  }

  releaseCatchAnticipation(): void {
    this.catchAnticipationArmed = false;
  }

  update(elapsed: number, threatDistance: number, px: number, pz: number): void {
    const ctx = getAudioContext();
    if (!ctx) return;
    const isSpectating = !Number.isFinite(threatDistance);

    this.ensureHum(ctx);
    this.ensureDrone(ctx);
    this.updateHumTarget(ctx, isSpectating, elapsed, px, pz);
    this.updateDrone(ctx, isSpectating ? Infinity : threatDistance);
    this.updateFar(ctx, elapsed, px, pz, isSpectating);
  }

  pulseFlicker(strength: number): void {
    const ctx = getAudioContext();
    if (!ctx || !this.humGain || !this.humOsc1 || !this.humOsc2) return;
    const s = clamp01(strength);
    const now = ctx.currentTime;
    const peak = AMBIENCE.audio.humGain
      + (AMBIENCE.audio.humFlickerGain - AMBIENCE.audio.humGain) * s;
    this.humGain.gain.setTargetAtTime(peak, now, FLICKER_ATTACK_S);
    this.humGain.gain.setTargetAtTime(this.humTarget, now + FLICKER_HOLD_S, FLICKER_RELEASE_S);
    const detune = 8 * s;
    this.humOsc1.detune.setTargetAtTime(detune, now, FLICKER_ATTACK_S);
    this.humOsc2.detune.setTargetAtTime(-detune, now, FLICKER_ATTACK_S);
    this.humOsc1.detune.setTargetAtTime(0, now + FLICKER_HOLD_S, FLICKER_RELEASE_S);
    this.humOsc2.detune.setTargetAtTime(0, now + FLICKER_HOLD_S, FLICKER_RELEASE_S);
  }

  dispose(): void {
    try { this.humOsc1?.stop(); } catch {}
    try { this.humOsc2?.stop(); } catch {}
    try { this.humOsc1?.disconnect(); } catch {}
    try { this.humOsc2?.disconnect(); } catch {}
    try { this.humFilter?.disconnect(); } catch {}
    try { this.humGain?.disconnect(); } catch {}
    try { this.droneOsc?.stop(); } catch {}
    try { this.droneOsc?.disconnect(); } catch {}
    try { this.droneGain?.disconnect(); } catch {}
    this.farSound?.dispose();
    this.farSound = null;
  }

  private ensureHum(ctx: AudioContext): void {
    if (this.humStarted) return;
    const dest = getSfxDestination();
    if (!dest) return;
    this.humStarted = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 650;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.value = AMBIENCE.audio.humHz;
    const osc2 = ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.value = AMBIENCE.audio.humHz + AMBIENCE.audio.humDetuneHz;
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc1.start();
    osc2.start();
    this.humOsc1 = osc1;
    this.humOsc2 = osc2;
    this.humFilter = filter;
    this.humGain = gain;
  }

  private updateHumTarget(ctx: AudioContext, isSpectating: boolean, elapsed: number, px: number, pz: number): void {
    if (!this.humGain) return;
    if (this.catchAnticipationArmed) return;
    const target = isSpectating ? 0 : AMBIENCE.audio.humGain;
    if (Math.abs(target - this.humTarget) > 0.0005) {
      this.humTarget = target;
      this.humGain.gain.setTargetAtTime(target, ctx.currentTime, HUM_RAMP_S);
    }
    if (isSpectating) return;
    this.updateAutoFlicker(elapsed, px, pz);
  }

  private updateAutoFlicker(elapsed: number, px: number, pz: number): void {
    const phase = elapsed * 0.6 + Math.sin(px * 0.05) * 3 + Math.cos(pz * 0.05) * 3;
    const n = (
      Math.sin(phase * 2.7)
      + Math.sin(phase * 5.3 + 1.7)
      + Math.sin(phase * 11.1 + 4.1)
    ) / 3;
    const rising = n > AUTO_FLICKER_THRESHOLD && this.lastAutoFlickerN <= AUTO_FLICKER_THRESHOLD;
    this.lastAutoFlickerN = n;
    if (!rising || elapsed - this.lastAutoFlickerAt < AUTO_FLICKER_COOLDOWN_S) return;
    this.lastAutoFlickerAt = elapsed;
    this.pulseFlicker(clamp01((n - AUTO_FLICKER_THRESHOLD) / (1 - AUTO_FLICKER_THRESHOLD)));
  }

  private ensureDrone(ctx: AudioContext): void {
    if (this.droneStarted) return;
    const dest = getSfxDestination();
    if (!dest) return;
    this.droneStarted = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = AMBIENCE.audio.droneHz;
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    this.droneOsc = osc;
    this.droneGain = gain;
  }

  private updateDrone(ctx: AudioContext, threatDistance: number): void {
    if (!this.droneGain) return;
    if (this.catchAnticipationArmed) return;
    const { droneStartDistance, droneGain } = AMBIENCE.audio;
    const t = threatDistance < droneStartDistance
      ? clamp01(1 - threatDistance / droneStartDistance)
      : 0;
    const target = droneGain * t;
    if (Math.abs(target - this.droneTarget) > DRONE_EPSILON) {
      this.droneTarget = target;
      this.droneGain.gain.setTargetAtTime(target, ctx.currentTime, DRONE_RAMP_S);
    }
  }

  private updateFar(ctx: AudioContext, elapsed: number, px: number, pz: number, isSpectating: boolean): void {
    if (isSpectating) {
      if (this.farSound) {
        this.farSound.dispose();
        this.farSound = null;
      }
      this.farInited = false;
      return;
    }
    if (!this.farInited) {
      this.farInited = true;
      this.scheduleNextFar(elapsed);
      return;
    }
    if (elapsed < this.farNextAt) return;
    this.scheduleNextFar(elapsed);
    this.playFarSound(ctx, px, pz);
  }

  private scheduleNextFar(elapsed: number): void {
    const { farMinS, farMaxS } = AMBIENCE.audio;
    this.farNextAt = elapsed + farMinS + Math.random() * (farMaxS - farMinS);
  }

  private playFarSound(ctx: AudioContext, px: number, pz: number): void {
    const url = FAR_SOUND_URLS[Math.floor(Math.random() * FAR_SOUND_URLS.length)];
    loadFarBuffer(url, ctx).then((buf) => {
      if (!buf) return;
      const { farMinDistance, farMaxDistance } = AMBIENCE.audio;
      const dist = farMinDistance + Math.random() * (farMaxDistance - farMinDistance);
      const bearing = Math.random() * Math.PI * 2;
      const x = px + Math.sin(bearing) * dist;
      const z = pz + Math.cos(bearing) * dist;
      const sound = new PositionalSound(this.listener);
      sound.setBuffer(buf);
      sound.setRefDistance(4);
      sound.setMaxDistance(60);
      sound.setRolloffFactor(1.4);
      sound.setDistanceModel("inverse");
      sound.setVolume(FAR_MIN_GAIN + Math.random() * (FAR_MAX_GAIN - FAR_MIN_GAIN));
      sound.setPlaybackRate(FAR_MIN_RATE + Math.random() * (FAR_MAX_RATE - FAR_MIN_RATE));
      sound.setPosition(x, EAR_HEIGHT, z);
      sound.play();
      if (this.farSound) this.farSound.dispose();
      this.farSound = sound;
      window.setTimeout(() => {
        sound.dispose();
        if (this.farSound === sound) this.farSound = null;
      }, (buf.duration + 0.5) * 1000);
    });
  }
}
