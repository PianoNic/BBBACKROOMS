/** Shared chair geometry/builder used by Chairs (world chairs +
 *  in-hand mesh + in-flight projectile). Geometry constants are reused
 *  across all chair instances so the static merger can collapse them. */
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Group, box, group } from "../rendering/babylon";
import { materials } from "../rendering/materials";
import { activeModelLibrary } from "../rendering/modelLoader";
import { normalizeModelTemplate } from "../world/modelPropStage";
import { MODEL_PROPS } from "../world/modelProps";

let chairTemplate: Mesh[] | null = null;

function getChairTemplate(): Mesh[] | null {
  if (chairTemplate) return chairTemplate;
  const container = activeModelLibrary()?.get("chair");
  const spec = MODEL_PROPS.chair;
  if (!container || !spec) return null;
  chairTemplate = normalizeModelTemplate(container, spec);
  for (const mesh of chairTemplate) mesh.setEnabled(false);
  return chairTemplate;
}

function buildModelChair(): Group | null {
  const template = getChairTemplate();
  if (!template || template.length === 0) return null;
  const g = group("chair");
  for (const mesh of template) {
    const clone = mesh.clone(mesh.name, null);
    clone.setEnabled(true);
    clone.isPickable = false;
    clone.alwaysSelectAsActiveMesh = true;
    g.add(clone);
  }
  return g;
}

export function buildChairMesh(): Group {
  const modelChair = buildModelChair();
  if (modelChair) return modelChair;

  const g = group("chair");
  const seat = box(0.5, 0.05, 0.5, materials.deskWood);
  seat.position.y = 0.4225;
  seat.alwaysSelectAsActiveMesh = true;
  g.add(seat);
  const back = box(0.5, 0.4, 0.04, materials.deskWood);
  back.position.set(0, 0.65, -0.23);
  back.alwaysSelectAsActiveMesh = true;
  g.add(back);
  for (const [dx, dz] of [
    [0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22],
  ] as const) {
    const leg = box(0.04, 0.4, 0.04, materials.deskLeg);
    leg.position.set(dx, 0.2, dz);
    leg.alwaysSelectAsActiveMesh = true;
    g.add(leg);
  }
  return g;
}
