import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import type { Material } from "@babylonjs/core/Materials/material";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { activeScene, basicMaterial, color3, lambertMaterial } from "./babylon";
import { AMBIENCE } from "./ambience";
import { getFloorSheenTexture } from "./reflectionCube";
import type { RoomArchetype } from "../world/rooms";

function loadPainting(url: string): Texture {
  const tex = new Texture(url, activeScene(), true, true, Texture.NEAREST_SAMPLINGMODE);
  tex.uScale = -1;
  tex.uOffset = 1;
  return tex;
}

function pbrTexturePath(category: string): string {
  return `/textures/pbr/${category}/albedo-512.webp`;
}

export const FLOOR_SHEEN_ENABLED = true;

function buildSurface(
  name: string, category: string, tint: number, repeat: [number, number], sheen?: boolean,
): StandardMaterial {
  const mat = new StandardMaterial(name, activeScene());
  const tex = new Texture(
    pbrTexturePath(category), activeScene(), false, true, Texture.TRILINEAR_SAMPLINGMODE,
  );
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.uScale = repeat[0];
  tex.vScale = repeat[1];
  mat.diffuseTexture = tex;
  mat.diffuseColor = color3(tint);
  mat.specularColor = Color3.Black();
  mat.maxSimultaneousLights = 1;
  if (sheen && FLOOR_SHEEN_ENABLED) {
    mat.reflectionTexture = getFloorSheenTexture();
    mat.useReflectionFresnelFromSpecular = false;
    mat.reflectionFresnelParameters = new FresnelParameters({ bias: 0.2, power: 2 });
  }
  return mat;
}

export type ArchetypeMaterialSet = {
  wall: Material;
  floor: Material;
  ceiling: Material;
  dado?: Material;
  rail?: Material;
};

function buildArchetypeMaterials(archetype: RoomArchetype): ArchetypeMaterialSet {
  const config = AMBIENCE.materials.rooms[archetype];
  const wall = buildSurface(
    `wall_${archetype}`, config.wall, config.wallTint, [config.wallRepeatU, config.wallRepeatV],
  );
  const floor = buildSurface(
    `floor_${archetype}`, config.floor, config.floorTint,
    [config.floorRepeatU, config.floorRepeatV], config.floorSheen,
  );
  const ceiling = buildSurface(
    `ceiling_${archetype}`, config.ceiling, config.ceilingTint,
    [config.ceilingRepeatU, config.ceilingRepeatV],
  );
  const out: ArchetypeMaterialSet = { wall, floor, ceiling };
  if (config.dado) {
    out.dado = buildSurface(`dado_${archetype}`, config.dado.category, config.dado.tint, [1, 1]);
    const rail = AMBIENCE.materials.dadoRail;
    out.rail = buildSurface(`rail_${archetype}`, rail.category, rail.tint, [1, 1]);
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
  const mat = new StandardMaterial("decal_leak", activeScene());
  const tex = new Texture(
    `/textures/pbr/${AMBIENCE.materials.decal.category}/albedo-512.webp`,
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
  mat.maxSimultaneousLights = 1;
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
  mirror: 0x9fb8c8,
} as const;

const EMISSIVE = {
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
  const hallway = getRoomMaterials("hallway");
  const out: Record<string, unknown> = {
    floor: hallway.floor,
    wall: hallway.wall,
    ceiling: hallway.ceiling,
    paintings: PAINTING_FILES.map((f, i) => {
      const mat = new StandardMaterial(`painting${i}`, activeScene());
      mat.diffuseColor = Color3.White();
      mat.specularColor = Color3.Black();
      mat.maxSimultaneousLights = 1;
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
