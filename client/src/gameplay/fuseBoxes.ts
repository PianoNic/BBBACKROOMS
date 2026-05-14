/** Interactive fuse boxes. Each `fuse_box` prop gets a hinged door + a
 *  grid of levers managed here, outside the static-merge path so the
 *  pivots stay addressable.
 *
 *  Gameplay loop:
 *    1. Approach a fuse box → "open fuse box" prompt.
 *    2. Press E → door swings open, revealing levers.
 *    3. Each lever exposes its own "flip lever" prompt.
 *    4. Flip ALL levers → manager fires the standard quest `interact`
 *       packet for the player, completing the fuse-box quest spot.
 *
 *  State is client-local — other players see all closed/down until they
 *  open the box themselves. Quest completion is the only thing synced. */
import * as THREE from "three";
import type { NetClient } from "../net/client";
import type { Prop } from "../net/protocol";
import type { InteractTarget } from "../ui/interactPrompt";
import { M } from "../world/propBuilders/_common";

const LEVER_ROWS = 2;
const LEVER_COLS = 3;
const LEVERS_PER_BOX = LEVER_ROWS * LEVER_COLS;
const DOOR_W = 0.50;
const DOOR_H = 0.62;
const DOOR_T = 0.025;
const DOOR_Y = 1.35;
const DOOR_OPEN_ANGLE = -Math.PI / 2 + 0.05;  // swing left, ~85°
const DOOR_OPEN_SPEED = 5.0;
const LEVER_FLIP_SPEED = 14.0;
const LEVER_DOWN = 0.45;                       // radians (lever tilted "off")
const LEVER_UP = -0.45;                        // lever tilted "on"
const REACH_DOOR = 1.8;
const REACH_LEVER = 1.6;

const DOOR_GEOM = new THREE.BoxGeometry(DOOR_W, DOOR_H, DOOR_T);
const DOOR_LABEL_GEOM = new THREE.BoxGeometry(DOOR_W * 0.7, 0.05, DOOR_T * 1.5);
const HANDLE_GEOM = new THREE.BoxGeometry(0.06, 0.04, 0.025);
const LEVER_BASE_GEOM = new THREE.BoxGeometry(0.07, 0.10, 0.02);
const LEVER_ARM_GEOM = new THREE.BoxGeometry(0.025, 0.10, 0.025);
const LEVER_KNOB_GEOM = new THREE.BoxGeometry(0.04, 0.04, 0.035);

type Lever = {
  pivot: THREE.Group;
  on: boolean;
  target: number;
  worldX: number;
  worldZ: number;
};

type Entry = {
  id: string;
  x: number;
  z: number;
  yaw: number;
  doorPivot: THREE.Group;
  doorOpen: boolean;
  doorTarget: number;
  levers: Lever[];
  questFired: boolean;     // we only fire one interact packet per box
};

export class FuseBoxes {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();

  constructor(props: Prop[]) {
    let idx = 0;
    for (const p of props) {
      if (p.type !== "fuse_box") continue;
      this.add(`fb-${idx++}`, p);
    }
  }

  private add(id: string, p: Prop): void {
    const root = new THREE.Group();
    root.position.set(p.x, 0, p.z);
    root.rotation.y = p.yaw;
    this.group.add(root);

    // Hinged door on the LEFT edge of the cover so opening reveals the
    // levers without protruding into the centre of the room. Hinge sits
    // at (x = -DOOR_W/2) so the door's panel pivots fully outward.
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-DOOR_W / 2, DOOR_Y, 0);
    const door = new THREE.Mesh(DOOR_GEOM, M(0xeeeee0));
    door.position.set(DOOR_W / 2, 0, -DOOR_T / 2);
    doorPivot.add(door);
    const label = new THREE.Mesh(DOOR_LABEL_GEOM, M(0xd03030));
    label.position.set(DOOR_W / 2, 0.18, -DOOR_T - 0.001);
    doorPivot.add(label);
    const handle = new THREE.Mesh(HANDLE_GEOM, M(0x303034));
    handle.position.set(DOOR_W - 0.08, 0, -DOOR_T - 0.014);
    doorPivot.add(handle);
    root.add(doorPivot);

