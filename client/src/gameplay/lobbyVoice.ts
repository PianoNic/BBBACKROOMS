/** Lobby voice chat + speaking detection + per-peer volume.
 *
 *  Plays remote peer audio (no 3D / proximity since the lobby isn't spatial)
 *  and runs RMS-based voice-activity detection on every stream so the UI
 *  can show a "speaker" icon next to whoever is talking. Per-peer volume
 *  goes through a GainNode so the lobby can boost a quiet teammate up to
 *  3x or mute them entirely. Local mic is monitored for the speaking
 *  indicator only — no playback path (you'd hear yourself echo). */

const POLL_HZ = 15;
const SPEAK_THRESHOLD = 0.025;   // RMS amplitude
const ATTACK_MS = 60;
const RELEASE_MS = 400;

type SpeakingCb = (peerId: string, speaking: boolean) => void;
type Entry = {
  src: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  buf: Float32Array;
  gain: GainNode | null;
  /** Hidden audio element kept around solely to keep the WebRTC stream
   *  alive in Chrome (a known quirk — MediaStreamSource alone won't
   *  pull frames). Volume is set to 0; gain is the real output path. */
  keepalive: HTMLAudioElement | null;
  speaking: boolean;
  aboveSince: number;
  belowSince: number;
};

export type LobbyVoice = {
  setRemote(peerId: string, stream: MediaStream | null): void;
  setLocal(stream: MediaStream | null): void;
  /** `multiplier` is a linear gain: 0 = muted, 1 = normal, up to ~3. */
  setVolume(peerId: string, multiplier: number): void;
  dispose(): void;
};

export const LOCAL_KEY = "__self__";

export function createLobbyVoice(onSpeaking: SpeakingCb): LobbyVoice {
  const Ctx = window.AudioContext || (window as unknown as {
    webkitAudioContext: typeof AudioContext;
  }).webkitAudioContext;
  const ctx = new Ctx();
  const entries = new Map<string, Entry>();
  /** Cached per-peer volumes so disconnects/reconnects keep the slider value. */
  const volumes = new Map<string, number>();

  function add(peerId: string, stream: MediaStream, withPlayback: boolean): void {
    remove(peerId);
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);

    let gain: GainNode | null = null;
    let keepalive: HTMLAudioElement | null = null;
    if (withPlayback) {
      gain = ctx.createGain();
      gain.gain.value = volumes.get(peerId) ?? 1;
      src.connect(gain);
      gain.connect(ctx.destination);
      // Chrome won't pull samples through MediaStreamSource unless the
      // stream is also bound to a media element. Mute it, then forget it.
      keepalive = document.createElement("audio");
      keepalive.srcObject = stream;
      keepalive.autoplay = true;
      keepalive.muted = true;
      keepalive.style.display = "none";
      document.body.appendChild(keepalive);
    }
    entries.set(peerId, {
      src, analyser, buf: new Float32Array(analyser.fftSize),
      gain, keepalive,
      speaking: false, aboveSince: 0, belowSince: 0,
    });
  }

  function remove(peerId: string): void {
    const e = entries.get(peerId);
    if (!e) return;
    try {
      e.src.disconnect(); e.analyser.disconnect();
      e.gain?.disconnect();
    } catch { /* noop */ }
    if (e.keepalive) {
      e.keepalive.srcObject = null;
      e.keepalive.remove();
    }
    if (e.speaking) onSpeaking(peerId, false);
    entries.delete(peerId);
  }

  function tick(): void {
    const now = performance.now();
    for (const [id, e] of entries) {
      e.analyser.getFloatTimeDomainData(e.buf as Float32Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 0; i < e.buf.length; i++) sum += e.buf[i] * e.buf[i];
      const rms = Math.sqrt(sum / e.buf.length);
      if (rms > SPEAK_THRESHOLD) {
        if (e.aboveSince === 0) e.aboveSince = now;
        e.belowSince = 0;
        if (!e.speaking && now - e.aboveSince >= ATTACK_MS) {
          e.speaking = true;
          onSpeaking(id, true);
        }
      } else {
        if (e.belowSince === 0) e.belowSince = now;
        e.aboveSince = 0;
        if (e.speaking && now - e.belowSince >= RELEASE_MS) {
          e.speaking = false;
          onSpeaking(id, false);
        }
      }
    }
  }

  const timer = window.setInterval(tick, 1000 / POLL_HZ);

  return {
    setRemote: (peerId, stream) => stream ? add(peerId, stream, true) : remove(peerId),
    setLocal: (stream) => stream ? add(LOCAL_KEY, stream, false) : remove(LOCAL_KEY),
    setVolume: (peerId, multiplier) => {
      const clamped = Math.max(0, multiplier);
      volumes.set(peerId, clamped);
      const e = entries.get(peerId);
      if (e?.gain) e.gain.gain.value = clamped;
    },
    dispose: () => {
      clearInterval(timer);
      for (const id of [...entries.keys()]) remove(id);
      ctx.close().catch(() => undefined);
    },
  };
}
