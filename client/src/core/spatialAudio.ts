import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { getAudioContext } from "./audio";

/** WebAudio listener + panner wrappers that replace `THREE.AudioListener`
 *  and `THREE.PositionalAudio`. The node graph is the same shape three.js
 *  built: buffer source → panner → gain → listener bus → destination. */
export class SpatialListener {
  readonly context: AudioContext | null;
  readonly bus: GainNode | null;

  constructor() {
    const ctx = getAudioContext();
    this.context = ctx;
    this.bus = ctx ? ctx.createGain() : null;
    if (ctx && this.bus) this.bus.connect(ctx.destination);
  }

  setPose(
    px: number, py: number, pz: number,
    fx: number, fy: number, fz: number,
  ): void {
    const ctx = this.context;
    if (!ctx) return;
    const l = ctx.listener;
    if (l.positionX) {
      l.positionX.value = px;
      l.positionY.value = py;
      l.positionZ.value = pz;
      l.forwardX.value = fx;
      l.forwardY.value = fy;
      l.forwardZ.value = fz;
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
      return;
    }
    l.setPosition(px, py, pz);
    l.setOrientation(fx, fy, fz, 0, 1, 0);
  }
}

const attached = new Set<PositionalSound>();

export class PositionalSound {
  /** Post-panner gain — the node `THREE.Audio` exposed under the same
   *  name, so external graphs connect at exactly the same point. */
  readonly gain: GainNode | null;
  private readonly panner: PannerNode | null;
  private readonly ctx: AudioContext | null;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private rate = 1;
  private playing = false;
  private node: TransformNode | null = null;

  constructor(listener: SpatialListener) {
    const ctx = listener.context;
    this.ctx = ctx;
    if (!ctx || !listener.bus) {
      this.gain = null;
      this.panner = null;
      return;
    }
    this.gain = ctx.createGain();
    this.gain.connect(listener.bus);
    this.panner = ctx.createPanner();
    this.panner.panningModel = "HRTF";
    this.panner.connect(this.gain);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  setRefDistance(v: number): void { if (this.panner) this.panner.refDistance = v; }
  setMaxDistance(v: number): void { if (this.panner) this.panner.maxDistance = v; }
  setRolloffFactor(v: number): void { if (this.panner) this.panner.rolloffFactor = v; }
  setDistanceModel(v: DistanceModelType): void {
    if (this.panner) this.panner.distanceModel = v;
  }

  setVolume(v: number): void {
    if (this.gain) this.gain.gain.value = v;
  }

  setBuffer(buf: AudioBuffer): void {
    this.buffer = buf;
  }

  setPlaybackRate(v: number): void {
    this.rate = v;
    if (this.source) this.source.playbackRate.value = v;
  }

  play(): void {
    if (!this.ctx || !this.panner || !this.buffer) return;
    this.stop();
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = this.rate;
    src.connect(this.panner);
    src.onended = () => { this.playing = false; };
    src.start();
    this.source = src;
    this.playing = true;
  }

  stop(): void {
    if (this.source) {
      try { this.source.stop(); } catch { /* already stopped */ }
      try { this.source.disconnect(); } catch { /* already detached */ }
      this.source = null;
    }
    this.playing = false;
  }

  setPosition(x: number, y: number, z: number): void {
    const p = this.panner;
    if (!p) return;
    if (p.positionX) {
      p.positionX.value = x;
      p.positionY.value = y;
      p.positionZ.value = z;
      return;
    }
    p.setPosition(x, y, z);
  }

  /** Follow a scene node: the panner position is refreshed every frame by
   *  `updateSpatialAudio`. Pass null to detach. */
  attachTo(node: TransformNode | null): void {
    this.node = node;
    if (node) attached.add(this);
    else attached.delete(this);
  }

  syncPosition(): void {
    if (!this.node) return;
    const p = this.node.getAbsolutePosition();
    this.setPosition(p.x, p.y, p.z);
  }

  dispose(): void {
    attached.delete(this);
    this.stop();
    try { this.panner?.disconnect(); } catch { /* already detached */ }
    try { this.gain?.disconnect(); } catch { /* already detached */ }
  }
}

export function updateSpatialAudio(
  listener: SpatialListener,
  px: number, py: number, pz: number,
  fx: number, fy: number, fz: number,
): void {
  listener.setPose(px, py, pz, fx, fy, fz);
  for (const s of attached) s.syncPosition();
}