    // Levers: 2 rows × 3 cols, hinged at their top so flipping rotates
    // the visible arm. Each lever needs its own world-space xz for the
    // interact-prompt range check (the prompt rotates the lever's local
    // offset into world coords using the box's yaw).
    const levers: Lever[] = [];
    const colX = [-0.16, 0, 0.16];
    const rowY = [DOOR_Y + 0.16, DOOR_Y - 0.10];
    const sinY = Math.sin(p.yaw);
    const cosY = Math.cos(p.yaw);
    for (let r = 0; r < LEVER_ROWS; r++) {
      for (let c = 0; c < LEVER_COLS; c++) {
        const lx = colX[c];
        const ly = rowY[r];
        const base = new THREE.Mesh(LEVER_BASE_GEOM, M(0x141416));
        base.position.set(lx, ly, -0.01);
        root.add(base);
        const pivot = new THREE.Group();
        pivot.position.set(lx, ly + 0.04, -0.02);
        pivot.rotation.x = LEVER_DOWN;
        const arm = new THREE.Mesh(LEVER_ARM_GEOM, M(0xb8b8c0));
        arm.position.set(0, -0.05, 0);
        pivot.add(arm);
        const knob = new THREE.Mesh(LEVER_KNOB_GEOM, M(0xd03030));
        knob.position.set(0, -0.11, 0);
        pivot.add(knob);
        root.add(pivot);
        // World-space xz for this lever (used by interact-prompt range).
        const wx = p.x + lx * cosY;
        const wz = p.z - lx * sinY;
        levers.push({
          pivot, on: false, target: LEVER_DOWN, worldX: wx, worldZ: wz,
        });
      }
    }

    this.entries.set(id, {
      id, x: p.x, z: p.z, yaw: p.yaw,
      doorPivot, doorOpen: false, doorTarget: 0,
      levers, questFired: false,
    });
  }

  toggleDoor(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    e.doorOpen = !e.doorOpen;
    e.doorTarget = e.doorOpen ? DOOR_OPEN_ANGLE : 0;
  }

  flipLever(id: string, leverIdx: number, net: NetClient): void {
    const e = this.entries.get(id);
    if (!e || !e.doorOpen) return;
    const lv = e.levers[leverIdx];
    if (!lv || lv.on) return;
    lv.on = true;
    lv.target = LEVER_UP;
    // When ALL levers are flipped, fire the standard quest-interact
    // packet — the server resolves the fuse-box quest spot by proximity
    // (we're standing right next to the box, well within its radius).
    if (!e.questFired && e.levers.every((l) => l.on)) {
      e.questFired = true;
      net.send({ type: "interact" });
    }
  }

  update(dt: number): void {
    for (const e of this.entries.values()) {
      const doorCur = e.doorPivot.rotation.y;
      if (doorCur !== e.doorTarget) {
        const step = DOOR_OPEN_SPEED * dt;
        const diff = e.doorTarget - doorCur;
        e.doorPivot.rotation.y =
          doorCur + Math.sign(diff) * Math.min(step, Math.abs(diff));
      }
      for (const lv of e.levers) {
        const cur = lv.pivot.rotation.x;
        if (cur === lv.target) continue;
        const step = LEVER_FLIP_SPEED * dt;
        const diff = lv.target - cur;
        lv.pivot.rotation.x =
          cur + Math.sign(diff) * Math.min(step, Math.abs(diff));
      }
    }
  }

  getInteractTargets(): InteractTarget[] {
    const out: InteractTarget[] = [];
    for (const e of this.entries.values()) {
      if (!e.doorOpen) {
        out.push({
          x: e.x, z: e.z, radius: REACH_DOOR,
          label: "open fuse box",
          kind: "fuse_box_door", fuseBoxId: e.id,
          anchorX: e.x, anchorY: 1.4, anchorZ: e.z,
        });
      } else {
        for (let i = 0; i < e.levers.length; i++) {
          const lv = e.levers[i];
          if (lv.on) continue;
          out.push({
            x: lv.worldX, z: lv.worldZ, radius: REACH_LEVER,
            label: "flip lever",
            kind: "fuse_box_lever", fuseBoxId: e.id, leverIdx: i,
            anchorX: lv.worldX, anchorY: 1.4, anchorZ: lv.worldZ,
          });
        }
      }
    }
    return out;
  }
}
