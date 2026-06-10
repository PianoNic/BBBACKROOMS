/** World pickups: spawn meshes for medkits / potions / compasses / etc.
 *  Mesh geometry lives in `pickupModels.ts`; this file just owns the
 *  per-pickup runtime state (bob/spin, interact targets, lifecycle). */
import * as THREE from "three";
import type { PickupInfo } from "../net/protocol";
import type { InteractTarget } from "../ui/interactPrompt";
import { buildPickupModel, pickupLabel } from "./pickupModels";

const Y = 0.45;
const PICKUP_RADIUS = 1.5;

type Entry = {
  info: PickupInfo;
  mesh: THREE.Object3D;
  bobSeed: number;
};

export { buildPickupModel } from "./pickupModels";

export class Pickups {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();

  constructor(initial: PickupInfo[]) {
    for (const p of initial) this.add(p);
  }

  add(p: PickupInfo): void {
    if (this.entries.has(p.id)) return;
    const mesh = buildPickupModel(p.kind);
    mesh.position.set(p.x, Y, p.z);
    this.group.add(mesh);
    this.entries.set(p.id, { info: p, mesh, bobSeed: Math.random() * 10 });
  }

  remove(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    this.group.remove(e.mesh);
    this.entries.delete(id);
  }

  update(elapsed: number): void {
    for (const e of this.entries.values()) {
      e.mesh.rotation.y = elapsed * 1.2 + e.bobSeed;
      e.mesh.position.y = Y + Math.sin(elapsed * 2 + e.bobSeed) * 0.06;
    }
  }

  /** World positions of every active pickup — used by the tracker item to
   *  paint dots on the minimap. */
  getMapPositions(): { x: number; z: number }[] {
    return [...this.entries.values()].map((e) => ({ x: e.info.x, z: e.info.z }));
  }

  getPosition(id: string): { x: number; z: number } | null {
    const e = this.entries.get(id);
    return e ? { x: e.info.x, z: e.info.z } : null;
  }

  getInteractTargets(): InteractTarget[] {
    const out: InteractTarget[] = [];
    for (const e of this.entries.values()) {
      out.push({
        x: e.info.x, z: e.info.z, radius: PICKUP_RADIUS,
        label: pickupLabel(e.info.kind),
        kind: "pickup", pickupId: e.info.id,
        anchorX: e.info.x, anchorY: Y, anchorZ: e.info.z,
      });
    }
    return out;
  }
}
