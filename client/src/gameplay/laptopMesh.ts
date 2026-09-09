import { Group, StandardMaterial, box, group, M, basicMaterial, plane } from "../rendering/babylon";
import { registerGlowMesh } from "../rendering/pipeline";

export const laptopBodyMat = (): StandardMaterial => M(0x1a1a1e);

export const LAPTOP_SCREEN_ACTIVE = 0x6ed8ff;
export const LAPTOP_SCREEN_DONE = 0x4ade80;

/** Build a laptop node plus the screen face material so callers can mutate its color. */
export function buildLaptopNode(initialColor: number): {
  node: Group;
  faceMat: StandardMaterial;
} {
  const node = group("laptop");
  const base = box(0.36, 0.025, 0.26, laptopBodyMat());
  base.position.y = 0.75 + 0.012;
  node.add(base);
  const screen = box(0.36, 0.24, 0.015, laptopBodyMat());
  screen.position.set(0, 0.75 + 0.135, -0.125);
  screen.rotation.x = -0.18;
  node.add(screen);
  const faceMat = basicMaterial(initialColor);
  const face = plane(0.32, 0.20, faceMat);
  face.position.set(0, 0.75 + 0.135, -0.117);
  face.rotation.x = -0.18;
  node.add(face);
  registerGlowMesh(face);
  return { node, faceMat };
}
