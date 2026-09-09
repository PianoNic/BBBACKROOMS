/** Geometry assembly for a classroom door. Builds the frame + hinged
 *  panel + wall fillers around the doorway. Owned by `doors.ts`; kept
 *  separate so the entry/collider bookkeeping is easier to read. */
import { Group, box, group, lambertMaterial, plane } from "../rendering/babylon";
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
export function buildFrameAndPanel(root: Group): Group {
  const frameMat = M(0x8a7a5a);
  const leftPost = box(FRAME_T, FRAME_TOP_Y, FRAME_T, frameMat);
  leftPost.position.set(-DOOR_W / 2 - FRAME_T / 2, FRAME_TOP_Y / 2, 0);
  root.add(leftPost);
  const rightPost = box(FRAME_T, FRAME_TOP_Y, FRAME_T, frameMat);
  rightPost.position.set(DOOR_W / 2 + FRAME_T / 2, FRAME_TOP_Y / 2, 0);
  root.add(rightPost);
  const top = box(DOOR_W + FRAME_T * 2, LINTEL_H, FRAME_T, frameMat);
  top.position.set(0, DOOR_H + LINTEL_H / 2, 0);
  root.add(top);

  // Hinge pivot on the LEFT edge of the doorway (local -x).
  const pivot = group("doorPivot");
  pivot.position.set(-DOOR_W / 2, 0, 0);
  const panel = box(DOOR_W, DOOR_H, DOOR_T, M(0xc09060));
  panel.position.set(DOOR_W / 2, DOOR_H / 2, 0);
  pivot.add(panel);
  // Inset detail (two recessed rectangles for a school-door look)
  const inset = M(0xa07040);
  for (let i = 0; i < 2; i++) {
    const r = box(DOOR_W * 0.7, DOOR_H * 0.35, DOOR_T * 0.4, inset);
    r.position.set(DOOR_W / 2, DOOR_H * 0.30 + i * DOOR_H * 0.40, DOOR_T * 0.55);
    pivot.add(r);
  }
  // Frosted glass window upper third
  const frostedMat = lambertMaterial(0xa8c8d8, "doorGlass");
  frostedMat.alpha = 0.35;
  const glass = plane(DOOR_W * 0.55, DOOR_H * 0.20, frostedMat);
  glass.position.set(DOOR_W / 2, DOOR_H * 0.78, DOOR_T * 0.55);
  pivot.add(glass);
  // Handle
  const handle = box(0.04, 0.04, 0.18, M(0xb8b8c0));
  handle.position.set(DOOR_W - 0.15, DOOR_H / 2, DOOR_T * 0.7);
  pivot.add(handle);

  root.add(pivot);
  return pivot;
}

/** Build the wall fillers (with tall side windows) and the header slab
 *  that sits above the door frame. */
export function buildFillers(root: Group): void {
  const fillerMat = materials.wall;
  const trimMat = M(0x8a7a5a);
  const glassMat = lambertMaterial(0xa8c8d8, "doorSidelightGlass");
  glassMat.alpha = 0.18;
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
    const topSlab = box(W, topH, CELL, fillerMat);
    topSlab.position.set(center, WIN_TOP + topH / 2, 0);
    root.add(topSlab);
    // Solid wall on either side of the glass — fills everything that isn't glass.
    const sideW = (W - winW) / 2;
    if (sideW > 0.005) {
      const leftSide = box(sideW, WIN_TOP - WIN_BOTTOM, CELL, fillerMat);
      leftSide.position.set(
        center - W / 2 + sideW / 2, WIN_BOTTOM + (WIN_TOP - WIN_BOTTOM) / 2, 0,
      );
      root.add(leftSide);
      const rightSide = box(sideW, WIN_TOP - WIN_BOTTOM, CELL, fillerMat);
      rightSide.position.set(
        center + W / 2 - sideW / 2, WIN_BOTTOM + (WIN_TOP - WIN_BOTTOM) / 2, 0,
      );
      root.add(rightSide);
    }
    // Glass pane flush with both wall faces.
    for (const zFace of [-CELL / 2 + 0.005, CELL / 2 - 0.005]) {
      const glass = plane(winW, WIN_H, glassMat);
      glass.position.set(center, WIN_BOTTOM + WIN_H / 2, zFace);
      if (zFace < 0) glass.rotation.y = Math.PI;
      root.add(glass);
      const tBot = box(W, trimT, trimT, trimMat);
      tBot.position.set(center, WIN_BOTTOM, zFace);
      root.add(tBot);
      const tTop = box(W, trimT, trimT, trimMat);
      tTop.position.set(center, WIN_TOP, zFace);
      root.add(tTop);
      const tLeft = box(trimT, WIN_H, trimT, trimMat);
      tLeft.position.set(center - W / 2 + trimT / 2, WIN_BOTTOM + WIN_H / 2, zFace);
      root.add(tLeft);
      const tRight = box(trimT, WIN_H, trimT, trimMat);
      tRight.position.set(center + W / 2 - trimT / 2, WIN_BOTTOM + WIN_H / 2, zFace);
      root.add(tRight);
    }
  }

  // Header strip above the door frame.
  const headerH = WALL_HEIGHT - FRAME_TOP_Y;
  const header = box(DOOR_W + FRAME_T * 2, headerH, CELL, fillerMat);
  header.position.set(0, WALL_HEIGHT - headerH / 2, 0);
  root.add(header);
}
