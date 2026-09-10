import { describe, it, expect } from "vitest";
import {
  MODEL_NATIVE_FRONT, MODEL_PROPS, PICKUP_MODELS, SITTER_FACING_TYPES,
  type ModelFrontAxis,
} from "./modelProps";
import footprints from "./footprints.json";

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

  it("no longer carries a lod field on any spec", () => {
    for (const [type, entry] of Object.entries(MODEL_PROPS)) {
      expect(entry, type).not.toHaveProperty("lod");
    }
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

describe("model orientation", () => {
  const YAW_TOLERANCE = 1e-9;

  function resolvedFront(native: ModelFrontAxis, yawOffset: number): ModelFrontAxis {
    if (native === "symmetric") return "symmetric";
    const flipped = Math.abs(yawOffset - Math.PI) < YAW_TOLERANCE;
    if (!flipped) return native;
    return native === "plusZ" ? "minusZ" : "plusZ";
  }

  it("has exactly the same key set as MODEL_PROPS", () => {
    const modelKeys = Object.keys(MODEL_PROPS).sort();
    const nativeFrontKeys = Object.keys(MODEL_NATIVE_FRONT).sort();
    expect(nativeFrontKeys).toEqual(modelKeys);
  });

  it("only ever uses a yawOffset of 0 or PI, never a quarter turn", () => {
    for (const [type, entry] of Object.entries(MODEL_PROPS)) {
      const yawOffset = entry!.yawOffset;
      const isZero = Math.abs(yawOffset) < YAW_TOLERANCE;
      const isPi = Math.abs(yawOffset - Math.PI) < YAW_TOLERANCE;
      expect(isZero || isPi, `${type}.yawOffset = ${yawOffset}`).toBe(true);
    }
  });

  it("matches footprints.json's yawOffset for every entry", () => {
    for (const [type, entry] of Object.entries(MODEL_PROPS)) {
      const fp = (footprints.props as Record<string, { yawOffset: number }>)[type];
      expect(fp, `footprints.json is missing "${type}"`).toBeDefined();
      expect(entry!.yawOffset).toBeCloseTo(fp.yawOffset, 9);
    }
  });

  it("resolves every non-symmetric prop's front toward the room, except sitter-facing types", () => {
    for (const [type, entry] of Object.entries(MODEL_PROPS)) {
      const native = MODEL_NATIVE_FRONT[type];
      if (native === "symmetric") continue;
      const resolved = resolvedFront(native, entry!.yawOffset);
      const expected = SITTER_FACING_TYPES.has(type as never) ? "plusZ" : "minusZ";
      expect(resolved, type).toBe(expected);
    }
  });

  it("never applies a yawOffset to a rotationally symmetric prop", () => {
    for (const [type, native] of Object.entries(MODEL_NATIVE_FRONT)) {
      if (native !== "symmetric") continue;
      const entry = MODEL_PROPS[type as keyof typeof MODEL_PROPS];
      expect(entry!.yawOffset, type).toBe(0);
    }
  });

  it("never resolves a wall-anchored prop's front toward the wall", () => {
    for (const [type, entry] of Object.entries(MODEL_PROPS)) {
      if (entry!.anchor !== "wall" && entry!.anchor !== "wallMounted") continue;
      const native = MODEL_NATIVE_FRONT[type];
      const resolved = resolvedFront(native, entry!.yawOffset);
      expect(resolved, type).not.toBe("plusZ");
    }
  });
});
