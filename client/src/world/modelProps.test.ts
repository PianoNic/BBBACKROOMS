import { describe, it, expect } from "vitest";
import { MODEL_PROPS, PICKUP_MODELS } from "./modelProps";
import footprints from "../../public/models/footprints.json";

const PICKUP_KINDS = ["medkit", "potion", "compass", "tracker", "goggles", "gps"] as const;

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

  it("has a finite, positive per-axis scale for every prop spec", () => {
    for (const [type, entry] of Object.entries(MODEL_PROPS)) {
      expect(Number.isFinite(entry?.scale), `${type}.scale`).toBe(true);
      expect(Number.isFinite(entry?.scaleY), `${type}.scaleY`).toBe(true);
      expect(Number.isFinite(entry?.scaleZ), `${type}.scaleZ`).toBe(true);
      expect(entry!.scale).toBeGreaterThan(0);
      expect(entry!.scaleY).toBeGreaterThan(0);
      expect(entry!.scaleZ).toBeGreaterThan(0);
    }
  });

  it("gives the locker spec a hinge with a non-empty node name", () => {
    const locker = MODEL_PROPS.locker;
    expect(locker?.hinge, "MODEL_PROPS.locker is missing a hinge").toBeDefined();
    expect(typeof locker?.hinge?.node).toBe("string");
    expect(locker?.hinge?.node.length).toBeGreaterThan(0);
  });
});

describe("PICKUP_MODELS drift guard", () => {
  it("has an entry for every PickupKind", () => {
    for (const kind of PICKUP_KINDS) {
      expect(PICKUP_MODELS[kind], `PICKUP_MODELS is missing "${kind}"`).toBeDefined();
    }
  });

  it("has a finite, positive per-axis scale for every pickup spec", () => {
    for (const kind of PICKUP_KINDS) {
      const entry = PICKUP_MODELS[kind];
      expect(Number.isFinite(entry?.scale), `${kind}.scale`).toBe(true);
      expect(Number.isFinite(entry?.scaleY), `${kind}.scaleY`).toBe(true);
      expect(Number.isFinite(entry?.scaleZ), `${kind}.scaleZ`).toBe(true);
      expect(entry!.scale).toBeGreaterThan(0);
      expect(entry!.scaleY).toBeGreaterThan(0);
      expect(entry!.scaleZ).toBeGreaterThan(0);
    }
  });
});
