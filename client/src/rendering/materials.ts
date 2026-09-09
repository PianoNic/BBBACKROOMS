import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { HDRCubeTexture } from "@babylonjs/core/Materials/Textures/hdrCubeTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { Material } from "@babylonjs/core/Materials/material";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MAX_LIGHTS, activeScene, basicMaterial, color3, lambertMaterial } from "./babylon";
import { AMBIENCE, tierFeatures, type GraphicsTier } from "./ambience";
import { getSettings } from "../core/settings";
import { mulberry32 } from "../world/propBuilders/_common";
import type { RoomArchetype } from "../world/rooms";

function loadTiled(url: string, repeat: [number, number]): Texture {
  const tex = new Texture(url, activeScene(), true, true, Texture.NEAREST_SAMPLINGMODE);
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.uScale = repeat[0];
  tex.vScale = repeat[1];
  return tex;
}

function loadPainting(url: string): Texture {
  const tex = new Texture(url, activeScene(), true, true, Texture.NEAREST_SAMPLINGMODE);
  tex.uScale = -1;
  tex.uOffset = 1;
  return tex;
}

function textured(url: string, repeat: [number, number], name: string): StandardMaterial {
  const mat = new StandardMaterial(name, activeScene());
  mat.diffuseColor = Color3.White();
  mat.specularColor = Color3.Black();
  mat.maxSimultaneousLights = MAX_LIGHTS;
  mat.diffuseTexture = loadTiled(url, repeat);
  return mat;
}

const GRIME_SIZE = 256;
const GRIME_SEED = 90125;

function drawGrime(c: HTMLCanvasElement): void {
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  const rand = mulberry32(GRIME_SEED);
  for (let i = 0; i < 30; i++) {
    const x = rand() * c.width;
    const y = rand() * c.height;
    const r = 14 + rand() * 50;
    const v = 70 + Math.floor(rand() * 60);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${v},${v + 12},${v},${0.3 + rand() * 0.35})`);
    grad.addColorStop(1, `rgba(${v},${v + 12},${v},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(60,70,58,0.28)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const x0 = rand() * c.width;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    let x = x0;
    for (let s = 0; s < 8; s++) {
      x += (rand() - 0.5) * 20;
      ctx.lineTo(x, ((s + 1) / 8) * c.height);
    }
    ctx.stroke();
  }
}

function buildGrimeTexture(): DynamicTexture {
  const c = document.createElement("canvas");
  c.width = GRIME_SIZE; c.height = GRIME_SIZE;
  drawGrime(c);
  const tex = new DynamicTexture(
    "grime", { width: c.width, height: c.height },
    activeScene(), true, Texture.NEAREST_SAMPLINGMODE,
  );
  tex.getContext().drawImage(c, 0, 0);
  tex.update(false);
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.uScale = AMBIENCE.surfaces.grimeScale;
  tex.vScale = AMBIENCE.surfaces.grimeScale;
  return tex;
}

let grimeTex: DynamicTexture | null = null;

function getGrimeTexture(): DynamicTexture {
  if (!grimeTex) grimeTex = buildGrimeTexture();
  return grimeTex;
}

let environmentApplied = false;

function ensureEnvironmentTexture(): void {
  if (environmentApplied) return;
  environmentApplied = true;
  const scene = activeScene();
  try {
    const hdr = new HDRCubeTexture(
      AMBIENCE.materials.environment.url, scene, AMBIENCE.materials.environment.size,
      false, true, false, false, null,
      () => { scene.environmentTexture = null; },
    );
    scene.environmentTexture = hdr;
  } catch {
    scene.environmentTexture = null;
  }
}

function pbrTexturePath(
  category: string, map: "albedo" | "normal" | "orm", tier: GraphicsTier,
): string {
  const res = tier === "hoch" ? "1k" : "512";
  return `/textures/pbr/${category}/${map}-${res}.webp`;
}

function loadPbrTexture(
  url: string, gammaSpace: boolean, tier: GraphicsTier, repeat: [number, number],
): Texture {
  const hoch = tier === "hoch";
  const sampling = hoch ? Texture.TRILINEAR_SAMPLINGMODE : Texture.NEAREST_SAMPLINGMODE;
  const tex = new Texture(url, activeScene(), !hoch, true, sampling);
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.uScale = repeat[0];
  tex.vScale = repeat[1];
  tex.gammaSpace = gammaSpace;
  if (hoch) tex.anisotropicFilteringLevel = 8;
  return tex;
}

const NORMAL_STRENGTH = 0.6;

