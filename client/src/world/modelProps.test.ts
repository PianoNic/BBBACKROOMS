import { describe, it, expect } from "vitest";
import { MODEL_PROPS } from "./modelProps";
import footprints from "../../public/models/footprints.json";

describe("MODEL_PROPS drift guard", () => {
  it("has the exact same key set as footprints.json's props", () => {
    const modelKeys = Object.keys(MODEL_PROPS).sort();
    const footprintKeys = Object.keys(footprints.props).sort();
    expect(modelKeys).toEqual(footprintKeys);
  });

  it("matches footprints.json's model path and scale for every entry", () => {
    for (const [type, entry] of Object.entries(MODEL_PROPS)) {
      const fp = (footprints.props as Record<string, { model: string; scale: number }>)[type];
      expect(fp, `footprints.json is missing "${type}"`).toBeDefined();
      expect(entry?.model).toBe(fp.model);
      expect(entry?.scale).toBe(fp.scale);
    }
  });
});
