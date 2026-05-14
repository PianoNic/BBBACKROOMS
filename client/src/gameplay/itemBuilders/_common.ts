/** Shared helpers + cached materials for the per-theme item builders. */
import * as THREE from "three";

export const M = (color: number): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color });

export function box(
  w: number, h: number, d: number, mat: THREE.Material,
  x = 0, y = 0, z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

export function cyl(
  r: number, h: number, mat: THREE.Material,
  x = 0, y = 0, z = 0,
  segments = 16,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), mat);
  m.position.set(x, y, z);
  return m;
}