function buildPbrSurface(
  name: string, category: string, tint: number, roughness: number, metallic: number,
  repeat: [number, number], tier: GraphicsTier, environmentIntensity: number,
  grime: DynamicTexture,
): PBRMaterial {
  const mat = new PBRMaterial(name, activeScene());
  mat.albedoTexture = loadPbrTexture(pbrTexturePath(category, "albedo", tier), true, tier, repeat);
  mat.albedoColor = color3(tint);
  const normal = loadPbrTexture(pbrTexturePath(category, "normal", tier), false, tier, repeat);
  normal.level = NORMAL_STRENGTH;
  mat.bumpTexture = normal;
  mat.invertNormalMapX = false;
  mat.invertNormalMapY = false;
  mat.metallicTexture = loadPbrTexture(pbrTexturePath(category, "orm", tier), false, tier, repeat);
  mat.useRoughnessFromMetallicTextureAlpha = false;
  mat.useRoughnessFromMetallicTextureGreen = true;
  mat.useMetallnessFromMetallicTextureBlue = true;
  mat.roughness = roughness;
  mat.metallic = metallic;
  mat.directIntensity = AMBIENCE.surfaces.directIntensity;
  mat.environmentIntensity = environmentIntensity;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  mat.usePhysicalLightFalloff = false;
  mat.ambientTexture = grime;
  mat.ambientTextureStrength = AMBIENCE.surfaces.grimeStrength;
  return mat;
}

export type ArchetypeMaterialSet = {
  wall: Material;
  floor: Material;
  ceiling: Material;
  dado?: Material;
  rail?: Material;
};

let flatSet: ArchetypeMaterialSet | null = null;

function getFlatMaterials(): ArchetypeMaterialSet {
  if (!flatSet) {
    flatSet = {
      floor: textured("/textures/floor.png", [1, 1], "floor"),
      wall: textured("/textures/wall.png", [1, 1.5], "wall"),
      ceiling: textured("/textures/ceiling.png", [1, 1], "ceiling"),
    };
  }
  return flatSet;
}

function buildArchetypeMaterials(archetype: RoomArchetype): ArchetypeMaterialSet {
  const tier = getSettings().graphicsTier;
  if (!tierFeatures(tier).pbrSurfaces) return getFlatMaterials();
  ensureEnvironmentTexture();
  const config = AMBIENCE.materials.rooms[archetype];
  const grime = getGrimeTexture();
  const envDefault = AMBIENCE.materials.environment.intensity;
  const wall = buildPbrSurface(
    `wall_${archetype}`, config.wall, config.wallTint, config.wallRoughness, config.wallMetallic,
    [config.wallRepeatU, config.wallRepeatV], tier, envDefault, grime,
  );
  const floor = buildPbrSurface(
    `floor_${archetype}`, config.floor, config.floorTint, config.floorRoughness,
    config.floorMetallic, [config.floorRepeatU, config.floorRepeatV], tier,
    config.floorEnvironment, grime,
  );
  const ceiling = buildPbrSurface(
    `ceiling_${archetype}`, config.ceiling, config.ceilingTint, config.ceilingRoughness,
    config.ceilingMetallic, [config.ceilingRepeatU, config.ceilingRepeatV], tier,
    envDefault, grime,
  );
  const out: ArchetypeMaterialSet = { wall, floor, ceiling };
  if (config.dado) {
    out.dado = buildPbrSurface(
      `dado_${archetype}`, config.dado.category, config.dado.tint, config.dado.roughness, 0,
      [1, 1], tier, envDefault, grime,
    );
    const rail = AMBIENCE.materials.dadoRail;
    out.rail = buildPbrSurface(
      `rail_${archetype}`, rail.category, rail.tint, rail.roughness, 0,
      [1, 1], tier, envDefault, grime,
    );
  }
  return out;
}

const archetypeCache = new Map<RoomArchetype, ArchetypeMaterialSet>();

export function getRoomMaterials(archetype: RoomArchetype): ArchetypeMaterialSet {
  let set = archetypeCache.get(archetype);
  if (!set) {
    set = buildArchetypeMaterials(archetype);
    archetypeCache.set(archetype, set);
  }
  return set;
}

const DECAL_Z_OFFSET = -2;
let decalMaterial: StandardMaterial | null = null;

