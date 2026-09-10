import type { RoomArchetype } from "../world/rooms";

export const AMBIENCE = {
  tone: {
    exposure: 0.78,
    contrast: 1.28,
    saturation: 62,
    shadowsHue: 150,
    shadowsDensity: 34,
    midtonesHue: 165,
    midtonesDensity: 12,
    highlightsHue: 195,
    highlightsDensity: 16,
  },
  vignette: {
    weight: 2.8,
    stretch: 0.35,
    color: 0x05060a,
    breathHz: 0.08,
    breathAmount: 0.5,
    chaseWeight: 5.2,
  },
  fog: {
    color: 0x11150e,
    density: 0.085,
    breathHz: 0.05,
    breathAmount: 0.006,
    chaseDensity: 0.088,
    lerp: 1.6,
  },
  ambientLight: {
    skyColor: 0xb7b3a0,
    groundColor: 0x55544b,
    intensity: 1.0,
    minFactor: 0.14,
    radius: 12,
    lerp: 5,
  },
  clearColor: 0x090b08,
  chase: {
    radius: 16,
    exitRadius: 22,
  },
  tube: {
    color: 0xfff2cf,
    emissiveFloor: 0.05,
    blackoutChancePerSecond: 0.01,
    blackoutMinS: 1.0,
    blackoutMaxS: 3.0,
    blackoutRadius: 14,
  },
  surfaces: {
    wallRoughness: 0.88,
    wallMetallic: 0,
    floorRoughness: 0.42,
    floorMetallic: 0,
    ceilingRoughness: 0.95,
    ceilingMetallic: 0,
    propSpecularColor: 0x0a0a0a,
    propSpecularPower: 16,
  },
  cues: {
    heartPulseAmount: 0.09,
    heartPulseHzNear: 2.6,
    heartPulseHzFar: 0.9,
    hiddenSaturation: -72,
    hiddenVignette: 8.5,
    hiddenLerp: 3.5,
    caughtFlashMs: 90,
    caughtBlackMs: 320,
    shakeDecay: 7,
    shakeMax: 0.055,
    shakeChair: 0.045,
    shakeThrow: 0.018,
    shakeRadius: 18,
    swayAmount: 0.006,
    swayHz: 0.55,
    breathAmount: 0.004,
    breathHz: 0.22,
  },
  audio: {
    humHz: 118,
    humDetuneHz: 0.6,
    humGain: 0.045,
    humFlickerGain: 0.09,
    droneHz: 44,
    droneGain: 0.075,
    droneStartDistance: 24,
    farMinS: 30,
    farMaxS: 90,
    farMinDistance: 15,
    farMaxDistance: 30,
  },
  materials: {
    dadoRail: {
      category: "floor_wood",
      tint: 0x4f3a24,
      roughness: 0.55,
    },
    decal: {
      category: "decal_leak",
      perRoom: 3,
      minScale: 0.6,
      maxScale: 1.4,
      alpha: 0.55,
    },
    rooms: {
      classroom: {
        wall: "wall_plaster_plain", wallTint: 0x8b8471, wallRoughness: 0.62, wallMetallic: 0,
        wallRepeatU: 1, wallRepeatV: 1.5,
        dado: { category: "dado_tile_green", tint: 0x1e2a22, roughness: 0.32 },
        dadoHeight: 1.0,
        floor: "floor_lino", floorTint: 0x787158, floorRoughness: 0.40, floorMetallic: 0,
        floorEnvironment: 0.18, floorRepeatU: 1, floorRepeatV: 1,
        ceiling: "ceiling_tile", ceilingTint: 0x847d5a, ceilingRoughness: 0.88, ceilingMetallic: 0,
        ceilingRepeatU: 1, ceilingRepeatV: 1,
      },
      hallway: {
        wall: "wall_plaster_green", wallTint: 0x788172, wallRoughness: 0.65, wallMetallic: 0,
        wallRepeatU: 1, wallRepeatV: 1.5,
        dado: { category: "dado_tile_green", tint: 0x1e2a22, roughness: 0.32 },
        dadoHeight: 1.0,
        floor: "floor_terrazzo", floorTint: 0x817e75, floorRoughness: 0.40, floorMetallic: 0,
        floorEnvironment: 0.18, floorRepeatU: 1, floorRepeatV: 1,
        ceiling: "ceiling_tile", ceilingTint: 0x847d5a, ceilingRoughness: 0.88, ceilingMetallic: 0,
        ceilingRepeatU: 1, ceilingRepeatV: 1,
      },
      toilet: {
        wall: "wall_tile_white", wallTint: 0x8f948c, wallRoughness: 0.22, wallMetallic: 0,
        wallRepeatU: 1, wallRepeatV: 1.5,
        dado: { category: "dado_tile_green", tint: 0x1e2a22, roughness: 0.32 },
        dadoHeight: 1.0,
        floor: "floor_lino", floorTint: 0x766e5d, floorRoughness: 0.18, floorMetallic: 0,
        floorEnvironment: 0.55, floorRepeatU: 1, floorRepeatV: 1,
        ceiling: "ceiling_plaster", ceilingTint: 0x817f75, ceilingRoughness: 0.90, ceilingMetallic: 0,
        ceilingRepeatU: 1, ceilingRepeatV: 1,
      },
      cafeteria: {
        wall: "wall_plaster_plain", wallTint: 0x87877d, wallRoughness: 0.60, wallMetallic: 0,
        wallRepeatU: 1, wallRepeatV: 1.5,
        floor: "floor_stone_tile", floorTint: 0x837f72, floorRoughness: 0.24, floorMetallic: 0,
        floorEnvironment: 0.55, floorRepeatU: 1, floorRepeatV: 1,
        ceiling: "ceiling_tile", ceilingTint: 0x847d5a, ceilingRoughness: 0.88, ceilingMetallic: 0,
        ceilingRepeatU: 1, ceilingRepeatV: 1,
      },
      chemistry_lab: {
        wall: "wall_tile_hex", wallTint: 0x878a86, wallRoughness: 0.28, wallMetallic: 0,
        wallRepeatU: 1, wallRepeatV: 1.5,
        floor: "floor_terrazzo_dark", floorTint: 0x484a4d, floorRoughness: 0.42, floorMetallic: 0,
        floorEnvironment: 0.18, floorRepeatU: 1, floorRepeatV: 1,
        ceiling: "ceiling_tile", ceilingTint: 0x7f7c62, ceilingRoughness: 0.88, ceilingMetallic: 0,
        ceilingRepeatU: 1, ceilingRepeatV: 1,
      },
      gym: {
        wall: "wall_plaster_plain", wallTint: 0x7f7c6c, wallRoughness: 0.70, wallMetallic: 0,
        wallRepeatU: 1, wallRepeatV: 1.5,
        floor: "floor_wood", floorTint: 0x6d502e, floorRoughness: 0.45, floorMetallic: 0,
        floorEnvironment: 0.18, floorRepeatU: 1, floorRepeatV: 1,
        ceiling: "ceiling_plaster", ceilingTint: 0x7c7d74, ceilingRoughness: 0.92, ceilingMetallic: 0,
        ceilingRepeatU: 1, ceilingRepeatV: 1,
      },
      janitor_room: {
        wall: "wall_concrete", wallTint: 0x5c5a54, wallRoughness: 0.72, wallMetallic: 0,
        wallRepeatU: 1, wallRepeatV: 1.5,
        floor: "wall_concrete", floorTint: 0x52514b, floorRoughness: 0.70, floorMetallic: 0,
        floorEnvironment: 0.18, floorRepeatU: 1, floorRepeatV: 1,
        ceiling: "ceiling_plaster", ceilingTint: 0x6d6c64, ceilingRoughness: 0.92, ceilingMetallic: 0,
        ceilingRepeatU: 1, ceilingRepeatV: 1,
      },
      server_room: {
        wall: "wall_concrete", wallTint: 0x646768, wallRoughness: 0.60, wallMetallic: 0,
        wallRepeatU: 1, wallRepeatV: 1.5,
        floor: "floor_lino", floorTint: 0x52565a, floorRoughness: 0.35, floorMetallic: 0,
        floorEnvironment: 0.18, floorRepeatU: 1, floorRepeatV: 1,
        ceiling: "ceiling_plaster", ceilingTint: 0x686b6c, ceilingRoughness: 0.90, ceilingMetallic: 0,
        ceilingRepeatU: 1, ceilingRepeatV: 1,
      },
      teacher_room: {
        wall: "wall_plaster_plain", wallTint: 0x888172, wallRoughness: 0.62, wallMetallic: 0,
        wallRepeatU: 1, wallRepeatV: 1.5,
        floor: "floor_carpet", floorTint: 0x463b22, floorRoughness: 0.90, floorMetallic: 0,
        floorEnvironment: 0.18, floorRepeatU: 1, floorRepeatV: 1,
        ceiling: "ceiling_tile", ceilingTint: 0x827b58, ceilingRoughness: 0.88, ceilingMetallic: 0,
        ceilingRepeatU: 1, ceilingRepeatV: 1,
      },
    } as Record<RoomArchetype, RoomMaterialConfig>,
  },
};

export type DadoConfig = { category: string; tint: number; roughness: number };

export type RoomMaterialConfig = {
  wall: string;
  wallTint: number;
  wallRoughness: number;
  wallMetallic: number;
  wallRepeatU: number;
  wallRepeatV: number;
  dado?: DadoConfig;
  dadoHeight?: number;
  floor: string;
  floorTint: number;
  floorRoughness: number;
  floorMetallic: number;
  floorEnvironment: number;
  floorRepeatU: number;
  floorRepeatV: number;
  ceiling: string;
  ceilingTint: number;
  ceilingRoughness: number;
  ceilingMetallic: number;
  ceilingRepeatU: number;
  ceilingRepeatV: number;
};
