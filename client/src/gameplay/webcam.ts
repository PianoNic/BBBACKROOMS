/** Peer-to-peer media mesh: video (webcam) + audio (voice) over the same
 *  RTCPeerConnection. The server only relays SDP / ICE; media flows
 *  browser-to-browser. Polite-peer pattern handles offer collisions.
 *  Video is capped at 96×72 @ 6fps @ 40 kbps for an 8-player mesh.
 *
 *  Per-peer connection wiring lives in `webcamPeer.ts`. */
import type { NetClient } from "../net/client";
import { createMicProcessor, type MicProcessor } from "./micProcessor";
import { acquireMedia, applyVideoBitrateCap, fetchIceServers } from "./webrtcIce";
import {
  attachLocalTracks, createPeer, detachVideoTracks,
  type Peer, type PeerContext, type StreamCb,
} from "./webcamPeer";

export type WebcamMesh = {
  setLocalEnabled: (on: boolean) => Promise<void>;
  isLocalEnabled: () => boolean;
  getLocalStream: () => MediaStream | null;
  setMicEnabled: (on: boolean) => Promise<void>;
  getLocalAudioStream: () => MediaStream | null;
  addPeer: (id: string) => void;
  removePeer: (id: string) => void;
  setPeers: (ids: string[]) => void;
  onRemoteStream: (cb: StreamCb) => void;
  onRemoteAudio: (cb: StreamCb) => void;
  onLocalState: (cb: (on: boolean) => void) => void;
  applySignal: (from: string, kind: "offer" | "answer" | "ice", data: any) => Promise<void>;
  applyPeerOff: (id: string) => void;
  dispose: () => void;
};

export function createWebcamMesh(selfId: string, net: NetClient): WebcamMesh {
  const peers = new Map<string, Peer>();
  let localStream: MediaStream | null = null;
  let localEnabled = false;
  let mic: MicProcessor | null = null;
  let micEnabled = false;
  let iceServers: RTCIceServer[] | null = null;
  let remoteCb: StreamCb | null = null;
  let audioCb: StreamCb | null = null;
  let localCb: ((on: boolean) => void) | null = null;

  async function ensureIce(): Promise<void> {
    if (!iceServers) iceServers = await fetchIceServers();
  }

  function peerCtx(): PeerContext {
    return {
      selfId, net, iceServers: iceServers ?? [],
      onAudio: (id, s) => audioCb?.(id, s),
      onVideo: (id, s) => remoteCb?.(id, s),
    };
  }

  function wireLocal(p: Peer): void {
    attachLocalTracks(p, localStream, localEnabled, mic?.processed ?? null);
  }

  function ensurePeer(peerId: string): Peer {
    let p = peers.get(peerId);
    if (p) return p;
    p = createPeer(peerId, peerCtx());
    peers.set(peerId, p);
    wireLocal(p);
    return p;
  }

  function removePeer(id: string): void {
    const p = peers.get(id);
    if (!p) return;
    try { p.pc.close(); } catch { /* noop */ }
    peers.delete(id);
    if (p.remoteStream) remoteCb?.(id, null);
  }

  async function setMicEnabled(on: boolean): Promise<void> {
    if (on === micEnabled) return;
    if (on && !mic) {
      const raw = await acquireMedia("audio");
      if (!raw) return;
      mic = createMicProcessor(raw);
      await ensureIce();
      for (const p of peers.values()) wireLocal(p);
    }
    micEnabled = on;
    if (mic) for (const t of mic.processed.getAudioTracks()) t.enabled = on;
  }

  async function setLocalEnabled(on: boolean): Promise<void> {
    if (on === localEnabled) return;
    if (on) {
      const s = await acquireMedia("video");
      if (!s) return;
      localStream = s;
      localEnabled = true;
      await ensureIce();
      for (const p of peers.values()) wireLocal(p);
    } else {
      localEnabled = false;
      localStream?.getTracks().forEach((t) => t.stop());
      localStream = null;
      for (const p of peers.values()) detachVideoTracks(p);
    }
    net.send({ type: "webcam_state", on: localEnabled });
    localCb?.(localEnabled);
  }

  async function applySignal(
    from: string, kind: "offer" | "answer" | "ice", data: any,
  ): Promise<void> {
    await ensureIce();
    const p = ensurePeer(from);
    const pc = p.pc;
    try {
      if (kind === "offer") {
        const collision = p.makingOffer || pc.signalingState !== "stable";
        p.ignoreOffer = !p.polite && collision;
        if (p.ignoreOffer) return;
        await pc.setRemoteDescription({ type: "offer", sdp: data.sdp });
        await pc.setLocalDescription();
        applyVideoBitrateCap(pc);
        net.send({
          type: "webrtc_signal", to: from, kind: "answer",
          data: { sdp: pc.localDescription?.sdp, type: pc.localDescription?.type },
        });
      } else if (kind === "answer" && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
      } else if (kind === "ice") {
        try { await pc.addIceCandidate(data); }
        catch (err) {
          if (!p.ignoreOffer) console.warn("[webcam] addIceCandidate failed", err);
        }
      }
    } catch (err) {
      console.warn("[webcam] signal handling failed", err);
    }
  }

  return {
    setLocalEnabled,
    isLocalEnabled: () => localEnabled,
    getLocalStream: () => localStream,
    setMicEnabled,
    getLocalAudioStream: () => mic?.processed ?? null,
    addPeer: (id) => {
      if (id === selfId) return;
      void ensureIce().then(() => ensurePeer(id));
    },
    removePeer,
    setPeers: (ids) => {
      const wanted = new Set(ids.filter((i) => i !== selfId));
      for (const id of [...peers.keys()]) if (!wanted.has(id)) removePeer(id);
      for (const id of wanted) {
        if (!peers.has(id)) void ensureIce().then(() => ensurePeer(id));
      }
    },
    onRemoteStream: (cb) => {
      remoteCb = cb;
      for (const [id, p] of peers) if (p.remoteStream) cb(id, p.remoteStream);
    },
    onRemoteAudio: (cb) => {
      audioCb = cb;
      for (const [id, p] of peers) {
        for (const recv of p.pc.getReceivers()) {
          if (recv.track?.kind === "audio") {
            cb(id, new MediaStream([recv.track]));
            break;
          }
        }
      }
    },
    onLocalState: (cb) => { localCb = cb; },
    applySignal,
    applyPeerOff: (id) => {
      const p = peers.get(id);
      if (p?.remoteStream) { p.remoteStream = null; remoteCb?.(id, null); }
    },
    dispose: () => {
      void setLocalEnabled(false);
      mic?.dispose();
      mic = null;
      micEnabled = false;
      for (const id of [...peers.keys()]) removePeer(id);
    },
  };
}
