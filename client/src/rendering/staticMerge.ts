/** Collapse a static prop subtree into one merged mesh per material.
 *
 *  Without this, every prop's individual sub-meshes (a counter has ~10,
 *  a locker ~8, etc.) becomes its own draw call. With ~2000 props on a
 *  medium map that's ~20k draw calls per frame — vastly over WebGL's
 *  comfort zone. After merging the same scene reaches a few hundred.
 *
 *  Caveats:
 *  - Transparent or textured materials are passed through unchanged
 *    (depth sorting depends on per-mesh world matrices).
 *  - Thin-instance meshes are forwarded — already efficient on their own.
 *  - Caller is responsible for ensuring the subtree's matrices are up to
 *    date (the merger bakes world transforms into the merged geometry).
 */
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Material } from "@babylonjs/core/Materials/material";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { group, type Group } from "./babylon";

function isPassthrough(mat: Material | null): boolean {
  if (!mat) return true;
  if (mat.needAlphaBlending()) return true;
  const std = mat as StandardMaterial;
  if (std.diffuseTexture || std.opacityTexture || std.emissiveTexture) return true;
  const pbr = mat as unknown as { albedoTexture?: unknown };
  return !!pbr.albedoTexture;
}

export function mergeStaticMeshes(stage: TransformNode): Group {
  const byMaterial = new Map<Material, Mesh[]>();
  const passthrough: Mesh[] = [];
  const out = group("props");

  for (const node of stage.getDescendants(false)) {
    const mesh = node as Mesh;
    if (!(mesh instanceof Mesh)) continue;
    if (mesh.getTotalVertices() === 0) continue;
    if (mesh.thinInstanceCount > 0) continue;
    const mat = mesh.material;
    if (isPassthrough(mat)) {
      passthrough.push(mesh);
      continue;
    }
    const list = byMaterial.get(mat!);
    if (list) list.push(mesh);
    else byMaterial.set(mat!, [mesh]);
  }

  for (const [mat, meshes] of byMaterial) {
    for (const m of meshes) m.computeWorldMatrix(true);
    const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
    if (!merged) continue;
    merged.material = mat;
    merged.isPickable = false;
    merged.parent = out;
    merged.computeWorldMatrix(true);
    merged.freezeWorldMatrix();
    merged.receiveShadows = true;
  }

  // Textured / transparent meshes keep their own draw call. `setParent`
  // recomputes the local transform so the mesh stays at its world pose.
  for (const mesh of passthrough) {
    mesh.setParent(out);
    mesh.isPickable = false;
    mesh.computeWorldMatrix(true);
    mesh.freezeWorldMatrix();
    mesh.receiveShadows = true;
  }

  for (const node of stage.getDescendants(false)) {
    const mesh = node as Mesh;
    if (mesh instanceof Mesh && mesh.thinInstanceCount > 0) mesh.parent = out;
  }

  stage.dispose(false, false);
  return out;
}
