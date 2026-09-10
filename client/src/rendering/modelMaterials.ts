import type { IMaterialCompilationOptions, Material } from "@babylonjs/core/Materials/material";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AMBIENCE } from "./ambience";
import { color3 } from "./babylon";

export function freezeWhenCompiled(
  material: Material,
  mesh: Mesh,
  options?: Partial<IMaterialCompilationOptions>,
): void {
  void material
    .forceCompilationAsync(mesh, options)
    .then(() => material.freeze())
    .catch(() => {});
}

export class ModelMaterialFactory {
  private readonly cache = new WeakMap<PBRMaterial, StandardMaterial>();
  private readonly scheduled = new WeakSet<StandardMaterial>();

  standardFor(source: PBRMaterial): StandardMaterial {
    const cached = this.cache.get(source);
    if (cached) return cached;

    const mat = new StandardMaterial(`${source.name}_std`, source.getScene());
    if (source.albedoTexture) {
      mat.diffuseTexture = source.albedoTexture;
    } else {
      mat.diffuseColor = source.albedoColor;
    }
    mat.backFaceCulling = source.backFaceCulling;
    mat.alpha = source.alpha;
    mat.specularColor = color3(AMBIENCE.surfaces.propSpecularColor);
    mat.specularPower = AMBIENCE.surfaces.propSpecularPower;
    mat.maxSimultaneousLights = 1;

    if (source.needAlphaBlending()) {
      mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
    } else if (source.needAlphaTesting()) {
      mat.transparencyMode = StandardMaterial.MATERIAL_ALPHATEST;
      mat.alphaCutOff = source.alphaCutOff;
    }

    this.cache.set(source, mat);
    return mat;
  }

  freezeWhenReady(
    material: StandardMaterial,
    mesh: Mesh,
    options?: Partial<IMaterialCompilationOptions>,
  ): void {
    if (this.scheduled.has(material)) return;
    this.scheduled.add(material);
    freezeWhenCompiled(material, mesh, options);
  }
}
