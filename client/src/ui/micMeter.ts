/** Live mic activity bar. Pulls samples from an AnalyserNode and renders a
 *  horizontal level meter that ticks at ~30 Hz. Stops cleanly via the
 *  returned dispose fn so settings-page teardown doesn't leak intervals. */
import { el } from "./dom";

const ANALYSER_FFT = 256;
const REFRESH_HZ = 30;

export type MicMeter = {
  element: HTMLElement;
  /** Swap the active stream — passing null shows "no signal". */
  setStream: (stream: MediaStream | null) => void;
  dispose: () => void;
};

export function createMicMeter(): MicMeter {
  const root = el<HTMLDivElement>("div", "mic-meter");
  const bar = el<HTMLDivElement>("div", "mic-meter-fill");
  const label = el<HTMLSpanElement>("span", "mic-meter-label", "no signal");
  root.append(bar, label);

  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let src: MediaStreamAudioSourceNode | null = null;
  let buf: Uint8Array | null = null;
  let timer: number | null = null;

  function stop(): void {
    if (timer !== null) { clearInterval(timer); timer = null; }
    try { src?.disconnect(); } catch { /* noop */ }
    src = null;
    bar.style.width = "0%";
    label.textContent = "no signal";
  }

  function setStream(stream: MediaStream | null): void {
    stop();
    if (!stream || stream.getAudioTracks().length === 0) return;
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as {
        webkitAudioContext: typeof AudioContext;
      }).webkitAudioContext;
      ctx = new Ctor();
      analyser = ctx.createAnalyser();
      analyser.fftSize = ANALYSER_FFT;
      buf = new Uint8Array(analyser.frequencyBinCount);
    }
    src = ctx.createMediaStreamSource(stream);
    src.connect(analyser!);
    label.textContent = "live";
    timer = window.setInterval(tick, 1000 / REFRESH_HZ);
  }

  function tick(): void {
    if (!analyser || !buf) return;
    analyser.getByteTimeDomainData(buf as Uint8Array<ArrayBuffer>);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = Math.abs(buf[i] - 128) / 128;
      if (v > peak) peak = v;
    }
    bar.style.width = `${Math.min(100, peak * 200)}%`;
  }

  return {
    element: root,
    setStream,
    dispose: () => {
      stop();
      try { ctx?.close(); } catch { /* noop */ }
      ctx = null; analyser = null; buf = null;
    },
  };
}
