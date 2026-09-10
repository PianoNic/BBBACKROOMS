/** School lockers: wall-mounted containers players can open with E.
 *
 *  The server owns whether a locker hides an item — the client never knows
 *  until the locker is opened. Each locker has a door that swings open
 *  (~90° around its hinge) when opened. Closed lockers expose an interact
 *  target; opened lockers don't (re-opening is a no-op server-side). */
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LockerInfo } from "../net/protocol";
import type { InteractTarget } from "../ui/interactPrompt";
import { Group, box, group } from "../rendering/babylon";
import { materials } from "../rendering/materials";
import { activeModelLibrary } from "../rendering/modelLoader";
import { normalizeModelTemplate } from "../world/modelPropStage";
import { MODEL_PROPS } from "../world/modelProps";
import { ModelHinge } from "./modelHinge";

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

type Entry = {
  info: LockerInfo;
  opened: boolean;
  /** Target open fraction (0..1) — linearly chased by `update()`. */
  target: number;
  fraction: number;
  maxAngle: number;
  drive: (fraction: number) => void;
};

let lockerTemplate: Mesh[] | null = null;

function getLockerTemplate(): Mesh[] | null {
  if (lockerTemplate) return lockerTemplate;
  const container = activeModelLibrary()?.get("locker");
  const spec = MODEL_PROPS.locker;
  if (!container || !spec || !spec.hinge) return null;
  lockerTemplate = normalizeModelTemplate(container, spec);
  for (const mesh of lockerTemplate) mesh.setEnabled(false);
  return lockerTemplate;
}

export class Lockers {
  readonly group = group("lockers");
  private readonly entries = new Map<string, Entry>();

  constructor(initial: LockerInfo[]) {
    for (const lk of initial) this.add(lk);
  }

  private buildModelLocker(root: Group): { maxAngle: number; drive: (f: number) => void } | null {
    const template = getLockerTemplate();
    const spec = MODEL_PROPS.locker;
    if (!template || template.length === 0 || !spec?.hinge) return null;

    const clones = template.map((mesh) => {
      const clone = mesh.clone(mesh.name, null);
      clone.setEnabled(true);
      clone.isPickable = false;
      return clone;
    });

    const split = ModelHinge.split(clones, spec.hinge);
    const hinge = new ModelHinge(spec.hinge, split, root);
    for (const mesh of split.frame) {
      mesh.parent = root;
      mesh.isPickable = false;
    }
    return { maxAngle: spec.hinge.openRad, drive: (f) => hinge.setOpenFraction(f) };
  }

  private add(lk: LockerInfo): void {
    const root = group("locker");
    root.position.set(lk.x, 0, lk.z);
    root.rotation.y = lk.yaw;

    const modelLocker = this.buildModelLocker(root);
    if (modelLocker) {
      this.group.add(root);
      const opened = lk.opened;
      this.entries.set(lk.id, {
        info: lk, opened, target: opened ? 1 : 0, fraction: opened ? 1 : 0,
        maxAngle: modelLocker.maxAngle, drive: modelLocker.drive,
      });
      modelLocker.drive(opened ? 1 : 0);
      return;
    }

    // 5-sided shell — open on -Z. Each panel is `T` thick so when the door
    // swings out the player sees the (darker) interior, not a solid block.
    const back = box(W, H, T, materials.locker);
    back.position.set(0, H / 2, -T / 2);
    root.add(back);
    const left = box(T, H, D, materials.locker);
    left.position.set(-W / 2 + T / 2, H / 2, -D / 2);
    root.add(left);
    const right = box(T, H, D, materials.locker);
    right.position.set(W / 2 - T / 2, H / 2, -D / 2);
    root.add(right);
    const top = box(W, T, D, materials.locker);
    top.position.set(0, H - T / 2, -D / 2);
    root.add(top);
    const bottom = box(W, T, D, materials.locker);
    bottom.position.set(0, T / 2, -D / 2);
    root.add(bottom);

    // Interior dressing: dark backboard overlay + shelf at hat-height + hook.
    const innerBack = box(W - 2 * T, H - 2 * T, T * 0.5, materials.lockerInside);
    innerBack.position.set(0, H / 2, -T - T * 0.25);
    root.add(innerBack);
    const shelf = box(W - 2 * T, T, D - 2 * T, materials.lockerInside);
    shelf.position.set(0, H - 0.3, -D / 2);
    root.add(shelf);
    const hook = box(0.04, 0.04, 0.02, materials.lampPole);
    hook.position.set(0, H - 0.45, -0.06);
    root.add(hook);

    // Door hinges on the outer-left front edge. The pivot Group sits at the
    // hinge; the door + slats + handle are offset inside it so rotating the
    // pivot swings the whole assembly outward in one motion.
    const doorPivot = group("lockerDoorPivot");
    doorPivot.position.set(-W / 2, H / 2, -D);
    const door = box(W, H - 2 * T, T, materials.lockerDoor);
    door.position.set(W / 2, 0, -T / 2);
    doorPivot.add(door);
    // Four horizontal ventilation slats across the upper portion of the door.
    for (let i = 0; i < 4; i++) {
      const slat = box(0.28, 0.012, 0.005, materials.lampPole);
      slat.position.set(W / 2, 0.5 + i * 0.06, -T - 0.003);
      doorPivot.add(slat);
    }
    const handle = box(0.05, 0.12, 0.025, materials.lampPole);
    handle.position.set(W - 0.07, -0.1, -T - 0.013);
    doorPivot.add(handle);
    root.add(doorPivot);

    this.group.add(root);
    const opened = lk.opened;
    this.entries.set(lk.id, {
      info: lk, opened, target: opened ? 1 : 0, fraction: opened ? 1 : 0,
      maxAngle: OPEN_ANGLE, drive: (f) => { doorPivot.rotation.y = f * OPEN_ANGLE; },
    });
    if (opened) doorPivot.rotation.y = OPEN_ANGLE;
  }

  open(id: string): void {
    const e = this.entries.get(id);
    if (!e || e.opened) return;
    e.opened = true;
    e.target = 1;
  }

  update(dt: number): void {
    for (const e of this.entries.values()) {
      if (e.fraction === e.target) continue;
      const step = (OPEN_SPEED / e.maxAngle) * dt;
      e.fraction += Math.sign(e.target - e.fraction) * Math.min(step, Math.abs(e.target - e.fraction));
      e.drive(e.fraction);
    }
  }

  getPosition(id: string): { x: number; z: number } | null {
    const e = this.entries.get(id);
    return e ? { x: e.info.x, z: e.info.z } : null;
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
