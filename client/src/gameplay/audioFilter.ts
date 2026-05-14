/** PS1-style lo-fi voice filter graph.
 *
 *  Two effects, both modulated by an `amount` ∈ [0,1] driven from settings:
 *    1. Bit-crush via WaveShaper with a quantisation curve.
 *       amount=0 → smooth curve (≈ identity), amount=1 → ~6-bit steps.
 *    2. Lowpass cutoff slides from 18 kHz (clean) down to 4 kHz (muffled).
 *
 *  Wet/dry blend is handled by two gain nodes so a settings change can swap
 *  the mix in O(1) without rebuilding the graph. */

export type FilterGraph = {
  input: AudioNode;
  output: AudioNode;
  setAmount: (a: number) => void;
  dispose: () => void;
};

const CURVE_SAMPLES = 2048;

function makeCrushCurve(steps: number): Float32Array {
  const c = new Float32Array(CURVE_SAMPLES);
  for (let i = 0; i < CURVE_SAMPLES; i++) {
    const x = (i / (CURVE_SAMPLES - 1)) * 2 - 1;
    c[i] = Math.round(x * steps) / steps;
  }
  return c;
}

/** Pre-baked curves for different bit-depths. The active one is swapped
 *  whenever the amount setting crosses a band. */
const CURVES: { threshold: number; curve: Float32Array }[] = [
  { threshold: 0.0,  curve: makeCrushCurve(128) }, // ~7-bit (very subtle)
  { threshold: 0.25, curve: makeCrushCurve(48) },
  { threshold: 0.50, curve: makeCrushCurve(20) },
  { threshold: 0.75, curve: makeCrushCurve(10) },  // ~3.5-bit, full PS1 grit
];

function pickCurve(amount: number): Float32Array {
  let best = CURVES[0].curve;
  for (const c of CURVES) {
    if (amount >= c.threshold) best = c.curve;
  }
  return best;
}

export function createPS1Filter(ctx: AudioContext, amount: number): FilterGraph {
  const input = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const lowpass = ctx.createBiquadFilter();
  const crush = ctx.createWaveShaper();
  const output = ctx.createGain();

  lowpass.type = "lowpass";
  lowpass.Q.value = 0.7;
  crush.oversample = "none";

  input.connect(dry);
  input.connect(lowpass);
  lowpass.connect(crush);
  crush.connect(wet);
  dry.connect(output);
  wet.connect(output);

  function setAmount(a: number): void {
    const clamped = Math.max(0, Math.min(1, a));
    // wet/dry sin/cos blend so total RMS stays roughly constant
    wet.gain.value = Math.sin(clamped * Math.PI * 0.5);
    dry.gain.value = Math.cos(clamped * Math.PI * 0.5);
    // 18 kHz → 4 kHz exponential sweep
    lowpass.frequency.value = 18000 * Math.pow(4000 / 18000, clamped);
    crush.curve = pickCurve(clamped) as Float32Array<ArrayBuffer>;
  }
  setAmount(amount);

  return {
    input, output, setAmount,
    dispose: () => {
      try { input.disconnect(); dry.disconnect(); wet.disconnect(); } catch { /* noop */ }
      try { lowpass.disconnect(); crush.disconnect(); output.disconnect(); } catch { /* noop */ }
    },
  };
}
