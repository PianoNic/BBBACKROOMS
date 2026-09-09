import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { AMBIENCE } from "./ambience";
import { color3, maxLights } from "./babylon";

function cloneAlbedoTexture(source: PBRMaterial): Texture | null {
  const albedo = source.albedoTexture;
  if (!albedo) return null;
  const clone = albedo.clone();
  if (!(clone instanceof Texture)) return null;

  clone.coordinatesIndex = albedo.coordinatesIndex;
  clone.wrapU = albedo.wrapU;
  clone.wrapV = albedo.wrapV;
  if (albedo instanceof Texture) {
    clone.uScale = albedo.uScale;
    clone.vScale = albedo.vScale;
    clone.uOffset = albedo.uOffset;
    clone.vOffset = albedo.vOffset;
    clone.wAng = albedo.wAng;
  }
  return clone;
}

export class ModelMaterialFactory {
  private readonly cache = new WeakMap<PBRMaterial, StandardMaterial>();

  standardFor(source: PBRMaterial): StandardMaterial {
    const cached = this.cache.get(source);
    if (cached) return cached;

    const mat = new StandardMaterial(`${source.name}_std`, source.getScene());
    const diffuseTexture = cloneAlbedoTexture(source);
    if (diffuseTexture) {
      mat.diffuseTexture = diffuseTexture;
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
