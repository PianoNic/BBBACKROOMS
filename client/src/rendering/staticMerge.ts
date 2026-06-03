/** Collapse a static Three.js subtree into one merged mesh per material.
 *
 *  Without this, every prop's individual sub-meshes (a counter has ~10,
 *  a locker ~8, etc.) becomes its own draw call. With ~2000 props on a
 *  medium map that's ~20k draw calls per frame — vastly over WebGL's
 *  comfort zone. After merging the same scene reaches a few hundred.
 *
 *  Caveats:
 *  - Transparent or textured materials are passed through unchanged
 *    (depth sorting depends on per-mesh world matrices).
 *  - InstancedMesh is forwarded — it's already efficient on its own.
 *  - Caller is responsible for ensuring the subtree's matrices are up to
 *    date (the merger reads `mesh.matrixWorld`).
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";


export function mergeStaticMeshes(stage: THREE.Group): THREE.Group {
  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const passthrough: THREE.Mesh[] = [];
  stage.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if ((mesh as THREE.InstancedMesh).isInstancedMesh) return;
    const mat = mesh.material as THREE.Material;
    if (mat.transparent || (mat as THREE.MeshLambertMaterial).map) {
      passthrough.push(mesh);
      return;
    }
    const baked = mesh.geometry.clone();
    baked.applyMatrix4(mesh.matrixWorld);
    if (!byMaterial.has(mat)) byMaterial.set(mat, []);
    byMaterial.get(mat)!.push(baked);
  });
  const out = new THREE.Group();
  for (const [mat, geoms] of byMaterial) {
    if (geoms.length === 0) continue;
    const merged = mergeGeometries(geoms, false);
    if (!merged) {
      // mergeGeometries returns null when attribute sets differ; fall
      // back to individual meshes for that material group.
      for (const g of geoms) out.add(new THREE.Mesh(g, mat));
      continue;
    }
    const mesh = new THREE.Mesh(merged, mat);
    mesh.matrixAutoUpdate = false;
    mesh.matrixWorldAutoUpdate = false;
    mesh.frustumCulled = false;
    out.add(mesh);
  }
  stage.traverse((obj) => {
    if ((obj as THREE.InstancedMesh).isInstancedMesh) out.add(obj);
  });
  // Textured / transparent meshes are reparented directly onto `out`
  // with their world transform preserved. Reparenting via `attach`
  // recomputes the local matrix so the mesh stays at its world pose.
  // We avoid cloning so the original geometry's UVs and any per-mesh
  // material state are kept exactly as the builder created them.
  for (const mesh of passthrough) {
    out.attach(mesh);
  }
  out.matrixAutoUpdate = false;
  out.updateMatrixWorld(true);
  return out;
}
