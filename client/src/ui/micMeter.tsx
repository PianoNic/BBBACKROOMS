/** Live mic activity bar. Pulls samples from an AnalyserNode and renders a
 *  horizontal level meter that ticks at ~30 Hz. Disposed cleanly on
 *  unmount/stream-change so settings-page teardown doesn't leak intervals. */
import { useEffect, useRef } from "preact/hooks";

const ANALYSER_FFT = 256;
const REFRESH_HZ = 30;

export function MicMeter(props: { stream: MediaStream | null }) {
  const barRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bufRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    const label = labelRef.current;
    if (!bar || !label) return;

    let src: MediaStreamAudioSourceNode | null = null;
    let timer: number | null = null;

    function stop(): void {
      if (timer !== null) { window.clearInterval(timer); timer = null; }
      try { src?.disconnect(); } catch { /* noop */ }
      src = null;
      bar!.style.width = "0%";
      label!.textContent = "no signal";
    }

    function tick(): void {
      const analyser = analyserRef.current;
      const buf = bufRef.current;
      if (!analyser || !buf) return;
      analyser.getByteTimeDomainData(buf as Uint8Array<ArrayBuffer>);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = Math.abs(buf[i] - 128) / 128;
        if (v > peak) peak = v;
      }
      bar!.style.width = `${Math.min(100, peak * 200)}%`;
    }

    if (!props.stream || props.stream.getAudioTracks().length === 0) {
      stop();
      return;
    }

    if (!ctxRef.current) {
      const Ctor = window.AudioContext || (window as unknown as {
        webkitAudioContext: typeof AudioContext;
      }).webkitAudioContext;
      ctxRef.current = new Ctor();
      analyserRef.current = ctxRef.current.createAnalyser();
      analyserRef.current.fftSize = ANALYSER_FFT;
      bufRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    }
    src = ctxRef.current.createMediaStreamSource(props.stream);
    src.connect(analyserRef.current!);
    label.textContent = "live";
    timer = window.setInterval(tick, 1000 / REFRESH_HZ);

    return () => stop();
  }, [props.stream]);

  useEffect(() => () => {
    try { ctxRef.current?.close(); } catch { /* noop */ }
    ctxRef.current = null;
    analyserRef.current = null;
    bufRef.current = null;
  }, []);

  return (
    <div class="mic-meter">
      <div class="mic-meter-fill" ref={barRef} />
      <span class="mic-meter-label" ref={labelRef}>no signal</span>
    </div>
  );
}
