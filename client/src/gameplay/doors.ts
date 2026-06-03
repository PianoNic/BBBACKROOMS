/** Classroom doors: hinged panels at room doorways. Interact with E to
 *  toggle. Server is authoritative — the client only animates and emits
 *  the toggle intent. Doors block movement when CLOSED; opening removes
 *  the panel collider. Geometry assembly lives in `doorBuilder.ts`. */
import * as THREE from "three";
import type { DoorInfo } from "../net/protocol";
import type { InteractTarget } from "../ui/interactPrompt";
import type { Rect } from "../world/colliders";
import {
  CELL, DOOR_T, DOOR_W, FILLER_HALF_W, DOORWAY_X,
  buildFillers, buildFrameAndPanel,
} from "./doorBuilder";

const REACH = 1.8;
const OPEN_ANGLE = Math.PI / 2 - 0.05; // just shy of 90°
const OPEN_SPEED = 5.0;                 // rad/s

type Entry = {
  info: DoorInfo;
  pivot: THREE.Group;
  isOpen: boolean;
  target: number;
  panelRect: Rect;
  panelRectIn: boolean;
};

export class Doors {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();
  private readonly colliders: Rect[];

  constructor(initial: DoorInfo[], colliders: Rect[]) {
    this.colliders = colliders;
    for (const d of initial) this.add(d);
  }

  private add(d: DoorInfo): void {
    const root = new THREE.Group();
    root.position.set(d.x, 0, d.z);
    root.rotation.y = d.yaw;

    const pivot = buildFrameAndPanel(root);
    buildFillers(root);
    this.group.add(root);

    // Static colliders for the wall fillers (always blocking).
    const leftCenter = -(DOORWAY_X + FILLER_HALF_W);
    const rightCenter = DOORWAY_X + FILLER_HALF_W;
    this.colliders.push(this.rotateLocalRect(
      d.x, d.z, d.yaw,
      leftCenter - FILLER_HALF_W, -CELL / 2,
      leftCenter + FILLER_HALF_W, +CELL / 2,
    ));
    this.colliders.push(this.rotateLocalRect(
      d.x, d.z, d.yaw,
      rightCenter - FILLER_HALF_W, -CELL / 2,
      rightCenter + FILLER_HALF_W, +CELL / 2,
    ));
    // Panel collider — only registered when the door is closed.
    const panelRect = this.rotateLocalRect(
      d.x, d.z, d.yaw,
      -DOOR_W / 2, -DOOR_T / 2, DOOR_W / 2, DOOR_T / 2,
    );

    const target = d.isOpen ? OPEN_ANGLE : 0;
    pivot.rotation.y = target;
    const entry: Entry = {
      info: d, pivot, isOpen: d.isOpen, target,
      panelRect, panelRectIn: false,
    };
    if (!d.isOpen) {
      this.colliders.push(panelRect);
      entry.panelRectIn = true;
    }
    this.entries.set(d.id, entry);
  }

  /** Convert a local-space AABB (door-aligned) into a world-space AABB.
   *  Doorway yaws are always cardinal so a swap-and-sign is exact. */
  private rotateLocalRect(
    cx: number, cz: number, yaw: number,
    lminX: number, lminZ: number, lmaxX: number, lmaxZ: number,
  ): Rect {
    const c = Math.round(Math.cos(yaw));
    const s = Math.round(Math.sin(yaw));
    const corners = [
      [lminX, lminZ], [lminX, lmaxZ], [lmaxX, lminZ], [lmaxX, lmaxZ],
    ];
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of corners) {
      const wx = cx + x * c + z * s;
      const wz = cz - x * s + z * c;
      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (wz < minZ) minZ = wz;
      if (wz > maxZ) maxZ = wz;
    }
    return { minX, minZ, maxX, maxZ };
  }

  setOpen(id: string, isOpen: boolean): void {
    const e = this.entries.get(id);
    if (!e) return;
    e.isOpen = isOpen;
    e.target = isOpen ? OPEN_ANGLE : 0;
    if (isOpen && e.panelRectIn) {
      const idx = this.colliders.indexOf(e.panelRect);
      if (idx >= 0) this.colliders.splice(idx, 1);
      e.panelRectIn = false;
    } else if (!isOpen && !e.panelRectIn) {
      this.colliders.push(e.panelRect);
      e.panelRectIn = true;
    }
  }

  update(dt: number): void {
    for (const e of this.entries.values()) {
      const cur = e.pivot.rotation.y;
      if (cur === e.target) continue;
      const step = OPEN_SPEED * dt;
      const diff = e.target - cur;
      const next = cur + Math.sign(diff) * Math.min(step, Math.abs(diff));
      e.pivot.rotation.y = next;
    }
  }

  getInteractTargets(): InteractTarget[] {
    const out: InteractTarget[] = [];
    for (const e of this.entries.values()) {
      out.push({
        x: e.info.x, z: e.info.z, radius: REACH,
        label: e.isOpen ? "close door" : "open door",
        kind: "door", doorId: e.info.id,
        anchorX: e.info.x, anchorY: 1.4, anchorZ: e.info.z,
      });
    }
    return out;
  }
}
