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
};

export const TIERS: Record<GraphicsTier, TierFeatures> = {
  niedrig: { shadowLights: 0, shadowMapSize: 256, ssao: false, ssaoRatio: 0.25, volumetric: false, bloom: true,  bloomKernel: 24, fxaa: false, particleScale: 0,   glow: false },
  mittel:  { shadowLights: 2, shadowMapSize: 512, ssao: true,  ssaoRatio: 0.5,  volumetric: false, bloom: true,  bloomKernel: 48, fxaa: true,  particleScale: 1,   glow: true  },
  hoch:    { shadowLights: 4, shadowMapSize: 512, ssao: true,  ssaoRatio: 0.5,  volumetric: true,  bloom: true,  bloomKernel: 64, fxaa: true,  particleScale: 2,   glow: true  },
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
    intensity: 0.22,
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
  tube: {} as Record<string, number>,
  glow: {} as Record<string, number>,
  ssao: {} as Record<string, number>,
  particles: {} as Record<string, number>,
  surfaces: {} as Record<string, number>,
  cues: {} as Record<string, number>,
  audio: {} as Record<string, number>,
};
