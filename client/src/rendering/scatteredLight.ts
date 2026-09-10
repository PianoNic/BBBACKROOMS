import "@babylonjs/core/Meshes/thinInstanceMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Light } from "../net/protocol";
import { AMBIENCE } from "./ambience";

export const SCATTER_MIN = 0.45;
export const SCATTER_RADIUS = 9;
export const BLACKOUT_FACTOR = 0.25;

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function bucketKey(x: number, z: number): string {
  return `${Math.floor(x / SCATTER_RADIUS)}:${Math.floor(z / SCATTER_RADIUS)}`;
}

type RegisteredMesh = {
  mesh: Mesh;
  worldXZ: Float32Array;
  base: Float32Array;
  colors: Float32Array;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  darkened: boolean;
};

export class ScatteredLight {
  private readonly buckets = new Map<string, Light[]>();
  private readonly hasFixtures: boolean;
  private readonly entries: RegisteredMesh[] = [];
  private lastCentre: { x: number; z: number } | null = null;

  constructor(lights: readonly Light[]) {
    this.hasFixtures = lights.length > 0;
    for (const l of lights) {
      const key = bucketKey(l.x, l.z);
      const list = this.buckets.get(key);
      if (list) list.push(l);
      else this.buckets.set(key, [l]);
    }
  }

  brightnessAt(x: number, z: number): number {
    if (!this.hasFixtures) return 1;
    const bx = Math.floor(x / SCATTER_RADIUS);
    const bz = Math.floor(z / SCATTER_RADIUS);
    let maxTerm = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = this.buckets.get(`${bx + dx}:${bz + dz}`);
        if (!list) continue;
        for (const l of list) {
          const ddx = x - l.x;
          const ddz = z - l.z;
          const d = Math.sqrt(ddx * ddx + ddz * ddz);
          const term = clamp01(1 - d / SCATTER_RADIUS);
          if (term > maxTerm) maxTerm = term;
        }
      }
    }
    return SCATTER_MIN + (1 - SCATTER_MIN) * maxTerm;
  }

  register(mesh: Mesh, worldXZ: Float32Array): void {
    const n = worldXZ.length / 2;
    const base = new Float32Array(n);
    const colors = new Float32Array(n * 4);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = worldXZ[i * 2];
      const z = worldXZ[i * 2 + 1];
      const b = this.brightnessAt(x, z);
      base[i] = b;
      colors[i * 4] = b;
      colors[i * 4 + 1] = b;
      colors[i * 4 + 2] = b;
      colors[i * 4 + 3] = 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    mesh.thinInstanceSetBuffer("color", colors, 4, false);
    mesh.hasVertexAlpha = false;
    this.entries.push({
      mesh, worldXZ, base, colors, minX, maxX, minZ, maxZ, darkened: false,
    });
  }

  applyBlackout(centre: { x: number; z: number } | null): void {
    const prev = this.lastCentre;
    const unchanged = prev === null
      ? centre === null
      : centre !== null && prev.x === centre.x && prev.z === centre.z;
    if (unchanged) return;
    this.lastCentre = centre ? { x: centre.x, z: centre.z } : null;

    if (centre === null) {
      for (const e of this.entries) {
        if (!e.darkened) continue;
        this.restoreEntry(e);
      }
      return;
    }

    const radius = AMBIENCE.tube.blackoutRadius;
    const radius2 = radius * radius;
    const cx = centre.x;
    const cz = centre.z;
    for (const e of this.entries) {
      if (cx < e.minX - radius || cx > e.maxX + radius
        || cz < e.minZ - radius || cz > e.maxZ + radius) {
        if (e.darkened) this.restoreEntry(e);
        continue;
      }
      const n = e.base.length;
      let touched = false;
      for (let i = 0; i < n; i++) {
        const dx = e.worldXZ[i * 2] - cx;
        const dz = e.worldXZ[i * 2 + 1] - cz;
        const inside = dx * dx + dz * dz <= radius2;
        const b = inside ? e.base[i] * BLACKOUT_FACTOR : e.base[i];
        e.colors[i * 4] = b;
        e.colors[i * 4 + 1] = b;
        e.colors[i * 4 + 2] = b;
        if (inside) touched = true;
      }
      e.mesh.thinInstanceBufferUpdated("color");
      e.darkened = touched;
    }
  }

  private restoreEntry(e: RegisteredMesh): void {
    const n = e.base.length;
    for (let i = 0; i < n; i++) {
      const b = e.base[i];
      e.colors[i * 4] = b;
      e.colors[i * 4 + 1] = b;
      e.colors[i * 4 + 2] = b;
    }
    e.mesh.thinInstanceBufferUpdated("color");
    e.darkened = false;
  }
}
