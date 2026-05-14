import * as THREE from "three";

export const LAPTOP_BASE_GEOM = new THREE.BoxGeometry(0.36, 0.025, 0.26);
export const LAPTOP_SCREEN_BACK_GEOM = new THREE.BoxGeometry(0.36, 0.24, 0.015);
export const LAPTOP_SCREEN_FACE_GEOM = new THREE.PlaneGeometry(0.32, 0.20);
export const LAPTOP_BODY_MAT = new THREE.MeshLambertMaterial({ color: 0x1a1a1e });

export const LAPTOP_SCREEN_ACTIVE = 0x6ed8ff;
export const LAPTOP_SCREEN_DONE = 0x4ade80;

/** Build a laptop node plus the screen face material so callers can mutate its color. */
export function buildLaptopNode(initialColor: number): {
  node: THREE.Group;
  faceMat: THREE.MeshBasicMaterial;
} {
  const node = new THREE.Group();
  const base = new THREE.Mesh(LAPTOP_BASE_GEOM, LAPTOP_BODY_MAT);
  base.position.y = 0.75 + 0.012;
  node.add(base);
  const screen = new THREE.Mesh(LAPTOP_SCREEN_BACK_GEOM, LAPTOP_BODY_MAT);
  screen.position.set(0, 0.75 + 0.135, -0.125);
  screen.rotation.x = -0.18;
  node.add(screen);
  const faceMat = new THREE.MeshBasicMaterial({ color: initialColor });
  const face = new THREE.Mesh(LAPTOP_SCREEN_FACE_GEOM, faceMat);
  face.position.set(0, 0.75 + 0.135, -0.117);
  face.rotation.x = -0.18;
  node.add(face);
  return { node, faceMat };
}
