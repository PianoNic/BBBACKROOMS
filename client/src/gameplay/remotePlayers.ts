/** Per-player voxel renderer, footstep audio, and live-video swapping.
 *  Mesh material factories live in `remotePlayerMaterials.ts`. */
import * as THREE from "three";
import type { RemotePlayer } from "../net/protocol";
import { getSettings, onSettingsChange } from "../core/settings";
import { withinRadiusXZ } from "../core/geom";
import {
  disposeMaterial, makeAvatarMaterials, makeColorMaterial,
  makeVideoMaterials,
} from "./remotePlayerMaterials";

const BOX = new THREE.BoxGeometry(0.6, 1.7, 0.6);
const Y = 0.85;
const STEP_DISTANCE = 1.1;
const REF_DISTANCE = 2.5;
const MAX_DISTANCE = 25;
const ROLLOFF = 1.8;
const FOOTSTEP_URLS = [1, 2, 3, 4, 5].map((i) => `/sounds/footsteps/step-${i}.ogg`);

type Entry = {
  mesh: THREE.Mesh;
  color: string;
  target: THREE.Vector3;
  targetYaw: number;
  audio: THREE.PositionalAudio | null;
  lastStepX: number;
  lastStepZ: number;
  avatarUrl: string | null;
  video: HTMLVideoElement | null;
  videoTex: THREE.VideoTexture | null;
};

export class RemotePlayers {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();
  private listener: THREE.AudioListener | null = null;
  private readonly buffers: AudioBuffer[] = [];
  private buffersLoaded = false;

  /** Optional: attaching a listener enables spatial footsteps. */
  attachAudio(listener: THREE.AudioListener): void {
    if (this.listener) return;
    this.listener = listener;
    this.loadBuffers();
    onSettingsChange((s) => {
      for (const e of this.entries.values()) {
        if (e.audio) e.audio.setVolume(s.sfxVolume);
      }
    });
  }

  private async loadBuffers(): Promise<void> {
    if (!this.listener) return;
    const ctx = this.listener.context;
    for (const url of FOOTSTEP_URLS) {
      try {
        const res = await fetch(url);
        this.buffers.push(await ctx.decodeAudioData(await res.arrayBuffer()));
      } catch { /* skip missing */ }
    }
    this.buffersLoaded = true;
  }

  add(p: RemotePlayer): void {
    if (this.entries.has(p.id)) return;
    const mesh = new THREE.Mesh(BOX, makeColorMaterial(p.color));
    mesh.position.set(p.x, Y, p.z);
    mesh.rotation.y = p.yaw;
    this.group.add(mesh);

    let audio: THREE.PositionalAudio | null = null;
    if (this.listener) {
      audio = new THREE.PositionalAudio(this.listener);
      audio.setRefDistance(REF_DISTANCE);
      audio.setMaxDistance(MAX_DISTANCE);
      audio.setRolloffFactor(ROLLOFF);
      audio.setDistanceModel("inverse");
      audio.setVolume(getSettings().sfxVolume);
      mesh.add(audio);
    }

    this.entries.set(p.id, {
      mesh, color: p.color,
      target: new THREE.Vector3(p.x, Y, p.z),
      targetYaw: p.yaw, audio,
      lastStepX: p.x, lastStepZ: p.z,
      avatarUrl: p.avatar ?? null,
      video: null, videoTex: null,
    });
    if (p.avatar) this.applyAvatar(p.id, p.avatar);
  }

  setState(id: string, x: number, z: number, yaw: number): void {
    const e = this.entries.get(id);
    if (!e) return;
    e.target.set(x, Y, z);
    e.targetYaw = yaw;
    // Footstep when the remote walks a full stride; ignore sub-step jitter.
    if (!withinRadiusXZ(x, z, e.lastStepX, e.lastStepZ, STEP_DISTANCE)) {
      e.lastStepX = x;
      e.lastStepZ = z;
      this.playStep(e);
    }
  }

  private playStep(e: Entry): void {
    if (!this.buffersLoaded || this.buffers.length === 0 || !e.audio) return;
    if (e.audio.isPlaying) e.audio.stop();
    const buf = this.buffers[Math.floor(Math.random() * this.buffers.length)];
    e.audio.setBuffer(buf);
    e.audio.setPlaybackRate(0.88 + Math.random() * 0.18);
    e.audio.play();
  }

  setAvatar(id: string, avatar: string): void {
    const e = this.entries.get(id);
    if (e) e.avatarUrl = avatar;
    if (e?.video) return; // live cam takes precedence
    this.applyAvatar(id, avatar);
  }

  private async applyAvatar(id: string, avatar: string): Promise<void> {
    const e = this.entries.get(id);
    if (!e) return;
    try {
      const mats = await makeAvatarMaterials(avatar);
      const still = this.entries.get(id);
      if (still !== e || e.video) return; // video took over while we loaded
      const old = e.mesh.material;
      e.mesh.material = mats;
      disposeMaterial(old);
    } catch (err) {
      console.warn("avatar load failed", err);
    }
  }

  /** Switch the player's front face to a live video texture (or revert).
   *  Pass `null` to drop the video and fall back to the static avatar. */
  setVideoStream(id: string, stream: MediaStream | null): void {
    const e = this.entries.get(id);
    if (!e) return;
    if (stream) {
      const { mats, video, tex } = makeVideoMaterials(
        stream, e.video, new THREE.Color(e.color),
      );
      e.video = video;
      const old = e.mesh.material;
      e.mesh.material = mats;
      e.videoTex?.dispose();
      e.videoTex = tex;
      disposeMaterial(old);
    } else {
      if (e.video) { e.video.srcObject = null; e.video = null; }
      e.videoTex?.dispose();
      e.videoTex = null;
      if (e.avatarUrl) { void this.applyAvatar(id, e.avatarUrl); return; }
      const old = e.mesh.material;
      e.mesh.material = makeColorMaterial(e.color);
      disposeMaterial(old);
    }
  }

  /** Retire a downed player's live voxel. The visible corpse and its revive
   *  target are owned by the `Corpses` system, so we just remove the voxel
   *  here — otherwise the flattened voxel and the corpse marker overlap and
   *  render as two bodies inside each other. On revive the voxel is recreated
   *  via `remove` + `add` in the packet handler. */
  markDead(id: string, _x?: number, _z?: number): void {
    this.remove(id);
  }

  remove(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    this.group.remove(e.mesh);
    disposeMaterial(e.mesh.material);
    if (e.video) e.video.srcObject = null;
    e.videoTex?.dispose();
    this.entries.delete(id);
  }

  positions(): { x: number; z: number; color: string }[] {
    return [...this.entries.values()].map((e) => ({
      x: e.mesh.position.x, z: e.mesh.position.z, color: e.color,
    }));
  }
  ids(): string[] { return [...this.entries.keys()]; }
  getMesh(id: string): THREE.Mesh | null { return this.entries.get(id)?.mesh ?? null; }

  update(dt: number): void {
    const lerp = Math.min(1, dt * 12);
    for (const e of this.entries.values()) {
      e.mesh.position.lerp(e.target, lerp);
      e.mesh.rotation.y += (e.targetYaw - e.mesh.rotation.y) * lerp;
    }
  }
}
