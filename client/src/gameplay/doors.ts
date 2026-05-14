/** Classroom doors: hinged panels at room doorways. Interact with E to
 *  toggle. Server is authoritative — the client only animates and emits
 *  the toggle intent. Doors block movement when CLOSED; opening removes
 *  the panel collider. The wall fillers around the frame (top + sides)
 *  always block — without them every doorway is a 2m gap. */
import * as THREE from "three";
import type { DoorInfo } from "../net/protocol";
import type { InteractTarget } from "../ui/interactPrompt";
import { materials } from "../rendering/materials";
import { M } from "../world/propBuilders/_common";
import type { Rect } from "../world/colliders";

const REACH = 1.8;
const OPEN_ANGLE = Math.PI / 2 - 0.05; // just shy of 90° so the door peeks back
const OPEN_SPEED = 5.0;                 // rad/s

const DOOR_W = 1.30;   // panel width (door + hinge gap)
const DOOR_H = 2.10;   // panel reaches the lintel so there's no gap
const DOOR_T = 0.05;
const FRAME_T = 0.06;
const LINTEL_H = 0.10; // sits flush between the panel top and the header
const CELL = 2.0;             // matches builder.ts CELL_SIZE
const WALL_HEIGHT = 3;
// HALF-width of ONE filler (one each side of the doorway). The remaining
// wall length after subtracting the door + posts is split in two.
const FILLER_HALF_W = (CELL - (DOOR_W + FRAME_T * 2)) / 4;
const DOORWAY_X = DOOR_W / 2 + FRAME_T;                     // ~0.71m

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
    // `yaw` is the closed-state orientation; the panel + frame sit on the
    // wall axis. Open animation is then a child-pivot rotation that
    // swings the panel inward.
    root.rotation.y = d.yaw;

    // Frame: thin posts on either side + lintel. The wall geometry is
    // built elsewhere (the wall has a gap at the doorway cell), so the
    // frame here is what fills that gap visually.
    const FRAME_TOP_Y = DOOR_H + LINTEL_H;   // top of the whole door frame
    const post = new THREE.BoxGeometry(FRAME_T, FRAME_TOP_Y, FRAME_T);
    const lintel = new THREE.BoxGeometry(
      DOOR_W + FRAME_T * 2, LINTEL_H, FRAME_T,
    );
    const frameMat = M(0x8a7a5a);
    const leftPost = new THREE.Mesh(post, frameMat);
    leftPost.position.set(-DOOR_W / 2 - FRAME_T / 2, FRAME_TOP_Y / 2, 0);
    root.add(leftPost);
    const rightPost = new THREE.Mesh(post, frameMat);
    rightPost.position.set(DOOR_W / 2 + FRAME_T / 2, FRAME_TOP_Y / 2, 0);
    root.add(rightPost);
    const top = new THREE.Mesh(lintel, frameMat);
    top.position.set(0, DOOR_H + LINTEL_H / 2, 0);
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

    // Wall fillers around the doorway. Each side filler is split into a
    // bottom wall + top wall with a tall window gap in between; the gap
    // gets a transparent glass pane + wooden trim. Header fills the
    // remaining space above the lintel.
    const fillerMat = materials.wall;
    const trimMat = M(0x8a7a5a);
    const glassMat = new THREE.MeshBasicMaterial({
      color: 0xa8c8d8, transparent: true, opacity: 0.18,
    });
    const leftCenter = -(DOORWAY_X + FILLER_HALF_W);
    const rightCenter = DOORWAY_X + FILLER_HALF_W;
    const W = FILLER_HALF_W * 2;
    const WIN_BOTTOM = 0;
    const WIN_TOP = FRAME_TOP_Y;  // align with the door frame top (the lintel)
    const WIN_H = WIN_TOP - WIN_BOTTOM;
    const trimT = 0.04;

    // Narrow glass strip in each filler. The opaque wall around the glass
    // is provided by top + bottom slabs only (no extra side panels — they
    // ended up overlapping the glass visually at perspective angles).
    const winW = Math.min(W * 0.55, 0.18);
    for (const center of [leftCenter, rightCenter]) {
      if (WIN_BOTTOM > 0) {
        const bottom = new THREE.Mesh(
          new THREE.BoxGeometry(W, WIN_BOTTOM, CELL), fillerMat,
        );
        bottom.position.set(center, WIN_BOTTOM / 2, 0);
        root.add(bottom);
      }
      const topH = WALL_HEIGHT - WIN_TOP;
      const topSlab = new THREE.Mesh(
        new THREE.BoxGeometry(W, topH, CELL), fillerMat,
      );
      topSlab.position.set(center, WIN_TOP + topH / 2, 0);
      root.add(topSlab);
      // Solid wall slabs on either side of the glass — these stay fully
      // inside the door cell and fill everything that isn't glass.
      const sideW = (W - winW) / 2;
      if (sideW > 0.005) {
        const sideGeom = new THREE.BoxGeometry(
          sideW, WIN_TOP - WIN_BOTTOM, CELL,
        );
        const leftSide = new THREE.Mesh(sideGeom, fillerMat);
        leftSide.position.set(
          center - W / 2 + sideW / 2,
          WIN_BOTTOM + (WIN_TOP - WIN_BOTTOM) / 2,
          0,
        );
        root.add(leftSide);
        const rightSide = new THREE.Mesh(sideGeom, fillerMat);
        rightSide.position.set(
          center + W / 2 - sideW / 2,
          WIN_BOTTOM + (WIN_TOP - WIN_BOTTOM) / 2,
          0,
        );
        root.add(rightSide);
      }
      // Glass pane sits flush with the wall plane on both faces so the
      // window looks correct from either side of the door.
      for (const zFace of [-CELL / 2 + 0.005, CELL / 2 - 0.005]) {
        const glass = new THREE.Mesh(
          new THREE.PlaneGeometry(winW, WIN_H), glassMat,
        );
        glass.position.set(center, WIN_BOTTOM + WIN_H / 2, zFace);
        if (zFace < 0) glass.rotation.y = Math.PI;
        root.add(glass);
        // Wooden trim around the opening, one frame per face.
        const trimH = new THREE.BoxGeometry(W, trimT, trimT);
        const trimV = new THREE.BoxGeometry(trimT, WIN_H, trimT);
        const tBot = new THREE.Mesh(trimH, trimMat);
        tBot.position.set(center, WIN_BOTTOM, zFace);
        root.add(tBot);
        const tTop = new THREE.Mesh(trimH, trimMat);
        tTop.position.set(center, WIN_TOP, zFace);
        root.add(tTop);
        const tLeft = new THREE.Mesh(trimV, trimMat);
        tLeft.position.set(center - W / 2 + trimT / 2, WIN_BOTTOM + WIN_H / 2, zFace);
        root.add(tLeft);
        const tRight = new THREE.Mesh(trimV, trimMat);
        tRight.position.set(center + W / 2 - trimT / 2, WIN_BOTTOM + WIN_H / 2, zFace);
        root.add(tRight);
      }
    }

    const headerH = WALL_HEIGHT - FRAME_TOP_Y;
    const header = new THREE.Mesh(
      new THREE.BoxGeometry(DOOR_W + FRAME_T * 2, headerH, CELL),
      fillerMat,
    );
    header.position.set(0, WALL_HEIGHT - headerH / 2, 0);
    root.add(header);

    this.group.add(root);

    // Static colliders for the wall fillers (always blocking). Rotate the
    // local AABBs into world space according to the door's yaw — yaw is
    // always axis-aligned so a swap-and-sign is enough.
    const sideRects = this.rotateLocalRect(
      d.x, d.z, d.yaw,
      leftCenter - FILLER_HALF_W, -CELL / 2,
      leftCenter + FILLER_HALF_W, +CELL / 2,
    );
    this.colliders.push(sideRects);
    this.colliders.push(this.rotateLocalRect(
      d.x, d.z, d.yaw,
      rightCenter - FILLER_HALF_W, -CELL / 2,
      rightCenter + FILLER_HALF_W, +CELL / 2,
    ));
    // Panel collider — only registered when the door is closed so an
    // open door doesn't keep blocking the doorway.
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
    // Toggle the panel collider so an open door actually lets the
    // player through.
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
