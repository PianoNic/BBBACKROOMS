/** Proximity heartbeat: a low thump that quickens as a teacher closes in.
 *
 *  Client-only — no server cooperation needed since teacher positions
 *  already arrive every tick. Call `setNearestDistance` from the game loop
 *  with the distance to the closest non-stunned teacher. Pass `Infinity`
 *  (or anything >= MAX_DIST) to silence it. */
import { getSfxDestination } from "./audio";

const MAX_DIST = 25;          // m — beat kicks in early, well before
                              // the teacher is right on top of you
const MIN_DIST = 3.0;         // m — at or below: max intensity
const SLOW_INTERVAL = 1.3;    // s between thumps when far
const FAST_INTERVAL = 0.30;   // s between thumps when adjacent — racing
const QUIET_VOL = 0.2;        // barely audible — distant pulse
const LOUD_VOL = 50.0;        // pounding at close range
const THUMP_FREQ = 45;        // Hz — deep sub-bass sine
const THUMP_DECAY = 0.26;     // s

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
    const linearT = clamp01((MAX_DIST - this.dist) / (MAX_DIST - MIN_DIST));
    // Inverted quadratic — front-loaded ramp. Even mid-range distance
    // (say 10m of a 25m range) lands near 90% intensity, so the panic
    // builds aggressively the moment a teacher enters the range.
    const inv = 1 - linearT;
    const t = 1 - inv * inv;
    // Exponential interpolation for the pulse rate: each unit of t
    // multiplies the interval by the same factor, so the rate doubles
    // (and doubles again) as the teacher closes in — a real adrenaline
    // ramp rather than a linear slide.
    const interval = SLOW_INTERVAL * Math.pow(FAST_INTERVAL / SLOW_INTERVAL, t);
    const volume = lerp(QUIET_VOL, LOUD_VOL, t);
    playThump(volume);
    this.schedule(interval * 1000);
  }
}

// Cached compressor so the dB-scale dynamics stay consistent across beats
// and we don't reallocate audio nodes per thump.
let cachedCompressor: { node: DynamicsCompressorNode; dest: AudioNode } | null = null;
function getThumpBus(dest: AudioNode): DynamicsCompressorNode {
  if (cachedCompressor && cachedCompressor.dest === dest) {
    return cachedCompressor.node;
  }
  const ctx = (dest as AudioDestinationNode).context as AudioContext;
  const comp = ctx.createDynamicsCompressor();
  // Aggressive compression: anything above -22dB gets squashed at 8:1,
  // so volume values from 0.2..50 still sound progressively louder
  // (the curve flattens but never clips harshly).
  comp.threshold.value = -22;
  comp.knee.value = 24;
  comp.ratio.value = 8;
  comp.attack.value = 0.001;
  comp.release.value = 0.15;
  comp.connect(dest);
  cachedCompressor = { node: comp, dest };
  return comp;
}

function playThump(volume: number): void {
  const dest = getSfxDestination();
  if (!dest || volume <= 0) return;
  const ctx = dest.context;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = THUMP_FREQ;
  // Subtle pitch-drop on each beat — adds the organic "throb" feel.
  osc.frequency.exponentialRampToValueAtTime(
    THUMP_FREQ * 0.7, now + THUMP_DECAY,
  );
  const g = ctx.createGain();
  // Quick attack, exponential decay — body thump, not a beep.
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(volume, now + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now + THUMP_DECAY);
  osc.connect(g);
  g.connect(getThumpBus(dest));
  osc.start(now);
  osc.stop(now + THUMP_DECAY + 0.02);
}
