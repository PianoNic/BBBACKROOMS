/** Procedural slot-machine tick: a short broadband noise burst (NOT a
 *  pitched sweep) so each reel chatters convincingly. Each wheel uses a
 *  different bandpass centre + Q to avoid sounding like one pulse train. */
import { getSfxDestination } from "../core/audio";

let cachedClickBuffer: AudioBuffer | null = null;

function getClickBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (cachedClickBuffer && cachedClickBuffer.sampleRate === ctx.sampleRate) {
    return cachedClickBuffer;
  }
  const samples = Math.floor(ctx.sampleRate * 0.015);
  const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
  cachedClickBuffer = buf;
  return buf;
}

/** Per-wheel tick voices — bandpass centres are intentionally spread so
 *  three reels sound chorused rather than monotone. Cycles past 4. */
export const TICK_VOICES = [
  { freq: 2600, q: 1.5 },
  { freq: 3100, q: 1.7 },
  { freq: 3700, q: 1.8 },
  { freq: 2200, q: 1.4 },
];

export function playTick(volume: number, freq: number, q: number): void {
  const dest = getSfxDestination();
  if (!dest) return;
  const ctx = dest.context;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = getClickBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(volume, now + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(now);
  src.stop(now + 0.02);
}
