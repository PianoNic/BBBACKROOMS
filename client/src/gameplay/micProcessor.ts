/** Mic processing pipeline: raw input → noise gate → MediaStreamDestination.
 *
 *  Owns the AudioContext + noise-gate lifecycle so `webcam.ts` doesn't have
 *  to. Subscribes to settings changes so toggling the noise gate (or
 *  changing its threshold) takes effect on the live mic without a
 *  reconnect. Call `dispose()` to release the audio context and stop
 *  every track that was acquired. */
import { getSettings, onSettingsChange } from "../core/settings";
import { createNoiseGate, type NoiseGate } from "./audioNoiseGate";

export type MicProcessor = {
  /** Raw `getUserMedia` stream — kept alive so the graph stays connected. */
  raw: MediaStream;
  /** Processed stream to hand to peers. */
  processed: MediaStream;
  dispose: () => void;
};

export function createMicProcessor(raw: MediaStream): MicProcessor {
  const s = getSettings();
  const Ctx = window.AudioContext || (window as unknown as {
    webkitAudioContext: typeof AudioContext;
  }).webkitAudioContext;
  const ctx = new Ctx();
  const src = ctx.createMediaStreamSource(raw);
  const gate: NoiseGate = createNoiseGate(ctx, {
    thresholdDb: s.noiseGateThresholdDb,
  });
  gate.setEnabled(s.noiseGate);
  const dest = ctx.createMediaStreamDestination();
  src.connect(gate.input);
  gate.output.connect(dest);

  const unsub = onSettingsChange((next) => {
    gate.setEnabled(next.noiseGate);
    gate.setThresholdDb(next.noiseGateThresholdDb);
  });

  return {
    raw,
    processed: dest.stream,
    dispose: () => {
      unsub();
      gate.dispose();
      try { src.disconnect(); } catch { /* noop */ }
      try { dest.disconnect(); } catch { /* noop */ }
      raw.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => undefined);
    },
  };
}
