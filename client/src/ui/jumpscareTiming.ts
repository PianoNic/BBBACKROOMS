export type JumpscareEntry = "slam" | "creep";

export type JumpscareVariant = {
  id: string;
  entry: JumpscareEntry;
  blackMs: number;
  entryMs: number;
  entryScale: number;
  shakeMs: number;
  flickerAtMs: readonly number[];
  flickerMs: number;
  holdEndMs: number;
  fadeMs: number;
};

export const MIN_FLASH_INTERVAL_MS = 340;
export const MAX_FLASHES_PER_SECOND = 3;

export const JUMPSCARE_VARIANTS: readonly JumpscareVariant[] = [
  {
    id: "slam", entry: "slam", blackMs: 60, entryMs: 120, entryScale: 1.35,
    shakeMs: 400, flickerAtMs: [420, 780, 1140], flickerMs: 45, holdEndMs: 2080, fadeMs: 320,
  },
  {
    id: "double", entry: "slam", blackMs: 90, entryMs: 110, entryScale: 1.42,
    shakeMs: 340, flickerAtMs: [400, 760], flickerMs: 40, holdEndMs: 2120, fadeMs: 280,
  },
  {
    id: "creep", entry: "creep", blackMs: 140, entryMs: 420, entryScale: 1.6,
    shakeMs: 240, flickerAtMs: [900, 1250], flickerMs: 45, holdEndMs: 2100, fadeMs: 300,
  },
];

export function flashTimesMs(variant: JumpscareVariant): number[] {
  const times = [variant.blackMs, ...variant.flickerAtMs.map((at) => at + variant.flickerMs)];
  return times.sort((a, b) => a - b);
}

export function totalDurationMs(variant: JumpscareVariant): number {
  return variant.holdEndMs + variant.fadeMs;
}

export function pickJumpscareVariant(random: () => number = Math.random): JumpscareVariant {
  const index = Math.min(
    JUMPSCARE_VARIANTS.length - 1,
    Math.floor(random() * JUMPSCARE_VARIANTS.length),
  );
  return JUMPSCARE_VARIANTS[index];
}
