import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Group, StandardMaterial, box, group, M, basicMaterial, plane } from "../rendering/babylon";
import { activeModelLibrary } from "../rendering/modelLoader";
import { normalizeModelTemplate } from "../world/modelPropStage";
import { MODEL_PROPS } from "../world/modelProps";

export const laptopBodyMat = (): StandardMaterial => M(0x1a1a1e);

export const LAPTOP_SCREEN_ACTIVE = 0x6ed8ff;
export const LAPTOP_SCREEN_DONE = 0x4ade80;

let laptopTemplate: Mesh[] | null = null;

function getLaptopTemplate(): Mesh[] | null {
  if (laptopTemplate) return laptopTemplate;
  const container = activeModelLibrary()?.get("laptop");
  const spec = MODEL_PROPS.laptop;
  if (!container || !spec) return null;
  laptopTemplate = normalizeModelTemplate(container, spec);
  for (const mesh of laptopTemplate) mesh.setEnabled(false);
  return laptopTemplate;
}

function buildModelLaptopBody(): Group | null {
  const template = getLaptopTemplate();
  if (!template || template.length === 0) return null;
  const g = group("laptop");
  for (const mesh of template) {
    const clone = mesh.clone(mesh.name, null);
    clone.setEnabled(true);
    clone.isPickable = false;
    g.add(clone);
  }
  return g;
}

/** Build a laptop node plus the screen face material so callers can mutate its color. */
export function buildLaptopNode(initialColor: number): {
  node: Group;
  faceMat: StandardMaterial;
} {
  const modelBody = buildModelLaptopBody();
  const node = modelBody ?? group("laptop");
  if (!modelBody) {
    const base = box(0.36, 0.025, 0.26, laptopBodyMat());
    base.position.y = 0.75 + 0.012;
    node.add(base);
    const screen = box(0.36, 0.24, 0.015, laptopBodyMat());
    screen.position.set(0, 0.75 + 0.135, -0.125);
    screen.rotation.x = -0.18;
    node.add(screen);
  }
  const faceMat = basicMaterial(initialColor);
  const face = plane(0.32, 0.20, faceMat);
  face.position.set(0, 0.75 + 0.135, -0.117);
  face.rotation.x = -0.18;
  node.add(face);
  return { node, faceMat };
}
