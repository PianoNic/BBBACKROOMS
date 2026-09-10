/** Build all props from a WORLD_INIT payload.
 *
 *  Each prop type has a per-theme builder registered in `propsExtra.ts`.
 *  This file is just the dispatcher: look up the type, position it,
 *  collect the lot into one merged mesh per material per room region. */
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Prop, PropType } from "../net/protocol";
import { mergeStaticMeshes } from "../rendering/staticMerge";
import { Basic, group, type Group } from "../rendering/babylon";
import { registerGlowMesh } from "../rendering/pipeline";
import { EXTRA_BUILDERS } from "./propsExtra";
import type { Builder } from "./propBuilders/_common";

// `laptop` props are filtered server-side and rendered by the Laptops
// manager; `chair` (held / thrown) is handled by Chairs; `locker` is
// rendered by Lockers. Any other type without a builder is silently
// skipped (no-op for that prop).
const BUILDERS: Partial<Record<PropType, Builder>> =
  EXTRA_BUILDERS as Partial<Record<PropType, Builder>>;

export function buildProps(
  props: Prop[],
  regionOf: (prop: Prop) => number,
  skip: ReadonlySet<PropType>,
): { group: Group; regionMeshes: Map<number, Mesh[]> } {
  const byRegion = new Map<number, Prop[]>();
  for (const p of props) {
    if (skip.has(p.type)) continue;
    const regionId = regionOf(p);
    const list = byRegion.get(regionId);
    if (list) list.push(p);
    else byRegion.set(regionId, [p]);
  }

  const root = group("propsRoot");
  const regionMeshes = new Map<number, Mesh[]>();
  const exitFace = Basic(0x2bd14a);
  const exitArrow = Basic(0xf6f6f4);

  for (const [regionId, regionProps] of byRegion) {
    const stage = group(`propStage_r${regionId}`);
    for (const p of regionProps) {
      const obj = BUILDERS[p.type]?.(p);
      if (!obj) continue;
      obj.position.set(p.x, 0, p.z);
      obj.rotation.y = p.yaw;
      obj.parent = stage;
    }
    stage.computeWorldMatrix(true);
    // Collapse the per-prop sub-meshes into a few merged meshes per
    // material — without this we'd issue tens of thousands of draw calls
    // per frame. See `rendering/staticMerge.ts`.
    const merged = mergeStaticMeshes(stage);
    root.add(merged);
    const children = merged.getChildMeshes() as Mesh[];
    regionMeshes.set(regionId, children);
    for (const m of children) {
      if (m.material === exitFace || m.material === exitArrow) registerGlowMesh(m);
    }
  }

  return { group: root, regionMeshes };
}
