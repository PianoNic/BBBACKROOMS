/** Static AABB colliders derived from world props.
 *
 *  The grid only knows wall cells. Props that should block the player
 *  (currently just server racks) register an axis-aligned rectangle each;
 *  the player's collision check iterates these in addition to the grid. */
import type { Prop, PropType } from "../net/protocol";

/** Half-extents per prop type, in metres. Rotation is applied at build
 *  time so that racks mounted on a side wall block their actual footprint
 *  instead of the unrotated one. */
const HALF_EXTENTS: Partial<Record<PropType, { halfW: number; halfD: number }>> = {
  // Rack: 0.6m wide × 0.4m deep. Tight fit so the central aisle stays
  // walkable in even the smallest server rooms.
  server_rack: { halfW: 0.30, halfD: 0.20 },
};

export type Rect = {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
};

export function buildPropColliders(props: Prop[]): Rect[] {
  const out: Rect[] = [];
  for (const p of props) {
    const ext = HALF_EXTENTS[p.type];
    if (!ext) continue;
    // Rotate the half-extents into world space. Snap yaw to the nearest
    // 90° increment because every collider source so far is wall-aligned
    // and arbitrary OBBs would force a more expensive intersection.
    const c = Math.abs(Math.cos(p.yaw));
    const s = Math.abs(Math.sin(p.yaw));
    const hx = ext.halfW * c + ext.halfD * s;
    const hz = ext.halfW * s + ext.halfD * c;
    out.push({
      minX: p.x - hx, minZ: p.z - hz,
      maxX: p.x + hx, maxZ: p.z + hz,
    });
  }
  return out;
}

/** True if a circle of `radius` centred at (x, z) overlaps any rect. */
export function circleHitsAny(
  rects: Rect[], x: number, z: number, radius: number,
): boolean {
  for (const r of rects) {
    const cx = Math.max(r.minX, Math.min(x, r.maxX));
    const cz = Math.max(r.minZ, Math.min(z, r.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}
