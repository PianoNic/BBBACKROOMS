import * as THREE from "three";
import type { InputState } from "../core/input";
import type { World } from "../world/builder";
import type { Rect } from "../world/colliders";
import { circleHitsAny } from "../world/colliders";
import { getSettings } from "../core/settings";
import { playFootstep } from "../core/audio";
import { isStunned, speedMultiplier } from "../core/playerStatus";

const WALK_SPEED = 5.0;
const SPRINT_SPEED = 8.5;
const CROUCH_SPEED = 1.8;
const RADIUS = 0.4;
const EYE_HEIGHT = 1.7;
const PITCH_LIMIT = Math.PI / 2 - 0.05;
const BOB_FREQ = 2.5;
const BOB_AMOUNT = 0.02;

const SPRINT_FOV_BONUS = 15; // added to base FOV while sprinting
const FOV_LERP = 6;

const STAMINA_MAX = 1.0;
const STAMINA_DRAIN = 0.28; // per second while sprinting
const STAMINA_REGEN = 0.20; // per second while not sprinting
const STAMINA_MIN_TO_START = 0.15;

export class Player {
  yaw = 0;
  pitch = 0;
  readonly position = new THREE.Vector3();
  stamina = STAMINA_MAX;
  sprinting = false;
  crouching = false;
  private bobPhase = 0;
  private bobY = 0;
  private stepCooldown = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: InputState,
    private readonly world: World,
    private readonly propColliders: Rect[] = [],
  ) {}

  spawn(x: number, z: number, yaw: number): void {
    this.position.set(x, EYE_HEIGHT, z);
    this.yaw = yaw;
    this.pitch = 0;
    this.bobPhase = 0;
    this.bobY = 0;
    this.stamina = STAMINA_MAX;
    this.camera.fov = getSettings().fov;
    this.camera.updateProjectionMatrix();
    this.syncCamera();
  }

  update(dt: number): void {
    const m = this.input.consumeMouse();
    this.yaw += m.yaw;
    let pitch = this.pitch + m.pitch;

    // Arrow-key camera control: an alternative to the mouse, scaled by dt
    // so the turn speed feels the same regardless of framerate. Rate is
    // user-tunable in Settings (`arrowTurnRate`, rad/s).
    // Sign matches mouse: right → yaw decreases, up → pitch increases.
    const step = getSettings().arrowTurnRate * dt;
    if (this.input.keys.has("ArrowLeft"))  this.yaw += step;
    if (this.input.keys.has("ArrowRight")) this.yaw -= step;
    if (this.input.keys.has("ArrowUp"))    pitch += step;
    if (this.input.keys.has("ArrowDown"))  pitch -= step;
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));

    let fx = 0;
    let fz = 0;
    if (this.input.keys.has("KeyW")) fz -= 1;
    if (this.input.keys.has("KeyS")) fz += 1;
    if (this.input.keys.has("KeyA")) fx -= 1;
    if (this.input.keys.has("KeyD")) fx += 1;

    const moving = fx !== 0 || fz !== 0;
    this.crouching = this.input.keys.has("KeyC");
    const shift = this.input.keys.has("ShiftLeft") || this.input.keys.has("ShiftRight");
    const canSprint = this.sprinting ? this.stamina > 0 : this.stamina >= STAMINA_MIN_TO_START;
    this.sprinting = shift && moving && canSprint && !this.crouching;

    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN * dt);
    } else {
      this.stamina = Math.min(STAMINA_MAX, this.stamina + STAMINA_REGEN * dt);
    }

    let speed = this.crouching ? CROUCH_SPEED : this.sprinting ? SPRINT_SPEED : WALK_SPEED;
    speed *= speedMultiplier();
    if (isStunned()) speed = 0;
    let stepDist = 0;
    if (moving) {
      const len = Math.hypot(fx, fz);
      fx /= len;
      fz /= len;
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      const wx = fx * cos + fz * sin;
      const wz = -fx * sin + fz * cos;
      stepDist = speed * dt;
      this.moveAxis(wx * stepDist, 0);
      this.moveAxis(0, wz * stepDist);
    }

    if (stepDist > 0) {
      this.bobPhase += stepDist * BOB_FREQ;
      this.bobY = Math.sin(this.bobPhase) * BOB_AMOUNT;
      this.stepCooldown -= dt;
      if (this.stepCooldown <= 0) {
        const volume = this.crouching ? 0.18 : this.sprinting ? 1.0 : 0.7;
        playFootstep(volume);
        this.stepCooldown = this.crouching ? 0.85 : this.sprinting ? 0.34 : 0.5;
      }
    } else {
      this.bobPhase = 0;
      this.bobY *= 0.7;
      this.stepCooldown = 0;
    }

    const baseFov = getSettings().fov;
    const targetFov = this.sprinting ? baseFov + SPRINT_FOV_BONUS : baseFov;
    const next = this.camera.fov + (targetFov - this.camera.fov) * Math.min(1, dt * FOV_LERP);
    if (Math.abs(next - this.camera.fov) > 0.01) {
      this.camera.fov = next;
      this.camera.updateProjectionMatrix();
    }

    this.syncCamera();
  }

  private moveAxis(dx: number, dz: number): void {
    const nx = this.position.x + dx;
    const nz = this.position.z + dz;
    if (!this.collides(nx, this.position.z)) this.position.x = nx;
    if (!this.collides(this.position.x, nz)) this.position.z = nz;
  }

  private collides(x: number, z: number): boolean {
    const { cellSize } = this.world.grid;
    for (const ox of [-RADIUS, RADIUS]) {
      for (const oz of [-RADIUS, RADIUS]) {
        const cx = Math.floor((x + ox) / cellSize);
        const cy = Math.floor((z + oz) / cellSize);
        if (this.world.isWall(cx, cy)) return true;
      }
    }
    if (circleHitsAny(this.propColliders, x, z, RADIUS)) return true;
    return false;
  }

  private syncCamera(): void {
    this.camera.position.set(this.position.x, this.position.y + this.bobY, this.position.z);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }
}
