/** School lockers: wall-mounted containers players can open with E.
 *
 *  The server owns whether a locker hides an item — the client never knows
 *  until the locker is opened. Each locker has a door that swings open
 *  (~90° around its hinge) when opened. Closed lockers expose an interact
 *  target; opened lockers don't (re-opening is a no-op server-side). */
import * as THREE from "three";
import type { LockerInfo } from "../net/protocol";
import type { InteractTarget } from "../ui/interactPrompt";
import { materials } from "../rendering/materials";

const OPEN_RADIUS = 1.8;
const OPEN_ANGLE = Math.PI / 2;     // 90° swing
const OPEN_SPEED = 6.0;             // rad/s — fast enough to feel snappy

// Outer extents — width 0.5, height 1.8, depth 0.4. Origin sits on the wall
// (z=0) and the door faces -Z into the room. Wall panels are 0.02 thick so
// the cavity inside is visible when the door swings open.
const T = 0.02;                     // panel thickness
const W = 0.5;
const H = 1.8;
const D = 0.4;

const BACK = new THREE.BoxGeometry(W, H, T);
const SIDE = new THREE.BoxGeometry(T, H, D);
const CAP = new THREE.BoxGeometry(W, T, D);
const INNER_BACK = new THREE.BoxGeometry(W - 2 * T, H - 2 * T, T * 0.5);
const SHELF = new THREE.BoxGeometry(W - 2 * T, T, D - 2 * T);
const DOOR = new THREE.BoxGeometry(W, H - 2 * T, T);
const VENT = new THREE.BoxGeometry(0.28, 0.012, 0.005);
const HANDLE_BAR = new THREE.BoxGeometry(0.05, 0.12, 0.025);
const HOOK = new THREE.BoxGeometry(0.04, 0.04, 0.02);

type Entry = {
  info: LockerInfo;
  doorPivot: THREE.Group;
  opened: boolean;
  /** Target angle for the door — linearly chased by `update()`. */
  target: number;
};

export class Lockers {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();

  constructor(initial: LockerInfo[]) {
    for (const lk of initial) this.add(lk);
  }

  private add(lk: LockerInfo): void {
    const root = new THREE.Group();
    root.position.set(lk.x, 0, lk.z);
    root.rotation.y = lk.yaw;

    // 5-sided shell — open on -Z. Each panel is `T` thick so when the door
    // swings out the player sees the (darker) interior, not a solid block.
    const back = new THREE.Mesh(BACK, materials.locker);
    back.position.set(0, H / 2, -T / 2);
    root.add(back);
    const left = new THREE.Mesh(SIDE, materials.locker);
    left.position.set(-W / 2 + T / 2, H / 2, -D / 2);
    root.add(left);
    const right = new THREE.Mesh(SIDE, materials.locker);
    right.position.set(W / 2 - T / 2, H / 2, -D / 2);
    root.add(right);
    const top = new THREE.Mesh(CAP, materials.locker);
    top.position.set(0, H - T / 2, -D / 2);
    root.add(top);
    const bottom = new THREE.Mesh(CAP, materials.locker);
    bottom.position.set(0, T / 2, -D / 2);
    root.add(bottom);

    // Interior dressing: dark backboard overlay + shelf at hat-height + hook.
    const innerBack = new THREE.Mesh(INNER_BACK, materials.lockerInside);
    innerBack.position.set(0, H / 2, -T - T * 0.25);
    root.add(innerBack);
    const shelf = new THREE.Mesh(SHELF, materials.lockerInside);
    shelf.position.set(0, H - 0.3, -D / 2);
    root.add(shelf);
    const hook = new THREE.Mesh(HOOK, materials.lampPole);
    hook.position.set(0, H - 0.45, -0.06);
    root.add(hook);

    // Door hinges on the outer-left front edge. The pivot Group sits at the
    // hinge; the door + slats + handle are offset inside it so rotating the
    // pivot swings the whole assembly outward in one motion.
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-W / 2, H / 2, -D);
    const door = new THREE.Mesh(DOOR, materials.lockerDoor);
    door.position.set(W / 2, 0, -T / 2);
    doorPivot.add(door);
    // Four horizontal ventilation slats across the upper portion of the door.
    for (let i = 0; i < 4; i++) {
      const slat = new THREE.Mesh(VENT, materials.lampPole);
      slat.position.set(W / 2, 0.5 + i * 0.06, -T - 0.003);
      doorPivot.add(slat);
    }
    const handle = new THREE.Mesh(HANDLE_BAR, materials.lampPole);
    handle.position.set(W - 0.07, -0.1, -T - 0.013);
    doorPivot.add(handle);
    root.add(doorPivot);

    this.group.add(root);
    const opened = lk.opened;
    this.entries.set(lk.id, {
      info: lk, doorPivot, opened, target: opened ? OPEN_ANGLE : 0,
    });
    if (opened) doorPivot.rotation.y = OPEN_ANGLE;
  }

  open(id: string): void {
    const e = this.entries.get(id);
    if (!e || e.opened) return;
    e.opened = true;
    e.target = OPEN_ANGLE;
  }

  update(dt: number): void {
    for (const e of this.entries.values()) {
      const cur = e.doorPivot.rotation.y;
      if (cur === e.target) continue;
      const step = OPEN_SPEED * dt;
      const next = cur + Math.sign(e.target - cur) * Math.min(step, Math.abs(e.target - cur));
      e.doorPivot.rotation.y = next;
    }
  }

  getInteractTargets(): InteractTarget[] {
    const out: InteractTarget[] = [];
    for (const e of this.entries.values()) {
      if (e.opened) continue;
      out.push({
        x: e.info.x, z: e.info.z, radius: OPEN_RADIUS,
        label: "open locker", kind: "locker", lockerId: e.info.id,
        anchorX: e.info.x, anchorY: 1.2, anchorZ: e.info.z,
      });
    }
    return out;
  }
}
