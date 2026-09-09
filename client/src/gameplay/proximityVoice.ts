/** Proximity voice chat: per-peer PositionalSound that follows the
 *  speaker's mesh and is dampened when a wall blocks the line of sight.
 *
 *  Audio streams come from the WebRTC media mesh. Distance falloff is
 *  handled natively by the WebAudio panner (ref / max / rolloff). LOS
 *  occlusion is applied each frame as a master-volume multiplier — 1.0
 *  clear, 0.4 when blocked. We keep a hidden muted <audio> element per
 *  stream so browsers treat the MediaStreamSource as "live" (Chrome
 *  quirk). */
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { getSettings, onSettingsChange } from "../core/settings";
import { PositionalSound, type SpatialListener } from "../core/spatialAudio";
import { createPS1Filter, type FilterGraph } from "./audioFilter";

const REF_DISTANCE = 3.5;
const MAX_DISTANCE = 18;
const ROLLOFF = 2.2;
const OCCLUDED_GAIN = 0.4;
const SAMPLE_STEP = 0.4; // fraction of cellSize per LOS sample
type Cells = { cells: number[]; width: number; height: number; cellSize: number };

type Entry = {
  audio: PositionalSound;
  source: MediaStreamAudioSourceNode;
  filter: FilterGraph;
  /** Hidden muted audio element — needed in Chrome to keep the stream alive
   *  when consumed solely through WebAudio. Without this the source is
   *  silent. */
  sink: HTMLAudioElement;
};

export class ProximityVoice {
  private readonly entries = new Map<string, Entry>();
  private readonly listener: SpatialListener;
  private readonly grid: Cells;
  private readonly getMesh: (id: string) => TransformNode | null;
  private volume = 1;
  private ps1Amount = 0;

  constructor(
    listener: SpatialListener,
    grid: Cells,
    getMesh: (id: string) => TransformNode | null,
  ) {
    this.listener = listener;
    this.grid = grid;
    this.getMesh = getMesh;
    const s0 = getSettings();
    this.volume = s0.sfxVolume;
    this.ps1Amount = s0.ps1VoiceAmount;
    onSettingsChange((s) => {
      this.volume = s.sfxVolume;
      if (s.ps1VoiceAmount !== this.ps1Amount) {
        this.ps1Amount = s.ps1VoiceAmount;
        for (const e of this.entries.values()) e.filter.setAmount(this.ps1Amount);
      }
    });
  }

  setStream(id: string, stream: MediaStream | null): void {
    const existing = this.entries.get(id);
    if (!stream) {
      if (existing) this.disposeEntry(id, existing);
      return;
    }
    const mesh = this.getMesh(id);
    if (!mesh) return;
    if (existing) this.disposeEntry(id, existing);
    const ctx = this.listener.context;
    if (!ctx) return;
    const audio = new PositionalSound(this.listener);
    if (audio.gain === null) return;
    audio.setRefDistance(REF_DISTANCE);
    audio.setMaxDistance(MAX_DISTANCE);
    audio.setRolloffFactor(ROLLOFF);
    audio.setDistanceModel("inverse");
    audio.setVolume(this.volume);
    const source = ctx.createMediaStreamSource(stream);
    const filter = createPS1Filter(ctx, this.ps1Amount);
    source.connect(filter.input);
    filter.output.connect(audio.gain);
    audio.attachTo(mesh);
    const sink = document.createElement("audio");
    sink.srcObject = stream;
    sink.muted = true;
    sink.autoplay = true;
    sink.play().catch(() => { /* autoplay gated; will retry on user gesture */ });
    this.entries.set(id, { audio, source, filter, sink });
  }

  /** Per-frame: apply LOS occlusion as a volume multiplier. */
  update(localX: number, localZ: number): void {
    for (const [id, e] of this.entries) {
      const mesh = this.getMesh(id);
      if (!mesh) {
        e.audio.setVolume(0);
        continue;
      }
      const px = mesh.position.x;
      const pz = mesh.position.z;
      const factor = this.lineOfSight(localX, localZ, px, pz) ? 1.0 : OCCLUDED_GAIN;
      e.audio.setVolume(this.volume * factor);
    }
  }

  private lineOfSight(x1: number, z1: number, x2: number, z2: number): boolean {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.01) return true;
    const step = this.grid.cellSize * SAMPLE_STEP;
    const n = Math.max(2, Math.floor(dist / step) + 1);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (!this.walkable(x1 + dx * t, z1 + dz * t)) return false;
    }
    return true;
  }

  private walkable(x: number, z: number): boolean {
    const cx = Math.floor(x / this.grid.cellSize);
    const cz = Math.floor(z / this.grid.cellSize);
    if (cx < 0 || cz < 0 || cx >= this.grid.width || cz >= this.grid.height) return false;
    return this.grid.cells[cz * this.grid.width + cx] === 1;
  }

  removePeer(id: string): void {
    const e = this.entries.get(id);
    if (e) this.disposeEntry(id, e);
  }

  private disposeEntry(id: string, e: Entry): void {
    e.audio.dispose();
    try { e.source.disconnect(); } catch { /* noop */ }
    e.filter.dispose();
    e.sink.srcObject = null;
    e.sink.remove();
    this.entries.delete(id);
  }
}
