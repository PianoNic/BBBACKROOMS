/** Shared types + material factories used by the per-theme prop builders.
 *
 *  IMPORTANT: materials are cached per (type, color). Two props that ask
 *  for the same colored lambert get the SAME material instance — which
 *  means the static-prop merger in `rendering/staticMerge.ts` can
 *  collapse hundreds of meshes into a single draw call per color. */
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Prop } from "../../net/protocol";
import { group } from "../../rendering/babylon";

export { M, Basic } from "../../rendering/babylon";

export type Builder = (prop: Prop) => TransformNode;

/** Wrap a wall-prop builder so its mesh contents are offset away from the
 *  wall by `depth` metres (along local +Z, the wall direction). Use when
 *  the underlying builder centres its meshes at z=0; without the shift,
 *  half the prop clips inside the wall. The outer group's position is
 *  overwritten by the placement code, so we offset an inner wrapper. */
export function offsetFromWall(build: Builder, depth: number): Builder {
  return (prop) => {
    const wrapper = group("wallOffset");
    const inner = build(prop);
    inner.position.z -= depth;
    wrapper.add(inner);
    return wrapper;
  };
}

/** Hash a prop's world (x, z) into an integer seed. The two multipliers
 *  scatter neighbouring props onto unrelated PRNG sequences — each builder
 *  picks its own pair so a bookshelf and a bulletin board at the same
 *  position don't share visual variation. */
export function seedFromPos(
  x: number, z: number, mulX: number, mulZ: number,
): number {
  return (x * mulX + z * mulZ) | 0;
}

/** XZ unit vector pointing away from a wall-mounted prop's face into the
 *  room. Wall-prop builders place the visible front on local -Z, and the
 *  placement code rotates yaw so that local -Z maps to the room direction
 *  — so world-space "into the room" is `(-sin yaw, -cos yaw) * distance`. */
export function wallForward(
  yaw: number, distance: number,
): { dx: number; dz: number } {
  return { dx: -Math.sin(yaw) * distance, dz: -Math.cos(yaw) * distance };
}

/** Deterministic PRNG seeded by an integer. Same seed → same sequence.
 *  Used by builders that want per-prop visual variation (whiteboard
 *  scribbles, bookshelf book widths, bulletin notes) without networked
 *  state — the seed is derived from the prop's world coords. */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
