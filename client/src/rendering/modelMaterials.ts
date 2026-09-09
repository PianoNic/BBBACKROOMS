import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { AMBIENCE } from "./ambience";
import { color3, maxLights } from "./babylon";

export class ModelMaterialFactory {
  private readonly cache = new WeakMap<PBRMaterial, StandardMaterial>();

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

    mat.freeze();
    this.cache.set(source, mat);
    return mat;
  }
}
