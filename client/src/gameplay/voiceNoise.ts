/** Voice-noise reporter: watches the local mic level and tells the server
 *  when the player is audibly talking, so nearby teachers can investigate.
 *  Position and rate limiting are server-side — this only reports "the mic
 *  picked up speech right now". */
import type { NetClient } from "../net/client";
import type { WebcamMesh } from "./webcam";

const SAMPLE_INTERVAL_MS = 400;
const SEND_INTERVAL_MS = 1200;
// RMS of the time-domain signal (0..~1). Breathing/room noise stays well
// below this; speech at normal volume crosses it.
const SPEECH_RMS = 0.045;

export function installVoiceNoise(
  net: NetClient,
  webcam: WebcamMesh,
  isMicLive: () => boolean,
  isActive: () => boolean,
): void {
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let analysedStream: MediaStream | null = null;
  let buf: Uint8Array<ArrayBuffer> | null = null;
  let lastSent = 0;

  window.setInterval(() => {
    if (!isMicLive() || !isActive()) return;
    const stream = webcam.getLocalAudioStream();
    if (!stream) return;
    if (stream !== analysedStream) {
      // (Re)wire the analyser to the current mic stream.
      ctx ??= new AudioContext();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      analysedStream = stream;
      buf = new Uint8Array(analyser.fftSize);
    }
    if (!analyser || !buf) return;
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    const now = performance.now();
    if (rms >= SPEECH_RMS && now - lastSent >= SEND_INTERVAL_MS) {
      lastSent = now;
      net.send({ type: "voice_noise" });
    }
  }, SAMPLE_INTERVAL_MS);
}
