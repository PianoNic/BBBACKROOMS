import { describe, it, expect } from "vitest";
import {
  JUMPSCARE_VARIANTS, MIN_FLASH_INTERVAL_MS, MAX_FLASHES_PER_SECOND,
  flashTimesMs, totalDurationMs, pickJumpscareVariant,
} from "./jumpscareTiming";

describe("JUMPSCARE_VARIANTS", () => {
  it("has unique ids", () => {
    const ids = JUMPSCARE_VARIANTS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has 2 or 3 flicker cuts per variant", () => {
    for (const variant of JUMPSCARE_VARIANTS) {
      expect(variant.flickerAtMs.length).toBeGreaterThanOrEqual(2);
      expect(variant.flickerAtMs.length).toBeLessThanOrEqual(3);
    }
  });

  it("keeps every consecutive flash at least MIN_FLASH_INTERVAL_MS apart", () => {
    for (const variant of JUMPSCARE_VARIANTS) {
      const times = flashTimesMs(variant);
      for (let i = 1; i < times.length; i++) {
        expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(MIN_FLASH_INTERVAL_MS);
      }
    }
  });

  it("never puts more than MAX_FLASHES_PER_SECOND flashes in any 1000ms window", () => {
    for (const variant of JUMPSCARE_VARIANTS) {
      const times = flashTimesMs(variant);
      for (const start of times) {
        const count = times.filter((t) => t >= start && t < start + 1000).length;
        expect(count).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
      }
    }
  });

  it("only flickers after the entry finishes and before the hold ends", () => {
    for (const variant of JUMPSCARE_VARIANTS) {
      const entryEndMs = variant.blackMs + variant.entryMs;
      for (const at of variant.flickerAtMs) {
        expect(at).toBeGreaterThan(entryEndMs);
        expect(at + variant.flickerMs).toBeLessThan(variant.holdEndMs);
      }
    }
  });

  it("finishes within 2400ms", () => {
    for (const variant of JUMPSCARE_VARIANTS) {
      expect(totalDurationMs(variant)).toBeLessThanOrEqual(2400);
    }
  });
});

describe("pickJumpscareVariant", () => {
  it("returns the variant matching the injected random value", () => {
    const count = JUMPSCARE_VARIANTS.length;
    JUMPSCARE_VARIANTS.forEach((variant, index) => {
      const picked = pickJumpscareVariant(() => index / count);
      expect(picked).toBe(variant);
    });
  });

  it("never returns undefined, even at the top edge of the random range", () => {
    const edgeValues = [0, 0.1, 0.5, 0.9, 0.999999, 1];
    for (const value of edgeValues) {
      expect(pickJumpscareVariant(() => value)).toBeDefined();
    }
  });
});
