/** Simple noise gate: smooth-envelope follower drives a gain node.
 *
 *  When the moving RMS of the input stays below `thresholdDb` for longer
 *  than the release time, the gate closes; once it crosses back above the
 *  threshold, attack opens it again. Cheap (one AnalyserNode + a 60 Hz
 *  RAF loop) and good enough to silence keyboard / fan hiss while voice
 *  comes through unaffected.
 *
 *  Use:
 *    const gate = createNoiseGate(ctx, { thresholdDb: -45 });
 *    src.connect(gate.input);
 *    gate.output.connect(dest);
 *    // ...later
 *    gate.setEnabled(false);   // bypass (always open)
 *    gate.dispose();
 */

const ANALYSER_FFT = 512;
const ATTACK_S = 0.01;    // 10 ms — open fast so the start of a word isn't clipped
const RELEASE_S = 0.18;   // 180 ms — close slow so word-tails aren't cut
const MIN_GAIN = 0.0;

export type NoiseGate = {
  input: AudioNode;
  output: AudioNode;
  setEnabled: (on: boolean) => void;
  setThresholdDb: (db: number) => void;
  dispose: () => void;
};

export function createNoiseGate(
  ctx: AudioContext, opts: { thresholdDb?: number } = {},
): NoiseGate {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = ANALYSER_FFT;
  const buf = new Float32Array(analyser.fftSize);

  input.connect(analyser);
  input.connect(output);

  let thresholdDb = opts.thresholdDb ?? -45;
  let enabled = true;
  let raf = 0;

  function rmsDb(): number {
    analyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length) || 1e-7;
    return 20 * Math.log10(rms);
  }

  function tick(): void {
    if (!enabled) {
      output.gain.setTargetAtTime(1, ctx.currentTime, ATTACK_S);
    } else {
      const db = rmsDb();
      const target = db > thresholdDb ? 1 : MIN_GAIN;
      const tau = target > output.gain.value ? ATTACK_S : RELEASE_S;
      output.gain.setTargetAtTime(target, ctx.currentTime, tau);
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    input, output,
    setEnabled: (on) => { enabled = on; },
    setThresholdDb: (db) => { thresholdDb = db; },
    dispose: () => {
      cancelAnimationFrame(raf);
      try { input.disconnect(); output.disconnect(); analyser.disconnect(); }
      catch { /* noop */ }
    },
  };
}
