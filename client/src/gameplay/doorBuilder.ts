/** Geometry assembly for a classroom door. Builds the frame + hinged
 *  panel + wall fillers around the doorway. Owned by `doors.ts`; kept
 *  separate so the entry/collider bookkeeping is easier to read. */
import * as THREE from "three";
import { materials } from "../rendering/materials";
import { M } from "../world/propBuilders/_common";

export const DOOR_W = 1.30;
export const DOOR_H = 2.10;
export const DOOR_T = 0.05;
export const FRAME_T = 0.06;
export const LINTEL_H = 0.10;
export const CELL = 2.0;
export const WALL_HEIGHT = 3;
export const FRAME_TOP_Y = DOOR_H + LINTEL_H;
export const FILLER_HALF_W = (CELL - (DOOR_W + FRAME_T * 2)) / 4;
export const DOORWAY_X = DOOR_W / 2 + FRAME_T;

/** Build the frame (posts + lintel) and the hinged panel. Returns the
 *  pivot Group so the caller can rotate it for opening/closing. */
export function buildFrameAndPanel(root: THREE.Group): THREE.Group {
  const post = new THREE.BoxGeometry(FRAME_T, FRAME_TOP_Y, FRAME_T);
  const lintel = new THREE.BoxGeometry(DOOR_W + FRAME_T * 2, LINTEL_H, FRAME_T);
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

  // Hinge pivot on the LEFT edge of the doorway (local -x).
  const pivot = new THREE.Group();
  pivot.position.set(-DOOR_W / 2, 0, 0);
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_W, DOOR_H, DOOR_T), M(0xc09060),
  );
  panel.position.set(DOOR_W / 2, DOOR_H / 2, 0);
  pivot.add(panel);
  // Inset detail (two recessed rectangles for a school-door look)
  const inset = M(0xa07040);
  for (let i = 0; i < 2; i++) {
    const r = new THREE.Mesh(
      new THREE.BoxGeometry(DOOR_W * 0.7, DOOR_H * 0.35, DOOR_T * 0.4), inset,
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
  return pivot;
}

/** Build the wall fillers (with tall side windows) and the header slab
 *  that sits above the door frame. */
export function buildFillers(root: THREE.Group): void {
  const fillerMat = materials.wall;
  const trimMat = M(0x8a7a5a);
  const glassMat = new THREE.MeshBasicMaterial({
    color: 0xa8c8d8, transparent: true, opacity: 0.18,
  });
  const leftCenter = -(DOORWAY_X + FILLER_HALF_W);
  const rightCenter = DOORWAY_X + FILLER_HALF_W;
  const W = FILLER_HALF_W * 2;
  const WIN_BOTTOM = 0;
  const WIN_TOP = FRAME_TOP_Y;
  const WIN_H = WIN_TOP - WIN_BOTTOM;
  const trimT = 0.04;
  const winW = Math.min(W * 0.55, 0.18);

  for (const center of [leftCenter, rightCenter]) {
    const topH = WALL_HEIGHT - WIN_TOP;
    const topSlab = new THREE.Mesh(
      new THREE.BoxGeometry(W, topH, CELL), fillerMat,
    );
    topSlab.position.set(center, WIN_TOP + topH / 2, 0);
    root.add(topSlab);
    // Solid wall on either side of the glass — fills everything that isn't glass.
    const sideW = (W - winW) / 2;
    if (sideW > 0.005) {
      const sideGeom = new THREE.BoxGeometry(sideW, WIN_TOP - WIN_BOTTOM, CELL);
      const leftSide = new THREE.Mesh(sideGeom, fillerMat);
      leftSide.position.set(
        center - W / 2 + sideW / 2, WIN_BOTTOM + (WIN_TOP - WIN_BOTTOM) / 2, 0,
      );
      root.add(leftSide);
      const rightSide = new THREE.Mesh(sideGeom, fillerMat);
      rightSide.position.set(
        center + W / 2 - sideW / 2, WIN_BOTTOM + (WIN_TOP - WIN_BOTTOM) / 2, 0,
      );
      root.add(rightSide);
    }
    // Glass pane flush with both wall faces.
    for (const zFace of [-CELL / 2 + 0.005, CELL / 2 - 0.005]) {
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(winW, WIN_H), glassMat,
      );
      glass.position.set(center, WIN_BOTTOM + WIN_H / 2, zFace);
      if (zFace < 0) glass.rotation.y = Math.PI;
      root.add(glass);
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

  // Header strip above the door frame.
  const headerH = WALL_HEIGHT - FRAME_TOP_Y;
  const header = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_W + FRAME_T * 2, headerH, CELL), fillerMat,
  );
  header.position.set(0, WALL_HEIGHT - headerH / 2, 0);
  root.add(header);
}
