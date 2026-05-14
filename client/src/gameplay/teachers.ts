import * as THREE from "three";
import type { TeacherInfo } from "../net/protocol";
import { getSettings, onSettingsChange } from "../core/settings";
import { distanceSquaredXZ, withinRadiusXZ } from "../core/geom";

const SPRITE_HEIGHT = 1.9;
const SPRITE_WIDTH = 1.3;
const LERP = 0.18; // smoothing toward server target each frame
const STEP_DISTANCE = 1.0; // play a footstep every N meters of movement
const REF_DISTANCE = 2.5;  // distance at which audio is at full volume
const MAX_DISTANCE = 25;
const ROLLOFF = 1.8;
const FOOTSTEP_URLS = [1, 2, 3, 4, 5].map((i) => `/sounds/footsteps/step-${i}.ogg`);

type Entry = {
  sprite: THREE.Sprite;
  /** Through-wall thermal outline. Hidden by default; toggled on while the
   *  player's goggles are active. Renders ignoring depth so walls don't
   *  occlude it. */
  outline: THREE.Sprite;
  target: THREE.Vector2;
  audio: THREE.PositionalAudio | null;
  lastStepX: number;
  lastStepZ: number;
  silent: boolean; // silent_steps ability — never plays footsteps
  stunUntilMs: number;
};

export class Teachers {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();
  private readonly loader = new THREE.TextureLoader();
  private readonly listener: THREE.AudioListener;
  private readonly buffers: AudioBuffer[] = [];
  private buffersLoaded = false;

  constructor(list: TeacherInfo[], listener: THREE.AudioListener) {
    this.listener = listener;
    this.loadBuffers();
    for (const t of list) this.spawn(t);
    onSettingsChange((s) => {
      for (const e of this.entries.values()) {
        if (e.audio) e.audio.setVolume(s.sfxVolume);
      }
    });
  }

  private async loadBuffers(): Promise<void> {
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

  private spawn(t: TeacherInfo): void {
    const tex = this.loader.load(`/teachers/${t.image}`);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(SPRITE_WIDTH, SPRITE_HEIGHT, 1);
    sprite.position.set(t.x, SPRITE_HEIGHT / 2, t.z);
    this.group.add(sprite);

    // Through-wall thermal silhouette: same texture, but tinted hot-red,
    // depth-test disabled so walls never occlude it, and rendered after
    // the regular pass. Hidden until goggles toggle it on.
    const outlineMat = new THREE.SpriteMaterial({
      map: tex, transparent: true, depthTest: false,
      color: new THREE.Color(0xff3a3a), opacity: 0.85,
    });
    const outline = new THREE.Sprite(outlineMat);
    outline.scale.set(SPRITE_WIDTH, SPRITE_HEIGHT, 1);
    outline.position.set(t.x, SPRITE_HEIGHT / 2, t.z);
    outline.visible = false;
    outline.renderOrder = 999;
    this.group.add(outline);

    const audio = new THREE.PositionalAudio(this.listener);
    audio.setRefDistance(REF_DISTANCE);
    audio.setMaxDistance(MAX_DISTANCE);
    audio.setRolloffFactor(ROLLOFF);
    audio.setDistanceModel("inverse");
    audio.setVolume(getSettings().sfxVolume);
    sprite.add(audio);

    this.entries.set(t.id, {
      sprite, outline, audio,
      target: new THREE.Vector2(t.x, t.z),
      lastStepX: t.x, lastStepZ: t.z,
      silent: t.ability === "silent_steps",
      stunUntilMs: 0,
    });
  }

  /** Toggle thermal-outline visibility globally (driven by the local
   *  player's goggles state). */
  setOutlinesVisible(on: boolean): void {
    for (const e of this.entries.values()) e.outline.visible = on;
  }

  /** Current visual XZ positions — used by the GPS tracker to paint red
   *  dots on the minimap. */
  getMapPositions(): { x: number; z: number }[] {
    return [...this.entries.values()].map((e) => ({
      x: e.sprite.position.x, z: e.sprite.position.z,
    }));
  }

  setStun(id: string, ms: number): void {
    const e = this.entries.get(id);
    if (!e) return;
    e.stunUntilMs = performance.now() + ms;
  }

  setState(id: string, x: number, z: number): void {
    const e = this.entries.get(id);
    if (!e) return;
    e.target.set(x, z);
    if (!withinRadiusXZ(x, z, e.lastStepX, e.lastStepZ, STEP_DISTANCE)) {
      e.lastStepX = x;
      e.lastStepZ = z;
      this.playStep(e);
    }
  }

  private playStep(e: Entry): void {
    if (e.silent) return;
    if (!this.buffersLoaded || this.buffers.length === 0 || !e.audio) return;
    if (e.audio.isPlaying) e.audio.stop();
    const buf = this.buffers[Math.floor(Math.random() * this.buffers.length)];
    e.audio.setBuffer(buf);
    e.audio.setPlaybackRate(0.88 + Math.random() * 0.18);
    e.audio.play();
  }

  /** Minimum XZ distance from (x, z) to any *non-stunned* teacher's current
   *  visual position. Returns Infinity when no teachers exist or all are
   *  stunned — callers can use that to silence proximity effects. */
  nearestDistance(x: number, z: number): number {
    const now = performance.now();
    let best = Infinity;
    for (const e of this.entries.values()) {
      if (now < e.stunUntilMs) continue;
      const d2 = distanceSquaredXZ(e.sprite.position.x, e.sprite.position.z, x, z);
      if (d2 < best) best = d2;
    }
    return best === Infinity ? Infinity : Math.sqrt(best);
  }

  update(): void {
    const now = performance.now();
    for (const e of this.entries.values()) {
      e.sprite.position.x += (e.target.x - e.sprite.position.x) * LERP;
      e.sprite.position.z += (e.target.y - e.sprite.position.z) * LERP;
      e.outline.position.copy(e.sprite.position);
      const stunned = now < e.stunUntilMs;
      const mat = e.sprite.material as THREE.SpriteMaterial;
      if (stunned) {
        // Wobble + yellowish daze tint.
        const wob = Math.sin(now * 0.02) * 0.06;
        e.sprite.material.rotation = wob;
        mat.color.setRGB(1.4, 1.1, 0.5);
      } else if (mat.color.r !== 1 || mat.color.g !== 1 || mat.color.b !== 1) {
        e.sprite.material.rotation = 0;
        mat.color.setRGB(1, 1, 1);
      }
    }
  }
}
