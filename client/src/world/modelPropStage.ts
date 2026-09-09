import "@babylonjs/core/Meshes/thinInstanceMesh";
import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Prop, PropType } from "../net/protocol";
import type { ModelLibrary } from "../rendering/modelLoader";
import type { FlickerLights } from "../rendering/lights";
import { AMBIENCE, tierFeatures } from "../rendering/ambience";
import { maxLights, group, type Group } from "../rendering/babylon";
import { getSettings } from "../core/settings";
import { ModelMaterialFactory } from "../rendering/modelMaterials";
import { MANAGER_OWNED_TYPES, MODEL_PROPS, type ModelPropSpec } from "./modelProps";

const modelMaterials = new ModelMaterialFactory();

export function normalizeModelTemplate(container: AssetContainer, spec: ModelPropSpec): Mesh[] {
  container.addAllToScene();
  const meshes = container.meshes.filter(
    (m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0,
  );
  if (meshes.length === 0) return [];

  for (const mesh of meshes) {
    mesh.setParent(null);
    mesh.bakeCurrentTransformIntoVertices();
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

  const usePbr = tierFeatures(getSettings().graphicsTier).pbrModels;

  for (const mesh of meshes) {
    mesh.scaling.set(spec.scale, spec.scaleY, spec.scaleZ);
    mesh.position.set(offsetX, offsetY, offsetZ);
    mesh.bakeCurrentTransformIntoVertices();

    const mat = mesh.material;
    if (mat instanceof PBRMaterial) {
      if (usePbr) {
        mat.directIntensity = AMBIENCE.surfaces.directIntensity;
        mat.environmentIntensity = 0;
        mat.usePhysicalLightFalloff = false;
        mat.maxSimultaneousLights = maxLights();
        mat.freeze();
      } else {
        mesh.material = modelMaterials.standardFor(mat);
      }
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
    private readonly lights: FlickerLights,
    private readonly regionOf: (prop: Prop) => number,
  ) {
    this.group = group("modelProps");
  }

  place(
    props: readonly Prop[],
    immediate: readonly PropType[],
    deferred: readonly PropType[],
  ): void {
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

    for (const type of deferred) {
      const list = byType.get(type);
      if (!list || list.length === 0) continue;
      void this.library.load(type).then((container) => {
        if (container) this.renderType(type, container, list);
      });
    }
  }

  dispose(): void {
    this.group.dispose();
  }

  private renderType(type: PropType, container: AssetContainer, props: readonly Prop[]): void {
    const spec = MODEL_PROPS[type];
    if (!spec) return;
    const templates = this.buildTemplates(type, container, spec);
    if (templates.length === 0) return;
    this.instance(templates, props, spec);
  }

  private buildTemplates(type: PropType, container: AssetContainer, spec: ModelPropSpec): Mesh[] {
    const cached = this.templateCache.get(type);
    if (cached) return cached;

    const meshes = normalizeModelTemplate(container, spec);
    for (const mesh of meshes) mesh.receiveShadows = true;

    this.templateCache.set(type, meshes);
    return meshes;
  }

  private instance(templates: Mesh[], props: readonly Prop[], spec: ModelPropSpec): void {
    const regions = new Map<number, Prop[]>();
    for (const p of props) {
      const key = this.regionOf(p);
      const list = regions.get(key);
      if (list) list.push(p);
      else regions.set(key, [p]);
    }

    for (const template of templates) {
      let first = true;
      for (const [key, regionProps] of regions) {
        const mesh = first ? template : template.clone(`${template.name}_r${key}`, null);
        if (!first) mesh.receiveShadows = true;
        this.lights.addShadowCaster(mesh);
        this.lights.addRegionMeshes(key, [mesh]);
        first = false;
        mesh.parent = this.group;

        const matrices = new Float32Array(regionProps.length * 16);
        regionProps.forEach((p, i) => {
          Matrix.Compose(
            Vector3.One(),
            Quaternion.RotationYawPitchRoll(p.yaw + spec.yawOffset, 0, 0),
            new Vector3(p.x, 0, p.z),
          ).copyToArray(matrices, i * 16);
        });

        mesh.thinInstanceSetBuffer("matrix", matrices, 16, true);
        mesh.isPickable = false;
        mesh.alwaysSelectAsActiveMesh = false;
        mesh.thinInstanceRefreshBoundingInfo(true);
        mesh.freezeWorldMatrix();
      }
    }
  }
}