export function getDecalMaterial(): Material {
  if (decalMaterial) return decalMaterial;
  const tier = getSettings().graphicsTier;
  const res = tier === "hoch" ? "1k" : "512";
  const mat = new StandardMaterial("decal_leak", activeScene());
  const tex = new Texture(
    `/textures/pbr/${AMBIENCE.materials.decal.category}/albedo-${res}.webp`,
    activeScene(), true, true, Texture.NEAREST_SAMPLINGMODE,
  );
  tex.hasAlpha = true;
  mat.diffuseTexture = tex;
  mat.useAlphaFromDiffuseTexture = true;
  mat.diffuseColor = Color3.White();
  mat.specularColor = Color3.Black();
  mat.backFaceCulling = true;
  mat.alpha = AMBIENCE.materials.decal.alpha;
  mat.zOffset = DECAL_Z_OFFSET;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  decalMaterial = mat;
  return mat;
}

const PAINTING_FILES: ReadonlyArray<string> = Array.from(
  { length: 24 }, (_, i) => `painting-${String(i + 1).padStart(2, "0")}.webp`,
);

const FLAT = {
  deskWood: 0x7a4a22,
  deskLeg: 0x222227,
  studentDesk: 0xa57a3a,
  whiteboardFrame: 0x2a2a2e,
  whiteboardSurface: 0xeae6d2,
  cupboard: 0x4a3520,
  closet: 0x6f7480,
  trashCan: 0x222226,
  paintingFrame: 0x18120a,
  pot: 0x5a3a2a,
  foliage: 0x356b2d,
  stallPanel: 0x8a9099,
  sink: 0xe6e6e2,
  sinkBasin: 0xbcbcb8,
  faucet: 0x8a8d92,
  toiletPorcelain: 0xeeeee8,
  toiletSeat: 0xd9d9d3,
  bookshelf: 0x3a2614,
  bookA: 0x8a3030,
  bookB: 0x2f4a78,
  bookC: 0x4a6a2a,
  bookD: 0xc8a25a,
  bookE: 0x553a1c,
  clockFace: 0xeae6d2,
  clockRim: 0x18120a,
  globeBall: 0x2a5a8a,
  globeStand: 0x18120a,
  flagRed: 0xc62828,
  flagCross: 0xf5f5f5,
  projector: 0x1a1a1e,
  cork: 0x7a5230,
  noteWhite: 0xeae6d2,
  noteYellow: 0xe8c95a,
  noteBlue: 0x7a9fc8,
  radiator: 0xd0cec5,
  backpack: 0x2a3a4a,
  fireRed: 0xa01818,
  locker: 0x4a5260,
  lockerDoor: 0x3a4250,
  lockerInside: 0x1c2028,
  lampPole: 0x1a1a1e,
} as const;

const EMISSIVE = {
  mirror: 0x9fb8c8,
  neon: 0xff4dc4,
  lightFixture: 0xffffcc,
  clockHand: 0x111111,
  projectorLens: 0xffe28a,
  pin: 0xff4d4d,
  lampShade: 0xf3d98a,
} as const;

/** Central palette. PS1-ish: Lambert for surfaces, Basic for emissives. */
export type Materials =
  Record<keyof typeof FLAT | keyof typeof EMISSIVE, StandardMaterial>
  & { floor: Material; wall: Material; ceiling: Material }
  & { paintings: StandardMaterial[] };

let cached: Record<string, unknown> | null = null;

function build(): Record<string, unknown> {
  const pbr = tierFeatures(getSettings().graphicsTier).pbrSurfaces;
  let floorMat: Material;
  let wallMat: Material;
  let ceilingMat: Material;
  if (pbr) {
    const hallway = getRoomMaterials("hallway");
    floorMat = hallway.floor;
    wallMat = hallway.wall;
    ceilingMat = hallway.ceiling;
  } else {
    const flat = getFlatMaterials();
    floorMat = flat.floor;
    wallMat = flat.wall;
    ceilingMat = flat.ceiling;
  }
  const out: Record<string, unknown> = {
    floor: floorMat,
    wall: wallMat,
    ceiling: ceilingMat,
    paintings: PAINTING_FILES.map((f, i) => {
      const mat = new StandardMaterial(`painting${i}`, activeScene());
      mat.diffuseColor = Color3.White();
      mat.specularColor = Color3.Black();
      mat.maxSimultaneousLights = MAX_LIGHTS;
      mat.diffuseTexture = loadPainting(`/textures/paintings/${f}`);
      return mat;
    }),
  };
  for (const [key, color] of Object.entries(FLAT)) {
    out[key] = lambertMaterial(color, key);
  }
  for (const [key, color] of Object.entries(EMISSIVE)) {
    out[key] = basicMaterial(color, key);
  }
  return out;
}

export const materials = new Proxy({} as Materials, {
  get(_t, prop: string) {
    if (!cached) cached = build();
    return cached[prop];
  },
});
