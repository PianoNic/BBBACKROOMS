import * as THREE from "three";
import type { RemotePlayer } from "../net/protocol";
import { getSettings, onSettingsChange } from "../core/settings";
import { withinRadiusXZ } from "../core/geom";

const BOX = new THREE.BoxGeometry(0.6, 1.7, 0.6);
const Y = 0.85;
const STEP_DISTANCE = 1.1;
const REF_DISTANCE = 2.5;
const MAX_DISTANCE = 25;
const ROLLOFF = 1.8;
const FOOTSTEP_URLS = [1, 2, 3, 4, 5].map((i) => `/sounds/footsteps/step-${i}.ogg`);
// BoxGeometry face groups: 0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z, 5=-Z.
// A player facing yaw=0 walks toward -Z, so others see their -Z face → put avatar there.
const FRONT_FACE = 5;

type Entry = {
  mesh: THREE.Mesh;
  color: string;
  target: THREE.Vector3;
  targetYaw: number;
  audio: THREE.PositionalAudio | null;
  lastStepX: number;
  lastStepZ: number;
  /** Static avatar bytes — kept so we can revert when video stream ends. */
  avatarUrl: string | null;
  /** Live cam video element + texture, if a stream is wired. */
  video: HTMLVideoElement | null;
  videoTex: THREE.VideoTexture | null;
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

function sampleCorner(img: HTMLImageElement): THREE.Color {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const cx = c.getContext("2d")!;
  cx.drawImage(img, img.width - 1, img.height - 1, 1, 1, 0, 0, 1, 1);
  const [r, g, b] = cx.getImageData(0, 0, 1, 1).data;
  return new THREE.Color(r / 255, g / 255, b / 255);
}

function makeColorMaterial(color: THREE.ColorRepresentation): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) });
}

/** Box with `front` material on the player-facing face and `sideColor` on the
 *  other five faces. Shared by static avatar and live webcam paths. */
function makeFaceMaterials(
  front: THREE.MeshLambertMaterial, sideColor: THREE.Color,
): THREE.MeshLambertMaterial[] {
  const side = () => new THREE.MeshLambertMaterial({ color: sideColor });
  const mats: THREE.MeshLambertMaterial[] = [side(), side(), side(), side(), side(), side()];
  mats[FRONT_FACE] = front;
  return mats;
}

async function makeAvatarMaterials(dataUrl: string): Promise<THREE.MeshLambertMaterial[]> {
  const img = await loadImage(dataUrl);
  const tex = new THREE.Texture(img);
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return makeFaceMaterials(
    new THREE.MeshLambertMaterial({ map: tex }), sampleCorner(img),
  );
}

function disposeMaterial(m: THREE.Material | THREE.Material[]): void {
  const list = Array.isArray(m) ? m : [m];
  for (const x of list) {
    (x as THREE.MeshLambertMaterial).map?.dispose();
    x.dispose();
  }
}

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
        const data = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(data);
        this.buffers.push(buf);
      } catch {
        // skip missing
      }
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
      mesh,
      color: p.color,
      target: new THREE.Vector3(p.x, Y, p.z),
      targetYaw: p.yaw,
      audio,
      lastStepX: p.x,
      lastStepZ: p.z,
      avatarUrl: p.avatar ?? null,
      video: null,
      videoTex: null,
    });
    if (p.avatar) this.applyAvatar(p.id, p.avatar);
  }

  setState(id: string, x: number, z: number, yaw: number): void {
    const e = this.entries.get(id);
    if (!e) return;
    e.target.set(x, Y, z);
    e.targetYaw = yaw;
    // Trigger a footstep sample when the remote has actually walked
    // a full stride — avoids stuttery sub-step retriggers from network jitter.
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
    // If a live cam is showing, leave it — it takes precedence.
    if (e?.video) return;
    this.applyAvatar(id, avatar);
  }

  private async applyAvatar(id: string, avatar: string): Promise<void> {
    const e = this.entries.get(id);
    if (!e) return;
    try {
      const mats = await makeAvatarMaterials(avatar);
      const still = this.entries.get(id);
      if (still !== e || e.video) return;  // video took over while we loaded
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
      let video = e.video;
      if (!video) {
        video = document.createElement("video");
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        e.video = video;
      }
      video.srcObject = stream;
      video.play().catch(() => { /* user gesture not required, autoplay-muted */ });
      const tex = new THREE.VideoTexture(video);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      const mats = makeFaceMaterials(
        new THREE.MeshLambertMaterial({ map: tex }), new THREE.Color(e.color),
      );
      const old = e.mesh.material;
      e.mesh.material = mats;
      e.videoTex?.dispose();
      e.videoTex = tex;
      disposeMaterial(old);
    } else {
      if (e.video) {
        e.video.srcObject = null;
        e.video = null;
      }
      e.videoTex?.dispose();
      e.videoTex = null;
      if (e.avatarUrl) {
        void this.applyAvatar(id, e.avatarUrl);
      } else {
        const old = e.mesh.material;
        e.mesh.material = makeColorMaterial(e.color);
        disposeMaterial(old);
      }
    }
  }

  /** Lay the player's voxel flat on the ground as a corpse — stops updating. */
  markDead(id: string, x?: number, z?: number): void {
    const e = this.entries.get(id);
    if (!e) return;
    if (x !== undefined && z !== undefined) {
      e.mesh.position.set(x, Y, z);
      e.target.set(x, Y, z);
    }
    // Tip the voxel onto its side and sink it to the floor.
    e.mesh.rotation.x = Math.PI / 2;
    e.mesh.position.y = 0.3;
    e.target.y = 0.3;
    this.entries.delete(id); // stop updating its transform
    e.mesh.userData.dead = true;
    // Keep the mesh in the group as the corpse.
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
      x: e.mesh.position.x,
      z: e.mesh.position.z,
      color: e.color,
    }));
  }

  ids(): string[] {
    return [...this.entries.keys()];
  }

  getMesh(id: string): THREE.Mesh | null {
    return this.entries.get(id)?.mesh ?? null;
  }

  update(dt: number): void {
    const lerp = Math.min(1, dt * 12);
    for (const e of this.entries.values()) {
      e.mesh.position.lerp(e.target, lerp);
      e.mesh.rotation.y += (e.targetYaw - e.mesh.rotation.y) * lerp;
    }
  }
}
