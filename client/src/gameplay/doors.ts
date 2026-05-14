/** Classroom doors: hinged panels at room doorways. Interact with E to
 *  toggle. Server is authoritative — the client only animates and emits
 *  the toggle intent. Doors do not block movement (intentional). */
import * as THREE from "three";
import type { DoorInfo } from "../net/protocol";
import type { InteractTarget } from "../ui/interactPrompt";
import { M } from "../world/propBuilders/_common";

const REACH = 1.8;
const OPEN_ANGLE = Math.PI / 2 - 0.05; // just shy of 90° so the door peeks back
const OPEN_SPEED = 5.0;                 // rad/s

const DOOR_W = 1.05;   // panel width (door + hinge gap)
const DOOR_H = 2.05;
const DOOR_T = 0.05;
const FRAME_T = 0.06;

type Entry = {
  info: DoorInfo;
  pivot: THREE.Group;
  isOpen: boolean;
  target: number;
};

export class Doors {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();

  constructor(initial: DoorInfo[]) {
    for (const d of initial) this.add(d);
  }

  private add(d: DoorInfo): void {
    const root = new THREE.Group();
    root.position.set(d.x, 0, d.z);
    // `yaw` is the closed-state orientation; the panel + frame sit on the
    // wall axis. Open animation is then a child-pivot rotation that
    // swings the panel inward.
    root.rotation.y = d.yaw;

    // Frame: thin posts on either side + lintel. The wall geometry is
    // built elsewhere (the wall has a gap at the doorway cell), so the
    // frame here is what fills that gap visually.
    const post = new THREE.BoxGeometry(FRAME_T, DOOR_H + 0.10, FRAME_T);
    const lintel = new THREE.BoxGeometry(DOOR_W + FRAME_T * 2, FRAME_T, FRAME_T);
    const frameMat = M(0x8a7a5a);
    const leftPost = new THREE.Mesh(post, frameMat);
    leftPost.position.set(-DOOR_W / 2 - FRAME_T / 2, (DOOR_H + 0.10) / 2, 0);
    root.add(leftPost);
    const rightPost = new THREE.Mesh(post, frameMat);
    rightPost.position.set(DOOR_W / 2 + FRAME_T / 2, (DOOR_H + 0.10) / 2, 0);
    root.add(rightPost);
    const top = new THREE.Mesh(lintel, frameMat);
    top.position.set(0, DOOR_H + 0.05, 0);
    root.add(top);

    // Hinge pivot on the LEFT edge of the doorway (local -x). The door
    // panel is offset so its mesh sits centred in the doorway when closed.
    const pivot = new THREE.Group();
    pivot.position.set(-DOOR_W / 2, 0, 0);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(DOOR_W, DOOR_H, DOOR_T),
      M(0xc09060),
    );
    panel.position.set(DOOR_W / 2, DOOR_H / 2, 0);
    pivot.add(panel);
    // Inset panel detail (two recessed rectangles for a school-door look)
    const inset = M(0xa07040);
    for (let i = 0; i < 2; i++) {
      const r = new THREE.Mesh(
        new THREE.BoxGeometry(DOOR_W * 0.7, DOOR_H * 0.35, DOOR_T * 0.4),
        inset,
      );
      r.position.set(DOOR_W / 2, DOOR_H * 0.30 + i * DOOR_H * 0.40, DOOR_T * 0.55);
      pivot.add(r);
    }
    // Frosted glass window upper third
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(DOOR_W * 0.55, DOOR_H * 0.20),
      new THREE.MeshBasicMaterial({
        color: 0xa8c8d8, transparent: true, opacity: 0.35,
      }),
    );
    glass.position.set(DOOR_W / 2, DOOR_H * 0.78, DOOR_T * 0.55);
    pivot.add(glass);
    // Handle
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.18), M(0xb8b8c0),
    );
    handle.position.set(DOOR_W - 0.15, DOOR_H / 2, DOOR_T * 0.7);
    pivot.add(handle);

    root.add(pivot);
    this.group.add(root);

    const target = d.isOpen ? OPEN_ANGLE : 0;
    pivot.rotation.y = target;
    this.entries.set(d.id, { info: d, pivot, isOpen: d.isOpen, target });
  }

  setOpen(id: string, isOpen: boolean): void {
    const e = this.entries.get(id);
    if (!e) return;
    e.isOpen = isOpen;
    e.target = isOpen ? OPEN_ANGLE : 0;
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
