/** Per-peer RTCPeerConnection setup for the webcam mesh.
 *
 *  Kept separate from `webcam.ts` so the main mesh module stays small.
 *  The helpers below take a context object instead of closing over module
 *  state, which keeps the data flow explicit. */
import type { NetClient } from "../net/client";
import { applyVideoBitrateCap } from "./webrtcIce";

export type Peer = {
  pc: RTCPeerConnection;
  remoteStream: MediaStream | null;
  makingOffer: boolean;
  ignoreOffer: boolean;
  polite: boolean;
};

export type StreamCb = (id: string, stream: MediaStream | null) => void;

export type PeerContext = {
  selfId: string;
  net: NetClient;
  iceServers: RTCIceServer[];
  /** Called when a remote audio track arrives or ends. */
  onAudio: StreamCb;
  /** Called when a remote video stream arrives or ends. */
  onVideo: StreamCb;
};

function handleTrack(
  peerId: string, peer: Peer, e: RTCTrackEvent, ctx: PeerContext,
): void {
  const stream = e.streams[0] ?? new MediaStream([e.track]);
  if (e.track.kind === "audio") {
    ctx.onAudio(peerId, stream);
    e.track.addEventListener("ended", () => ctx.onAudio(peerId, null));
    return;
  }
  peer.remoteStream = stream;
  ctx.onVideo(peerId, stream);
  e.track.addEventListener("ended", () => {
    if (peer.remoteStream === stream) {
      peer.remoteStream = null;
      ctx.onVideo(peerId, null);
    }
  });
}

export function createPeer(peerId: string, ctx: PeerContext): Peer {
  const pc = new RTCPeerConnection({ iceServers: ctx.iceServers });
  const peer: Peer = {
    pc, remoteStream: null, makingOffer: false, ignoreOffer: false,
    polite: ctx.selfId < peerId,
  };
  pc.onicecandidate = (e) => {
    if (!e.candidate) return;
    ctx.net.send({
      type: "webrtc_signal", to: peerId, kind: "ice",
      data: e.candidate.toJSON() as unknown as Record<string, unknown>,
    });
  };
  pc.ontrack = (e) => handleTrack(peerId, peer, e, ctx);
  pc.onnegotiationneeded = async () => {
    try {
      peer.makingOffer = true;
      await pc.setLocalDescription();
      applyVideoBitrateCap(pc);
      ctx.net.send({
        type: "webrtc_signal", to: peerId, kind: "offer",
        data: { sdp: pc.localDescription?.sdp, type: pc.localDescription?.type },
      });
    } catch (err) {
      console.warn("[webcam] negotiation failed", err);
    } finally {
      peer.makingOffer = false;
    }
  };
  return peer;
}

export function attachLocalTracks(
  p: Peer,
  videoStream: MediaStream | null, videoOn: boolean,
  micStream: MediaStream | null,
): void {
  const add = (stream: MediaStream): void => {
    for (const track of stream.getTracks()) {
      if (!p.pc.getSenders().some((s) => s.track === track)) {
        p.pc.addTrack(track, stream);
      }
    }
  };
  if (videoStream && videoOn) add(videoStream);
  if (micStream) add(micStream);
}

export function detachVideoTracks(p: Peer): void {
  for (const sender of p.pc.getSenders()) {
    if (sender.track?.kind === "video") {
      try { p.pc.removeTrack(sender); } catch { /* noop */ }
    }
  }
}
