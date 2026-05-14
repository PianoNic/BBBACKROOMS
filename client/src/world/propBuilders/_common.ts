/** Shared types + material factories used by the per-theme prop builders.
 *
 *  IMPORTANT: materials are cached per (type, color). Two props that ask
 *  for the same colored lambert get the SAME material instance — which
 *  means the static-prop merger in `rendering/staticMerge.ts` can
 *  collapse hundreds of meshes into a single draw call per color. */
import * as THREE from "three";
import type { Prop } from "../../net/protocol";

export type Builder = (prop: Prop) => THREE.Object3D;

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

const M_CACHE = new Map<number, THREE.MeshLambertMaterial>();
export const M = (color: number): THREE.MeshLambertMaterial => {
  let mat = M_CACHE.get(color);
  if (!mat) {
    mat = new THREE.MeshLambertMaterial({ color });
    M_CACHE.set(color, mat);
  }
  return mat;
};

const B_CACHE = new Map<number, THREE.MeshBasicMaterial>();
export const Basic = (color: number): THREE.MeshBasicMaterial => {
  let mat = B_CACHE.get(color);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({ color });
    B_CACHE.set(color, mat);
  }
  return mat;
};
