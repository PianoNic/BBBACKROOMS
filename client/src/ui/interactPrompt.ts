import * as THREE from "three";
import { distanceSquaredXZ } from "../core/geom";

const MIN_DOT = 0.55;
const RANGE_PAD = 1.5;
const PROMPT_HEIGHT = 0.9;

const fwd = new THREE.Vector3();
const tmp = new THREE.Vector3();

export type InteractTarget = {
  x: number;
  z: number;
  radius: number;
  label: string;
  kind: "quest" | "laptop" | "chair" | "pickup" | "corpse" | "locker" | "door" | "toilet_stall" | "fuse_box_door" | "fuse_box_lever";
  chairId?: string;
  pickupId?: string;
  corpseId?: string;
  lockerId?: string;
  doorId?: string;
  stallId?: string;
  fuseBoxId?: string;
  leverIdx?: number;
  // Optional screen-projection anchor (e.g. the painting itself, so the [E]
  // label hovers on the prop instead of the wall behind the interact spot).
  anchorX?: number;
  anchorY?: number;
  anchorZ?: number;
};

export class InteractPrompt {
  current: InteractTarget | null = null;
  private readonly el: HTMLDivElement;
  private readonly label: HTMLSpanElement;

  constructor() {
    this.el = document.getElementById("interact-prompt") as HTMLDivElement;
    this.label = this.el.querySelector(".label") as HTMLSpanElement;
  }

  update(camera: THREE.PerspectiveCamera, player: THREE.Vector3, targets: InteractTarget[]): void {
    this.current = null;
    if (targets.length === 0) {
      this.hide();
      return;
    }
    camera.getWorldDirection(fwd);

    let bestScore = MIN_DOT;
    for (const t of targets) {
      const reach = t.radius * RANGE_PAD;
      const distSq = distanceSquaredXZ(t.x, t.z, player.x, player.z);
      if (distSq > reach * reach) continue;
      const dist = Math.sqrt(distSq) || 1;
      const dx = t.x - player.x;
      const dz = t.z - player.z;
      const dot = (fwd.x * dx + fwd.z * dz) / dist;
      if (dot > bestScore) {
        bestScore = dot;
        this.current = t;
      }
    }

    if (!this.current) {
      this.hide();
      return;
    }
    const ax = this.current.anchorX ?? this.current.x;
    const ay = this.current.anchorY ?? PROMPT_HEIGHT;
    const az = this.current.anchorZ ?? this.current.z;
    tmp.set(ax, ay, az);
    tmp.project(camera);
    if (tmp.z > 1) {
      this.hide();
      return;
    }
    const sx = ((tmp.x + 1) / 2) * window.innerWidth;
    const sy = ((-tmp.y + 1) / 2) * window.innerHeight;
    this.el.style.left = `${sx}px`;
    this.el.style.top = `${sy}px`;
    if (this.label.textContent !== this.current.label) this.label.textContent = this.current.label;
    this.el.classList.remove("hidden");
  }

  private hide(): void {
    this.el.classList.add("hidden");
    this.current = null;
  }
}
