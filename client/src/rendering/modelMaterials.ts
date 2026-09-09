import type { IMaterialCompilationOptions, Material } from "@babylonjs/core/Materials/material";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { onSettingsChange } from "../core/settings";
import { AMBIENCE } from "./ambience";
import { color3, maxLights } from "./babylon";

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

type CompileTarget = { mesh: Mesh; options?: Partial<IMaterialCompilationOptions> };

export class ModelMaterialFactory {
  private readonly cache = new WeakMap<PBRMaterial, StandardMaterial>();
  private readonly compileTargets = new Map<StandardMaterial, CompileTarget>();

  constructor() {
    onSettingsChange(() => this.retune());
  }

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
    mat.maxSimultaneousLights = maxLights();

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
    if (this.compileTargets.has(material)) return;
    this.compileTargets.set(material, { mesh, options });
    freezeWhenCompiled(material, mesh, options);
  }

  private retune(): void {
    for (const [material, target] of this.compileTargets) {
      material.unfreeze();
      freezeWhenCompiled(material, target.mesh, target.options);
    }
  }
}
