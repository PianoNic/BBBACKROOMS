/** Proximity heartbeat: a low thump that quickens as a teacher closes in.
 *
 *  Client-only — no server cooperation needed since teacher positions
 *  already arrive every tick. Call `setNearestDistance` from the game loop
 *  with the distance to the closest non-stunned teacher. Pass `Infinity`
 *  (or anything >= MAX_DIST) to silence it. */
import { getSfxDestination } from "./audio";

const MAX_DIST = 18;          // m — beyond this: silent
const MIN_DIST = 1.5;         // m — at or below: max intensity
const SLOW_INTERVAL = 1.4;    // s between thumps when far
const FAST_INTERVAL = 0.32;   // s between thumps when adjacent
const QUIET_VOL = 0.18;
const LOUD_VOL = 0.7;
const THUMP_FREQ = 55;        // Hz — low sub-bass sine
const THUMP_DECAY = 0.18;     // s

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class Heartbeat {
  private dist = Infinity;
  private timer: number | null = null;
  private running = false;

  /** Update the nearest-teacher distance. Pass Infinity to silence. */
  setNearestDistance(d: number): void {
    this.dist = d;
    if (d < MAX_DIST && !this.running) {
      this.running = true;
      this.schedule(0);
    }
  }

  /** Stop scheduling further thumps. The in-flight beat (if any) still plays out. */
  stop(): void {
    this.running = false;
    this.dist = Infinity;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedule(delayMs: number): void {
    this.timer = window.setTimeout(() => this.beat(), delayMs);
  }

  private beat(): void {
    this.timer = null;
    if (!this.running || this.dist >= MAX_DIST) {
      this.running = false;
      return;
    }
    const t = clamp01((MAX_DIST - this.dist) / (MAX_DIST - MIN_DIST));
    const interval = lerp(SLOW_INTERVAL, FAST_INTERVAL, t);
    const volume = lerp(QUIET_VOL, LOUD_VOL, t);
    // Master sfx volume is already applied at the audio-graph sfx gain node.
    playThump(volume);
    this.schedule(interval * 1000);
  }
}

function playThump(volume: number): void {
  const dest = getSfxDestination();
  if (!dest || volume <= 0) return;
  const ctx = dest.context;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = THUMP_FREQ;
  const g = ctx.createGain();
  // Quick attack, exponential decay — sounds like a body thump, not a beep.
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(volume, now + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, now + THUMP_DECAY);
  osc.connect(g);
  g.connect(dest);
  osc.start(now);
  osc.stop(now + THUMP_DECAY + 0.02);
}
