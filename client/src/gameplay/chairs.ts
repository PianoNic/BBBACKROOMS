import * as THREE from "three";
import type { ChairInit, ChairStatePkt, ChairThrowStartPkt, ChairHitPkt } from "../net/protocol";
import type { NetClient } from "../net/client";
import type { RemotePlayers } from "./remotePlayers";
import type { InteractTarget } from "../ui/interactPrompt";
import { distanceSquaredXZ } from "../core/geom";
import { buildChairMesh } from "./chairMesh";

export { buildChairMesh };

const PICKUP_RADIUS = 1.8;
const THROW_LIFETIME_MS = 1600;

type Entry = {
  state: ChairInit;
  mesh: THREE.Group;       // world-position visual (hidden while held)
};

type Projectile = {
  id: string;
  chairId: string;
  startMs: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  mesh: THREE.Group;
  spinPhase: number;
};

export class Chairs {
  readonly group = new THREE.Group();
  private readonly chairs = new Map<string, Entry>();
  private readonly flights = new Map<string, Projectile>();
  private readonly heldMesh: THREE.Group;
  private heldChairId: string | null = null;
  private heldBob = 0;

  constructor(
    initial: ChairInit[],
    private readonly selfId: string,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly remotes: RemotePlayers,
  ) {
    for (const c of initial) {
      const mesh = buildChairMesh();
      this.applyMeshPose(mesh, c);
      mesh.visible = c.heldBy === null;
      this.group.add(mesh);
      this.chairs.set(c.id, { state: { ...c }, mesh });
    }
    // First-person held chair: parented to the camera, tucked at the bottom.
    this.heldMesh = buildChairMesh();
    this.heldMesh.position.set(0.35, -0.55, -0.55);
    this.heldMesh.rotation.y = Math.PI; // back of chair facing forward
    this.heldMesh.rotation.x = -0.2;
    this.heldMesh.visible = false;
    this.camera.add(this.heldMesh);
    // Carrier-side mesh for other players is rendered via the world mesh
    // floating at the player's position (cheap; no rig).
  }

  private applyMeshPose(mesh: THREE.Group, c: ChairInit): void {
    mesh.position.set(c.x, 0, c.z);
    mesh.rotation.y = c.yaw;
  }

  isHoldingChair(): boolean {
    return this.heldChairId !== null;
  }

  /** Nearest pickable chair (not held by anyone) within PICKUP_RADIUS. */
  nearestPickable(px: number, pz: number): string | null {
    if (this.heldChairId !== null) return null;
    let best: { id: string; d2: number } | null = null;
    const r2 = PICKUP_RADIUS * PICKUP_RADIUS;
    for (const [id, e] of this.chairs) {
      if (e.state.heldBy !== null) continue;
      const d2 = distanceSquaredXZ(e.state.x, e.state.z, px, pz);
      if (d2 <= r2 && (best === null || d2 < best.d2)) best = { id, d2 };
    }
    return best?.id ?? null;
  }

  applyState(p: ChairStatePkt): void {
    const e = this.chairs.get(p.chairId);
    if (!e) return;
    e.state.x = p.x;
    e.state.z = p.z;
    e.state.yaw = p.yaw;
    e.state.heldBy = p.heldBy;
    this.applyMeshPose(e.mesh, e.state);
    // Resting chair visible to everyone; held-by-self chair hidden (in-hand mesh
    // replaces it); held-by-other tracked in update() and shown at the carrier.
    e.mesh.visible = p.heldBy !== this.selfId;
    if (p.heldBy === this.selfId) {
      this.heldChairId = p.chairId;
      this.heldMesh.visible = true;
    } else if (this.heldChairId === p.chairId) {
      // Server released our chair (drop/throw/death).
      this.heldChairId = null;
      this.heldMesh.visible = false;
    }
  }

  applyThrowStart(p: ChairThrowStartPkt): void {
    const e = this.chairs.get(p.chairId);
    if (e) {
      // Hide the resting chair while it's in flight.
      e.mesh.visible = false;
    }
    if (p.ownerId === this.selfId && this.heldChairId === p.chairId) {
      this.heldChairId = null;
      this.heldMesh.visible = false;
    }
    const flightMesh = buildChairMesh();
    flightMesh.position.set(p.x, 0.9, p.z);
    this.group.add(flightMesh);
    this.flights.set(p.id, {
      id: p.id, chairId: p.chairId,
      startMs: performance.now(),
      x: p.x, z: p.z, vx: p.vx, vz: p.vz,
      mesh: flightMesh, spinPhase: 0,
    });
  }

  applyHit(p: ChairHitPkt): void {
    const f = this.flights.get(p.id);
    if (f) {
      this.group.remove(f.mesh);
      this.flights.delete(p.id);
    }
    // `chair_state` follows from the server to place the chair where it landed.
  }

  /** Local prediction of projectile flight between server updates. */
  update(dt: number, held: boolean): void {
    const now = performance.now();
    for (const f of this.flights.values()) {
      if (now - f.startMs > THROW_LIFETIME_MS + 250) {
        this.group.remove(f.mesh);
        this.flights.delete(f.id);
        continue;
      }
      f.x += f.vx * dt;
      f.z += f.vz * dt;
      f.spinPhase += dt * 14;
      f.mesh.position.set(f.x, 0.9, f.z);
      f.mesh.rotation.set(f.spinPhase, Math.atan2(f.vx, f.vz), 0);
    }
    if (held) {
      // Subtle bob so the chair feels carried.
      this.heldBob += dt * 4;
      this.heldMesh.position.y = -0.55 + Math.sin(this.heldBob) * 0.015;
    }
    // Reposition chairs carried by other players to their mesh.
    for (const e of this.chairs.values()) {
      const holder = e.state.heldBy;
      if (holder === null || holder === this.selfId) continue;
      const m = this.remotes.getMesh(holder);
      if (!m) continue;
      // Remote players face -Z at yaw=0, so their forward is (-sin, -cos).
      const fx = -Math.sin(m.rotation.y);
      const fz = -Math.cos(m.rotation.y);
      e.mesh.position.set(
        m.position.x + fx * 0.55,
        0.45,
        m.position.z + fz * 0.55,
      );
      // Chair model's back is at local -Z; rotate it so the back faces away
      // from the carrier (i.e. the seat is toward the carrier's chest).
      e.mesh.rotation.set(-0.2, m.rotation.y + Math.PI, 0);
    }
  }

  getInteractTargets(): InteractTarget[] {
    if (this.heldChairId !== null) return [];
    const out: InteractTarget[] = [];
    for (const [id, e] of this.chairs) {
      if (e.state.heldBy !== null) continue;
      out.push({
        x: e.state.x, z: e.state.z, radius: PICKUP_RADIUS,
        label: "pick up chair", kind: "chair", chairId: id, anchorY: 0.6,
      });
    }
    return out;
  }

  requestPickup(net: NetClient, chairId: string): void {
    net.send({ type: "chair_pickup", chairId });
  }
  requestThrow(net: NetClient, dirX: number, dirZ: number): void {
    if (this.heldChairId === null) return;
    net.send({ type: "chair_throw", dirX, dirZ });
  }
  requestDrop(net: NetClient): void {
    if (this.heldChairId === null) return;
    net.send({ type: "chair_drop" });
  }
}
