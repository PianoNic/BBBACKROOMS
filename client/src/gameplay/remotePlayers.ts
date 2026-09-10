/** Per-player voxel renderer, footstep audio, and live-video swapping.
 *  Mesh material factories live in `remotePlayerMaterials.ts`. */
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { VideoTexture } from "@babylonjs/core/Materials/Textures/videoTexture";
import type { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { EquippedCosmetics, RemotePlayer } from "../net/protocol";
import { PositionalSound, type SpatialListener } from "../core/spatialAudio";
import { getSettings, onSettingsChange } from "../core/settings";
import { withinRadiusXZ } from "../core/geom";
import { group } from "../rendering/babylon";
import {
  buildHat, buildVoxelMesh, disposeHat, disposeVoxelMaterial, makeAvatarMaterials,
  makeColorMaterial, makeFacePatternMaterials, makeVideoMaterials, setVoxelMaterial,
} from "./remotePlayerMaterials";
import { resolveCosmetic } from "./cosmetics";
import { bodyColor } from "./cosmeticStyle";
import { NameTags } from "./nameTags";

const Y = 0.85;
const STEP_DISTANCE = 1.1;
const REF_DISTANCE = 2.5;
const MAX_DISTANCE = 25;
const ROLLOFF = 1.8;
const FOOTSTEP_URLS = [1, 2, 3, 4, 5].map((i) => `/sounds/footsteps/step-${i}.ogg`);

type Entry = {
  mesh: Mesh;
  color: string;
  target: Vector3;
  targetYaw: number;
  audio: PositionalSound | null;
  lastStepX: number;
  lastStepZ: number;
  avatarUrl: string | null;
  video: HTMLVideoElement | null;
  videoTex: VideoTexture | null;
  equipped: EquippedCosmetics;
  hat: TransformNode | null;
  name: string;
};

type RetiredLook = {
  avatarUrl: string | null;
  equipped: EquippedCosmetics;
  name: string;
};

export class RemotePlayers {
  readonly group = group("remotePlayers");
  readonly nameTags = new NameTags();
  private readonly entries = new Map<string, Entry>();
  /** Looks of downed players, kept so the recreated voxel on revive keeps
   *  its avatar and cosmetics (the live entry is destroyed by `markDead`). */
  private readonly retiredLooks = new Map<string, RetiredLook>();
  private listener: SpatialListener | null = null;
  private readonly buffers: AudioBuffer[] = [];
  private buffersLoaded = false;

  constructor(private readonly camera: FreeCamera) {
    this.group.add(this.nameTags.group);
  }

  /** Optional: attaching a listener enables spatial footsteps. */
  attachAudio(listener: SpatialListener): void {
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
    if (!ctx) { this.buffersLoaded = true; return; }
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
    const look = this.retiredLooks.get(p.id);
    this.retiredLooks.delete(p.id);
    const equipped = p.equipped ?? look?.equipped ?? {};
    const avatar = p.avatar ?? look?.avatarUrl ?? null;
    const name = p.name ?? look?.name ?? p.id.slice(0, 6);
    const mesh = buildVoxelMesh(0.6, 1.7, 0.6, makeColorMaterial(bodyColor(equipped, p.color)));
    mesh.position.set(p.x, Y, p.z);
    mesh.rotation.y = p.yaw;
    this.group.add(mesh);

    let audio: PositionalSound | null = null;
    if (this.listener) {
      audio = new PositionalSound(this.listener);
      audio.setRefDistance(REF_DISTANCE);
      audio.setMaxDistance(MAX_DISTANCE);
      audio.setRolloffFactor(ROLLOFF);
      audio.setDistanceModel("inverse");
      audio.setVolume(getSettings().sfxVolume);
      audio.attachTo(mesh);
    }

    this.entries.set(p.id, {
      mesh, color: p.color,
      target: new Vector3(p.x, Y, p.z),
      targetYaw: p.yaw, audio,
      lastStepX: p.x, lastStepZ: p.z,
      avatarUrl: avatar,
      video: null, videoTex: null,
      equipped, hat: null, name,
    });
    this.updateHat(p.id);
    if (avatar) this.applyAvatar(p.id, avatar);
    else this.applyFacePattern(p.id);
    this.nameTags.set(p.id, name, equipped, mesh);
  }

  /** Swap the player's hat to match their equipped cosmetic. */
  private updateHat(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    if (e.hat) { e.mesh.remove(e.hat); disposeHat(e.hat); e.hat = null; }
    const key = resolveCosmetic(e.equipped.hat)?.assetRef;
    if (key) {
      const hat = buildHat(key);
      if (hat) { e.mesh.add(hat); e.hat = hat; }
    }
  }

  /** Draw the equipped face pattern on the front face (only when no avatar or
   *  live video is shown). */
  private applyFacePattern(id: string): void {
    const e = this.entries.get(id);
    if (!e || e.video || e.avatarUrl) return;
    const path = resolveCosmetic(e.equipped.facePattern)?.assetRef;
    if (!path) return;
    void makeFacePatternMaterials(path).then((mats) => {
      const still = this.entries.get(id);
      if (!mats || still !== e || e.video || e.avatarUrl) return;
      setVoxelMaterial(e.mesh, mats);
    });
  }

  /** Repaint the cube for the current body theme / face pattern (no-op while a
   *  video or avatar owns the face). */
  private repaintBody(id: string): void {
    const e = this.entries.get(id);
    if (!e || e.video || e.avatarUrl) return;
    if (resolveCosmetic(e.equipped.facePattern)?.assetRef) {
      this.applyFacePattern(id);
      return;
    }
    setVoxelMaterial(e.mesh, makeColorMaterial(bodyColor(e.equipped, e.color)));
  }

  /** Apply a live equipped-cosmetics update (from the player_cosmetic packet). */
  setCosmetic(id: string, equipped: EquippedCosmetics): void {
    const e = this.entries.get(id);
    if (!e) {
      // Player is downed — update the stashed look so the revive keeps it.
      const look = this.retiredLooks.get(id);
      if (look) look.equipped = equipped ?? {};
      return;
    }
    e.equipped = equipped ?? {};
    this.updateHat(id);
    this.repaintBody(id);
    this.nameTags.set(id, e.name, e.equipped, e.mesh);
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
    else {
      const look = this.retiredLooks.get(id);
      if (look) look.avatarUrl = avatar;
    }
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
      setVoxelMaterial(e.mesh, mats);
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
        stream, e.video, Color3.FromHexString(e.color),
      );
      e.video = video;
      e.videoTex?.dispose();
      e.videoTex = tex;
      setVoxelMaterial(e.mesh, mats);
    } else {
      if (e.video) { e.video.srcObject = null; e.video = null; }
      e.videoTex?.dispose();
      e.videoTex = null;
      if (e.avatarUrl) { void this.applyAvatar(id, e.avatarUrl); return; }
      // Back to the cube: honour the equipped body theme / face pattern.
      this.repaintBody(id);
    }
  }

  /** Retire a downed player's live voxel. The visible corpse and its revive
   *  target are owned by the `Corpses` system, so we just remove the voxel
   *  here — otherwise the flattened voxel and the corpse marker overlap and
   *  render as two bodies inside each other. On revive the voxel is recreated
   *  via `remove` + `add` in the packet handler. */
  markDead(id: string, _x?: number, _z?: number): void {
    const e = this.entries.get(id);
    if (e) {
      this.retiredLooks.set(id, {
        avatarUrl: e.avatarUrl, equipped: e.equipped, name: e.name,
      });
    }
    this.remove(id);
  }

  /** The stashed look of a downed player, for the corpse to keep. */
  lastLook(id: string): RetiredLook | null {
    return this.retiredLooks.get(id) ?? null;
  }

  /** Toggle voxel visibility (hidden-in-closet players stay in the map
   *  but render nothing). */
  setVisible(id: string, visible: boolean): void {
    const e = this.entries.get(id);
    if (e) e.mesh.visible = visible;
    this.nameTags.setVisible(id, visible);
  }

  remove(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    if (e.hat) disposeHat(e.hat);
    this.group.remove(e.mesh);
    disposeVoxelMaterial(e.mesh);
    e.audio?.dispose();
    if (e.video) e.video.srcObject = null;
    e.videoTex?.dispose();
    this.entries.delete(id);
    this.nameTags.remove(id);
  }

  positions(): { x: number; z: number; color: string }[] {
    return [...this.entries.values()].map((e) => ({
      x: e.mesh.position.x, z: e.mesh.position.z, color: e.color,
    }));
  }
  ids(): string[] { return [...this.entries.keys()]; }
  getMesh(id: string): Mesh | null { return this.entries.get(id)?.mesh ?? null; }

  update(dt: number): void {
    const lerp = Math.min(1, dt * 12);
    for (const e of this.entries.values()) {
      Vector3.LerpToRef(e.mesh.position, e.target, lerp, e.mesh.position);
      e.mesh.rotation.y += (e.targetYaw - e.mesh.rotation.y) * lerp;
    }
    this.nameTags.update(
      this.camera.position, (id) => this.entries.get(id)?.mesh.position ?? null,
    );
  }
}
