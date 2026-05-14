/** Tiny XZ-plane geometry helpers, mirroring server/app/world/geom.py.
 *
 *  Use these instead of inlining `dx*dx + dz*dz` — they read like sentences
 *  ("are these two within radius?") and remove the chance of forgetting to
 *  square the radius. */

export type XZ = { x: number; z: number };

export function distanceSquared(a: XZ, b: XZ): number {
  return (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
}

export function distanceSquaredXZ(
  ax: number, az: number, bx: number, bz: number,
): number {
  return (ax - bx) ** 2 + (az - bz) ** 2;
}

export function withinRadius(a: XZ, b: XZ, radius: number): boolean {
  return distanceSquared(a, b) <= radius * radius;
}

export function withinRadiusXZ(
  ax: number, az: number, bx: number, bz: number, radius: number,
): boolean {
  return distanceSquaredXZ(ax, az, bx, bz) <= radius * radius;
}
