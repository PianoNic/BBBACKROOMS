import "@babylonjs/core/Meshes/thinInstanceMesh";
import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Prop, PropType } from "../net/protocol";
import type { ModelLibrary } from "../rendering/modelLoader";
import { group, type Group } from "../rendering/babylon";
import { ModelMaterialFactory } from "../rendering/modelMaterials";
import { MANAGER_OWNED_TYPES, MODEL_PROPS, type ModelPropSpec } from "./modelProps";

const modelMaterials = new ModelMaterialFactory();

export function normalizeModelTemplate(
  container: AssetContainer,
  spec: ModelPropSpec,
  deferCompile = false,
): Mesh[] {
  container.addAllToScene();
  const meshes = container.meshes.filter(
    (m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0,
  );
  if (meshes.length === 0) return [];

  for (const mesh of meshes) {
    mesh.setParent(null);
    mesh.bakeCurrentTransformIntoVertices();
  }

  if (spec.yawOffset !== 0) {
    for (const mesh of meshes) {
      mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(spec.yawOffset, 0, 0);
      mesh.bakeCurrentTransformIntoVertices();
    }
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const mesh of meshes) {
    mesh.refreshBoundingInfo();
    const b = mesh.getBoundingInfo().boundingBox;
    minX = Math.min(minX, b.minimumWorld.x);
    maxX = Math.max(maxX, b.maximumWorld.x);
    minY = Math.min(minY, b.minimumWorld.y);
    minZ = Math.min(minZ, b.minimumWorld.z);
    maxZ = Math.max(maxZ, b.maximumWorld.z);
  }
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const isWallLike = spec.anchor === "wall" || spec.anchor === "wallMounted";
  const offsetX = -centerX * spec.scale;
  const offsetZ = isWallLike ? -maxZ * spec.scaleZ : -centerZ * spec.scaleZ;
  const offsetY = -minY * spec.scaleY + spec.y;

  for (const mesh of meshes) {
    mesh.scaling.set(spec.scale, spec.scaleY, spec.scaleZ);
    mesh.position.set(offsetX, offsetY, offsetZ);
    mesh.bakeCurrentTransformIntoVertices();

    const mat = mesh.material;
    if (mat instanceof PBRMaterial) {
      const standard = modelMaterials.standardFor(mat);
      mesh.material = standard;
      if (!deferCompile) modelMaterials.freezeWhenReady(standard, mesh);
    }
  }

  return meshes;
}

export class ModelPropStage {
  private readonly group: Group;
  private readonly templateCache = new Map<PropType, Mesh[]>();

  constructor(
    _scene: Scene,
    private readonly library: ModelLibrary,
  ) {
    this.group = group("modelProps");
  }

  place(
    props: readonly Prop[],
    immediate: readonly PropType[],
    deferred: readonly PropType[],
  ): Promise<void> {
    const byType = new Map<PropType, Prop[]>();
    for (const p of props) {
      if (!MODEL_PROPS[p.type] || MANAGER_OWNED_TYPES.has(p.type)) continue;
      const list = byType.get(p.type);
      if (list) list.push(p);
      else byType.set(p.type, [p]);
    }

    for (const type of immediate) {
      const list = byType.get(type);
      if (!list || list.length === 0) continue;
      const container = this.library.get(type);
      if (container) this.renderType(type, container, list);
    }

    const deferredLoads = deferred.map((type) => {
      const list = byType.get(type);
      if (!list || list.length === 0) return Promise.resolve();
      return this.library.load(type).then((container) => {
        if (container) this.renderType(type, container, list);
      });
    });
    return Promise.all(deferredLoads).then(() => undefined);
  }

  dispose(): void {
    this.group.dispose();
  }

  private renderType(type: PropType, container: AssetContainer, props: readonly Prop[]): void {
    const spec = MODEL_PROPS[type];
    if (!spec) return;
    const templates = this.buildTemplates(type, container, spec);
    if (templates.length === 0) return;
    this.instance(templates, props);
  }

  private buildTemplates(type: PropType, container: AssetContainer, spec: ModelPropSpec): Mesh[] {
    const cached = this.templateCache.get(type);
    if (cached) return cached;

    const meshes = normalizeModelTemplate(container, spec, true);
    this.templateCache.set(type, meshes);
    return meshes;
  }

  private instance(templates: Mesh[], props: readonly Prop[]): void {
    for (const template of templates) {
      template.parent = this.group;

      const matrices = new Float32Array(props.length * 16);
      props.forEach((p, i) => {
        Matrix.Compose(
          Vector3.One(),
          Quaternion.RotationYawPitchRoll(p.yaw, 0, 0),
          new Vector3(p.x, 0, p.z),
        ).copyToArray(matrices, i * 16);
      });

      template.thinInstanceSetBuffer("matrix", matrices, 16, true);
      template.isPickable = false;
      template.alwaysSelectAsActiveMesh = true;
      template.doNotSyncBoundingInfo = true;
      template.freezeWorldMatrix();

      this.scheduleInstancedCompile(template);
    }
  }

  private scheduleInstancedCompile(mesh: Mesh): void {
    const mat = mesh.material;
    if (mat instanceof StandardMaterial) {
      modelMaterials.freezeWhenReady(mat, mesh, { useInstances: true });
    }
  }
}
