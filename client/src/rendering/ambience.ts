export type GraphicsTier = "niedrig" | "mittel" | "hoch";

export type TierFeatures = {
  shadowLights: number;
  shadowMapSize: number;
  ssao: boolean;
  ssaoRatio: number;
  volumetric: boolean;
  bloom: boolean;
  bloomKernel: number;
  fxaa: boolean;
  particleScale: number;
  glow: boolean;
  pbrSurfaces: boolean;
};

export const TIERS: Record<GraphicsTier, TierFeatures> = {
  niedrig: { shadowLights: 0, shadowMapSize: 256, ssao: false, ssaoRatio: 0.25, volumetric: false, bloom: true,  bloomKernel: 24, fxaa: false, particleScale: 0,   glow: false, pbrSurfaces: false },
  mittel:  { shadowLights: 2, shadowMapSize: 512, ssao: true,  ssaoRatio: 0.5,  volumetric: false, bloom: true,  bloomKernel: 48, fxaa: true,  particleScale: 1,   glow: true,  pbrSurfaces: true  },
  hoch:    { shadowLights: 4, shadowMapSize: 512, ssao: true,  ssaoRatio: 0.5,  volumetric: true,  bloom: true,  bloomKernel: 64, fxaa: true,  particleScale: 2,   glow: true,  pbrSurfaces: true  },
};

export function tierFeatures(tier: GraphicsTier): TierFeatures {
  return TIERS[tier] ?? TIERS.mittel;
}

export const AMBIENCE = {
  tone: {
    exposure: 0.85,
    contrast: 1.30,
    saturation: 62,
    shadowsHue: 150,
    shadowsDensity: 34,
    midtonesHue: 165,
    midtonesDensity: 12,
    highlightsHue: 195,
    highlightsDensity: 16,
  },
  bloom: {
    threshold: 0.55,
    weight: 0.42,
    scale: 0.5,
  },
  vignette: {
    weight: 2.8,
    stretch: 0.35,
    color: 0x05060a,
    breathHz: 0.08,
    breathAmount: 0.5,
    chaseWeight: 5.2,
  },
  aberration: {
    idle: 5,
    chase: 24,
  },
  grain: {
    intensity: 24,
  },
  fog: {
    color: 0x11150e,
    density: 0.062,
    breathHz: 0.05,
    breathAmount: 0.006,
    chaseDensity: 0.088,
    lerp: 1.6,
  },
  ambientLight: {
    color: 0x39424c,
    intensity: 0.26,
  },
  clearColor: 0x090b08,
  chase: {
    radius: 16,
    exitRadius: 22,
  },
  autoDrop: {
    frameTimeMs: 33,
    holdSeconds: 5,
  },
  tube: {
    color: 0xfff2cf,
    baseIntensity: 3.4,
    range: 12,
    poolSize: 6,
    spotAngle: 2.3,
    spotExponent: 1,
    shadowDarkness: 0.32,
    shadowBlurKernel: 8,
    emissiveFloor: 0.05,
    blackoutChancePerSecond: 0.01,
    blackoutMinS: 1.0,
    blackoutMaxS: 3.0,
    blackoutRadius: 14,
  },
  glow: {
    intensity: 0.65,
    blurKernelSize: 24,
  },
  ssao: {
    radius: 1.3,
    totalStrength: 1.1,
    base: 0.06,
    samples: 8,
    maxZ: 28,
    minZAspect: 0.3,
  },
  particles: {
    dustCount: 240,
    dustRadius: 8,
    dustMinSize: 0.012,
    dustMaxSize: 0.038,
    dustSpeed: 0.11,
    dustColor: 0xc4c8b4,
    dustAlpha: 0.16,
    puffCount: 40,
    dripCount: 12,
  },
  surfaces: {
    wallRoughness: 0.88,
    wallMetallic: 0,
    floorRoughness: 0.62,
    floorMetallic: 0,
    ceilingRoughness: 0.95,
    ceilingMetallic: 0,
    grimeScale: 3.5,
    grimeStrength: 0.55,
    directIntensity: 1,
    environmentIntensity: 0.3,
    bathroomFloorRoughness: 0.18,
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
  volumetric: {
    exposure: 0.16,
    decay: 0.964,
    weight: 0.42,
    density: 0.92,
    samples: 40,
    ratio: 0.4,
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
};
