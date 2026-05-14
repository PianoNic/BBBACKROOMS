import * as THREE from "three";
import type { RemotePlayers } from "./remotePlayers";
import { getSettings } from "../core/settings";

const FOLLOW_DIST = 4.5;
const HEIGHT_OFFSET = 1.1;     // camera offset above the target's center
const LOOK_HEIGHT = 1.0;
const BASE_MOUSE_SENS = 0.0025;
const MIN_PITCH = -1.2;
const MAX_PITCH = 0.6;

export class Spectator {
  active = false;
  private targetId: string | null = null;
  // Orbit angles around the followed teammate (mouse-controlled).
  private yaw = 0;
  private pitch = -0.25;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly remotes: RemotePlayers,
    private readonly selfId: string,
  ) {
    window.addEventListener("mousemove", this.onMouseMove);
  }

  activate(): void {
    if (this.active) return;
    this.active = true;
    this.cycle();
  }

  deactivate(): void {
    this.active = false;
    this.targetId = null;
  }

  cycle(): void {
    const ids = this.remotes.ids().filter((id) => id !== this.selfId);
    if (ids.length === 0) {
      this.targetId = null;
      return;
    }
    const idx = this.targetId ? ids.indexOf(this.targetId) : -1;
    this.targetId = ids[(idx + 1) % ids.length];
    // Start behind the new target.
    const m = this.remotes.getMesh(this.targetId);
    if (m) this.yaw = m.rotation.y;
  }

  currentTargetId(): string | null {
    return this.targetId;
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.active) return;
    if (document.pointerLockElement === null) return;
    const s = BASE_MOUSE_SENS * getSettings().mouseSensitivity;
    this.yaw -= e.movementX * s;
    this.pitch -= e.movementY * s;
    if (this.pitch < MIN_PITCH) this.pitch = MIN_PITCH;
    if (this.pitch > MAX_PITCH) this.pitch = MAX_PITCH;
  };

  update(): void {
    if (!this.active) return;
    if (!this.targetId || !this.remotes.getMesh(this.targetId)) {
      this.cycle();
    }
    const m = this.targetId ? this.remotes.getMesh(this.targetId) : null;
    if (!m) return; // no one to watch — leave camera where it is
    // Orbit position: behind the target along yaw, lifted by pitch.
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);
    const offX = Math.sin(this.yaw) * FOLLOW_DIST * cosP;
    const offZ = Math.cos(this.yaw) * FOLLOW_DIST * cosP;
    const offY = -sinP * FOLLOW_DIST + HEIGHT_OFFSET;
    this.camera.position.set(
      m.position.x + offX,
      m.position.y + offY,
      m.position.z + offZ,
    );
    this.camera.lookAt(m.position.x, m.position.y + LOOK_HEIGHT - 0.5, m.position.z);
  }
}
