/** Build all props from a WORLD_INIT payload.
 *
 *  Each prop type has a per-theme builder registered in `propsExtra.ts`.
 *  This file is just the dispatcher: look up the type, position it,
 *  collect the lot into one big merged mesh per material for perf. */
import * as THREE from "three";
import type { Prop, PropType } from "../net/protocol";
import { mergeStaticMeshes } from "../rendering/staticMerge";
import { EXTRA_BUILDERS } from "./propsExtra";
import type { Builder } from "./propBuilders/_common";

// `laptop` props are filtered server-side and rendered by the Laptops
// manager; `chair` (held / thrown) is handled by Chairs; `locker` is
// rendered by Lockers. Any other type without a builder is silently
// skipped (no-op for that prop).
const BUILDERS: Partial<Record<PropType, Builder>> =
  EXTRA_BUILDERS as Partial<Record<PropType, Builder>>;


export function buildProps(props: Prop[]): THREE.Group {
  const stage = new THREE.Group();
  for (const p of props) {
    const obj = BUILDERS[p.type]?.(p);
    if (!obj) continue;
    obj.position.set(p.x, 0, p.z);
    obj.rotation.y = p.yaw;
    stage.add(obj);
  }
  stage.updateMatrixWorld(true);
  // Collapse the per-prop sub-meshes into a few merged meshes per
  // material — without this we'd issue tens of thousands of draw calls
  // per frame. See `rendering/staticMerge.ts`.
  return mergeStaticMeshes(stage);
}
