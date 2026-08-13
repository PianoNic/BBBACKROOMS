/** State-based soundtrack director.
 *
 *  Four states, two track variants each. Transitions are smooth
 *  equal-power crossfades: the old track fades out while the new one
 *  fades in over the same window, so there is never a hard cut or a
 *  silent gap. Variants rotate per state entry so back-to-back rounds
 *  don't repeat the same piece. Everything routes through the music
 *  gain from `audio.ts`, so the settings "Music" slider applies. */
import { getMusicDestination, unlockAudio } from "./audio";

export type MusicState = "title" | "tasks" | "chase" | "escape";

const TRACKS: Record<MusicState, string[]> = {
  title: ["/sounds/music/bbbackrooms-1.mp3", "/sounds/music/bbbackrooms-2.mp3"],
  tasks: [
    "/sounds/music/liminal-lernatelier-1.mp3",
    "/sounds/music/liminal-lernatelier-2.mp3",
  ],
  chase: ["/sounds/music/korridorjagd-1.mp3", "/sounds/music/korridorjagd-2.mp3"],
  escape: ["/sounds/music/extraktion-1.mp3", "/sounds/music/extraktion-2.mp3"],
};

/** Per-state loudness relative to the music slider. */
const LEVEL: Record<MusicState, number> = {
  title: 0.8, tasks: 0.55, chase: 0.95, escape: 0.85,
};

const FADE_S = 2.5;
// Chase enters when a teacher is this close (m) and only exits again once
// they're CHASE_EXIT away for CHASE_COOLDOWN_S — hysteresis so the music
// doesn't flap at the threshold.
const CHASE_ENTER = 12;
const CHASE_EXIT = 19;
const CHASE_COOLDOWN_S = 4;

type Playing = {
  el: HTMLAudioElement;
  node: MediaElementAudioSourceNode;
  gain: GainNode;
};

class MusicDirector {
  private state: MusicState | null = null;
  private basePhase: "tasks" | "escape" = "tasks";
  private playing: Playing | null = null;
  private readonly variantIdx: Record<MusicState, number> = {
    title: 0, tasks: 0, chase: 0, escape: 0,
  };
  private chaseQuietSince = 0;

  /** Switch state with an equal-power crossfade. No-op if unchanged. */
  setState(state: MusicState): void {
    if (state === this.state) return;
    unlockAudio();
    const dest = getMusicDestination();
    if (!dest) return;
    const ctx = dest.context as AudioContext;
    this.state = state;

    // Fade the old track out across the same window the new one fades in.
    const old = this.playing;
    if (old) {
      const t = ctx.currentTime;
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + FADE_S);
      window.setTimeout(() => {
        old.el.pause();
        old.el.src = "";
        try { old.node.disconnect(); old.gain.disconnect(); } catch { /* */ }
      }, FADE_S * 1000 + 100);
    }

    // Rotate variants per entry so repeated states alternate pieces.
    const variants = TRACKS[state];
    const idx = this.variantIdx[state] % variants.length;
    this.variantIdx[state] += 1;

    const el = new Audio(variants[idx]);
    el.loop = true;
    el.crossOrigin = "anonymous";
    const node = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(LEVEL[state], t + FADE_S);
    node.connect(gain);
    gain.connect(dest);
    void el.play().catch(() => {
      // Autoplay blocked (no user gesture yet) — retry on the next one.
      const retry = (): void => {
        unlockAudio();
        if (this.playing?.el === el) void el.play().catch(() => { /* */ });
      };
      window.addEventListener("pointerdown", retry, { once: true });
    });
    this.playing = { el, node, gain };
  }

  /** Fade everything out (endgame screens have their own stingers). */
  stop(): void {
    const old = this.playing;
    this.playing = null;
    this.state = null;
    if (!old) return;
    const ctx = old.gain.context as AudioContext;
    const t = ctx.currentTime;
    old.gain.gain.cancelScheduledValues(t);
    old.gain.gain.setValueAtTime(old.gain.gain.value, t);
    old.gain.gain.linearRampToValueAtTime(0, t + FADE_S);
    window.setTimeout(() => {
      old.el.pause();
      old.el.src = "";
      try { old.node.disconnect(); old.gain.disconnect(); } catch { /* */ }
    }, FADE_S * 1000 + 100);
  }

  /** The round's base phase. Chase (if active) keeps playing until the
   *  threat actually passes; otherwise the music follows the phase. */
  setPhase(phase: "tasks" | "escape"): void {
    this.basePhase = phase;
    if (this.state !== "chase") this.setState(phase);
  }

  /** Feed the nearest-teacher distance every frame (same source as the
   *  heartbeat). Drives chase enter/exit with hysteresis. */
  updateThreat(dist: number, nowS: number): void {
    if (this.state === "title" || this.state === null) return;
    if (this.state !== "chase") {
      if (this.basePhase === "tasks" && dist < CHASE_ENTER) {
        this.setState("chase");
        this.chaseQuietSince = 0;
      }
      return;
    }
    if (dist < CHASE_EXIT) {
      this.chaseQuietSince = 0;
      return;
    }
    if (this.chaseQuietSince === 0) {
      this.chaseQuietSince = nowS;
    } else if (nowS - this.chaseQuietSince >= CHASE_COOLDOWN_S) {
      this.setState(this.basePhase);
    }
  }
}

export const music = new MusicDirector();
