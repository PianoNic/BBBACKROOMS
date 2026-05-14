/** WebRTC + media-acquisition helpers shared by the media mesh.
 *
 *  Three concerns live here so `webcam.ts` stays focused on signalling:
 *   - TURN/STUN ICE config fetched from the backend
 *   - Per-sender bitrate / framerate cap on video
 *   - getUserMedia wrapper that honours the user's device selection */
import { getSettings } from "../core/settings";

const HTTP_BASE = import.meta.env.VITE_SERVER_URL ?? "";
const FALLBACK_ICE: RTCIceServer[] = [{
  urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"],
}];

const MAX_VIDEO_BITRATE_BPS = 40_000;
const MAX_VIDEO_FRAMERATE = 10;

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const r = await fetch(`${HTTP_BASE}/turn-credentials`);
    if (!r.ok) throw new Error("http " + r.status);
    const j = await r.json();
    if (Array.isArray(j.iceServers)) return j.iceServers as RTCIceServer[];
  } catch (e) {
    console.warn("[webrtc] turn-credentials fetch failed, using public STUN", e);
  }
  return FALLBACK_ICE;
}

export function applyVideoBitrateCap(pc: RTCPeerConnection): void {
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== "video") continue;
    const params = sender.getParameters();
    if (!params.encodings?.length) params.encodings = [{}];
    params.encodings[0].maxBitrate = MAX_VIDEO_BITRATE_BPS;
    params.encodings[0].maxFramerate = MAX_VIDEO_FRAMERATE;
    sender.setParameters(params).catch(() => { /* unsupported on some browsers */ });
  }
}

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 96 }, height: { ideal: 72 },
  frameRate: { ideal: 6, max: 10 },
};
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true, noiseSuppression: true, autoGainControl: true,
};

export async function acquireMedia(
  kind: "video" | "audio",
): Promise<MediaStream | null> {
  const s = getSettings();
  const deviceId = kind === "video" ? s.cameraDeviceId : s.micDeviceId;
  const base = kind === "video" ? { ...VIDEO_CONSTRAINTS } : { ...AUDIO_CONSTRAINTS };
  if (deviceId) base.deviceId = { exact: deviceId };
  try {
    return await navigator.mediaDevices.getUserMedia(
      kind === "video" ? { video: base, audio: false } : { audio: base, video: false },
    );
  } catch (e) {
    console.warn(`[webcam] getUserMedia(${kind}) denied/failed`, e);
    return null;
  }
}
