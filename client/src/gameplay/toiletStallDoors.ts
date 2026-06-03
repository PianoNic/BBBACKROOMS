/** Interactive toilet-stall doors. Each `toilet_stall` prop gets one
 *  cabin door owned by this manager — kept outside the static-merge path
 *  so the pivot remains addressable for animation + click toggling.
 *
 *  State is client-local: opening a stall doesn't sync to other players.
 *  Initial pose is deterministic from the prop's xz so the same map
 *  renders identical mixes of open/closed stalls across clients. */
import * as THREE from "three";
import type { Prop } from "../net/protocol";
import type { InteractTarget } from "../ui/interactPrompt";
import { M, mulberry32, seedFromPos } from "../world/propBuilders/_common";

const OPEN_ANGLE = -Math.PI / 2.4;     // ~75° swing out toward the room
const OPEN_SPEED = 4.5;                 // rad/s
const HINGE_X = 0.455;                  // align with right side panel
const HINGE_Z = -0.5;                   // front edge of stall
const DOOR_Y = 1.05;
const DOOR_W = 0.85;
const DOOR_H = 1.5;
const REACH = 1.8;

const DOOR_GEOM = new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.04);
const INSET_GEOM = new THREE.BoxGeometry(0.65, 1.05, 0.04);
const LATCH_GEOM = new THREE.BoxGeometry(0.06, 0.04, 0.03);

type Entry = {
  id: string;
  x: number;
  z: number;
  yaw: number;
  pivot: THREE.Group;
  isOpen: boolean;
  target: number;
};

export class ToiletStallDoors {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();

  constructor(props: Prop[]) {
    let idx = 0;
    for (const p of props) {
      if (p.type !== "toilet_stall") continue;
      this.add(`tsd-${idx++}`, p);
    }
  }

  private add(id: string, p: Prop): void {
    const root = new THREE.Group();
    root.position.set(p.x, 0, p.z);
    root.rotation.y = p.yaw;
    // toilet_stall uses offsetFromWall(0.5), shifting the inner contents
    // by z=-0.5 in the prop's local frame. We mirror that shift here so
    // the door lines up with the stall shell.
    const inner = new THREE.Group();
    inner.position.z = -0.5;
    root.add(inner);

    const pivot = new THREE.Group();
    pivot.position.set(HINGE_X, DOOR_Y, HINGE_Z);

    const door = new THREE.Mesh(DOOR_GEOM, M(0xb8a070));
    door.position.set(-DOOR_W / 2, 0, 0);
    pivot.add(door);
    const inset = new THREE.Mesh(INSET_GEOM, M(0x8a7a50));
    inset.position.set(-DOOR_W / 2, 0, 0.001);
    pivot.add(inset);
    const latch = new THREE.Mesh(LATCH_GEOM, M(0xb8b8c0));
    latch.position.set(-DOOR_W + 0.07, 0, -0.03);
    pivot.add(latch);
    inner.add(pivot);

    // Deterministic initial open/closed from the prop's xz.
    const rand = mulberry32(seedFromPos(p.x, p.z, 71.3, 19.7));
    const isOpen = rand() < 0.45;
    pivot.rotation.y = isOpen ? OPEN_ANGLE : 0;

    this.group.add(root);
    this.entries.set(id, {
      id, x: p.x, z: p.z, yaw: p.yaw, pivot, isOpen,
      target: isOpen ? OPEN_ANGLE : 0,
    });
  }

  toggle(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    e.isOpen = !e.isOpen;
    e.target = e.isOpen ? OPEN_ANGLE : 0;
  }

  update(dt: number): void {
    for (const e of this.entries.values()) {
      const cur = e.pivot.rotation.y;
      if (cur === e.target) continue;
      const step = OPEN_SPEED * dt;
      const diff = e.target - cur;
      e.pivot.rotation.y = cur + Math.sign(diff) * Math.min(step, Math.abs(diff));
    }
  }

  getInteractTargets(): InteractTarget[] {
    const out: InteractTarget[] = [];
    for (const e of this.entries.values()) {
      out.push({
        x: e.x, z: e.z, radius: REACH,
        label: e.isOpen ? "close stall" : "open stall",
        kind: "toilet_stall", stallId: e.id,
        anchorX: e.x, anchorY: 1.4, anchorZ: e.z,
      });
    }
    return out;
  }
}
