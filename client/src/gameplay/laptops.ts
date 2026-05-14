import * as THREE from "three";
import type { LaptopInfo } from "../net/protocol";
import type { InteractTarget } from "../ui/interactPrompt";
import { LAPTOP_INTERACT_RADIUS } from "../core/constants";
import { buildLaptopNode, LAPTOP_SCREEN_ACTIVE, LAPTOP_SCREEN_DONE } from "./laptopMesh";

type Entry = {
  info: LaptopInfo;
  faceMat: THREE.MeshBasicMaterial;
};

export class Laptops {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();

  constructor(list: LaptopInfo[]) {
    for (const l of list) {
      const { node, faceMat } = buildLaptopNode(
        l.done ? LAPTOP_SCREEN_DONE : LAPTOP_SCREEN_ACTIVE,
      );
      node.position.set(l.x, 0, l.z);
      node.rotation.y = l.yaw;
      this.group.add(node);
      this.entries.set(l.id, { info: { ...l }, faceMat });
    }
  }

  markDone(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    e.info.done = true;
    e.faceMat.color.setHex(LAPTOP_SCREEN_DONE);
  }

  getInteractTargets(): InteractTarget[] {
    const out: InteractTarget[] = [];
    for (const e of this.entries.values()) {
      if (e.info.done) continue;
      out.push({
        x: e.info.x,
        z: e.info.z,
        radius: LAPTOP_INTERACT_RADIUS,
        label: e.info.game,
        kind: "laptop",
      });
    }
    return out;
  }
}
