/** Shared helpers + cached materials for the per-theme item builders. */
import type { Material } from "@babylonjs/core/Materials/material";
import { CreateTube } from "@babylonjs/core/Meshes/Builders/tubeBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import {
  Mesh, activeScene,
  box as bxBox, cylinder as bxCylinder,
} from "../../rendering/babylon";

export { M } from "../../rendering/babylon";

export function box(
  w: number, h: number, d: number, mat: Material,
  x = 0, y = 0, z = 0,
): Mesh {
  const m = bxBox(w, h, d, mat);
  m.position.set(x, y, z);
  return m;
}

export function cyl(
  r: number, h: number, mat: Material,
  x = 0, y = 0, z = 0,
  segments = 16,
): Mesh {
  const m = bxCylinder(r, r, h, segments, mat);
  m.position.set(x, y, z);
  return m;
}

function halfTorusPath(radius: number, tubularSegments: number): Vector3[] {
  const pts: Vector3[] = [];
  for (let i = 0; i <= tubularSegments; i++) {
    const t = (i / tubularSegments) * Math.PI;
    pts.push(new Vector3(Math.cos(t) * radius, Math.sin(t) * radius, 0));
  }
  return pts;
}

export function halfTorus(
  radius: number, tube: number, radialSegments: number, tubularSegments: number,
  mat: Material, name = "halfTorus",
): Mesh {
  const mesh = CreateTube(name, {
    path: halfTorusPath(radius, tubularSegments),
    radius: tube, tessellation: radialSegments, cap: Mesh.NO_CAP,
  }, activeScene());
  mesh.material = mat;
  mesh.isPickable = false;
  return mesh;
}
