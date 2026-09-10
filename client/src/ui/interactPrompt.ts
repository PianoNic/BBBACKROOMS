import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Viewport } from "@babylonjs/core/Maths/math.viewport";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import { cameraForward } from "../rendering/babylon";
import { distanceSquaredXZ } from "../core/geom";
import { interactLabel, interactX, interactY } from "./hud/state";

const MIN_DOT = 0.55;
const RANGE_PAD = 1.5;
const PROMPT_HEIGHT = 0.9;

const fwd = new Vector3();
const tmp = new Vector3();

export type InteractTarget = {
  x: number;
  z: number;
  radius: number;
  label: string;
  kind: "quest" | "laptop" | "chair" | "pickup" | "corpse" | "locker" | "door" | "toilet_stall" | "fuse_box_door" | "fuse_box_lever" | "hide";
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

  update(
    camera: Camera, yaw: number, pitch: number,
    player: Vector3, targets: InteractTarget[],
  ): void {
    this.current = null;
    if (targets.length === 0) {
      this.hide();
      return;
    }
    cameraForward(yaw, pitch, fwd);

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
    const w = window.innerWidth;
    const h = window.innerHeight;
    const projected = Vector3.Project(
      tmp, Matrix.IdentityReadOnly,
      camera.getViewMatrix().multiply(camera.getProjectionMatrix()),
      new Viewport(0, 0, w, h),
    );
    if (projected.z > 1 || projected.z < 0) {
      this.hide();
      return;
    }
    interactX.value = projected.x;
    interactY.value = projected.y;
    if (interactLabel.value !== this.current.label) interactLabel.value = this.current.label;
  }

  private hide(): void {
    interactLabel.value = null;
    this.current = null;
  }
}
