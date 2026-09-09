import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MAX_LIGHTS, activeScene, basicMaterial, lambertMaterial } from "./babylon";

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
  Record<keyof typeof FLAT | keyof typeof EMISSIVE | "floor" | "wall" | "ceiling",
    StandardMaterial>
  & { paintings: StandardMaterial[] };

let cached: Record<string, unknown> | null = null;

function build(): Record<string, unknown> {
  const out: Record<string, unknown> = {
    floor: textured("/textures/floor.png", [1, 1], "floor"),
    wall: textured("/textures/wall.png", [1, 1.5], "wall"),
    ceiling: textured("/textures/ceiling.png", [1, 1], "ceiling"),
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
