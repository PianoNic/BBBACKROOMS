import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Light } from "../net/protocol";
import { WALL_HEIGHT } from "../world/builder";
import { AMBIENCE, tierFeatures, type GraphicsTier } from "./ambience";
import { getSettings, onSettingsChange } from "../core/settings";
import { mulberry32, seedFromPos } from "../world/propBuilders/_common";
import { activeScene, basicMaterial, box, color3, group, lambertMaterial } from "./babylon";

const SPOT_COUNT = 1;
const POINT_COUNT = AMBIENCE.tube.poolSize - SPOT_COUNT;

type Pattern = "stable" | "buzzing" | "dying" | "strobing";

type Fixture = {
  x: number;
  z: number;
  region: number;
  material: StandardMaterial;
  pattern: Pattern;
  phase: number;
  rate: number;
  cycleLen: number;
  seed: number;
  intensity: number;
};

function hash01(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function flickerFactor(f: Fixture, elapsed: number): number {
  const t = elapsed + f.phase;
  if (f.pattern === "stable") {
    const ripple = Math.sin(t * f.rate * Math.PI * 2);
    return 1 - 0.02 * (0.5 - 0.5 * ripple);
  }
  if (f.pattern === "buzzing") {
    const ripple = Math.sin(t * f.rate * Math.PI * 2);
    return 1 - 0.06 * (0.5 - 0.5 * ripple);
  }
  if (f.pattern === "strobing") {
    return Math.sin(t * f.rate * Math.PI * 2) > 0 ? 1 : 0.05;
  }
  const idx = Math.floor(t / f.cycleLen);
  const local = t / f.cycleLen - idx;
  const base = f.seed + idx * 2654435761;
  if (hash01(base) >= 0.8) return 1;
  const dropStart = 0.5 + hash01(base + 1) * 0.4;
  const dropDur = 0.04 + hash01(base + 2) * 0.14;
  return local >= dropStart && local < dropStart + dropDur ? 0.03 : 1;
}

export class FlickerLights {
  readonly group = group("lights");
  private readonly fixtures: Fixture[] = [];
  private readonly spots: SpotLight[] = [];
  private readonly pool: (SpotLight | PointLight)[] = [];
  private readonly tubeColor: Color3;
  private shadowGenerators: ShadowGenerator[] = [];
  private shadowSlotCount = 0;
  private casters: AbstractMesh[] = [];
  private tier: GraphicsTier;
  private activeBlackout: { x: number; z: number; endTime: number } | null = null;
  private readonly regionOf: (x: number, z: number) => number;
  private regionMeshes = new Map<number, Mesh[]>();
  private allRegionMeshes: Mesh[] = [];
  private readonly excludedByRegion = new Map<number, Mesh[]>();
  private readonly slotRegion: (number | null)[] = [];

  constructor(positions: Light[], regionOf: (x: number, z: number) => number) {
    const ceilY = WALL_HEIGHT - 0.04;
    const scene = activeScene();
    const frameMat = lambertMaterial(0x2a2a2e, "lightFrame");
    this.tubeColor = color3(AMBIENCE.tube.color);
    this.regionOf = regionOf;

    for (const p of positions) {
      const fixture = group("fixture");
      const frame = box(1.6, 0.08, 0.52, frameMat);
      frame.position.y = ceilY;
      fixture.add(frame);
      const capL = box(0.06, 0.09, 0.5, frameMat);
      capL.position.set(-0.77, ceilY - 0.01, 0);
      const capR = box(0.06, 0.09, 0.5, frameMat);
      capR.position.set(0.77, ceilY - 0.01, 0);
      fixture.add(capL, capR);

      const fixtureMat = basicMaterial(this.tubeColor.clone(), "lightFixtureGlow");
      const tube1 = box(1.4, 0.025, 0.05, fixtureMat);
      tube1.position.set(0, ceilY - 0.045, -0.1);
      const tube2 = box(1.4, 0.025, 0.05, fixtureMat);
      tube2.position.set(0, ceilY - 0.045, 0.1);
      fixture.add(tube1, tube2);
      const panel = box(1.5, 0.04, 0.44, fixtureMat);
      panel.position.set(0, ceilY - 0.07, 0);
      fixture.add(panel);

      fixture.position.set(p.x, 0, p.z);
      fixture.rotation.y = p.yaw;
      this.group.add(fixture);
      fixture.computeWorldMatrix(true);
      fixture.freezeWorldMatrix();
      for (const m of [frame, capL, capR, tube1, tube2, panel]) {
        m.computeWorldMatrix(true);
        m.freezeWorldMatrix();
      }

      const seed = seedFromPos(p.x, p.z, 37.1, 61.7);
      const rng = mulberry32(seed);
      const r = rng();
      const pattern: Pattern =
        r < 0.55 ? "stable" : r < 0.75 ? "buzzing" : r < 0.90 ? "dying" : "strobing";
      const phase = rng() * 1000;
      let rate = 0;
      let cycleLen = 0;
      if (pattern === "stable") rate = 6 + rng() * 6;
      else if (pattern === "buzzing") rate = 30 + rng() * 25;
      else if (pattern === "strobing") rate = 4 + rng() * 6;
      else cycleLen = 4 + rng() * 5;

      this.fixtures.push({
        x: p.x, z: p.z, region: this.regionOf(p.x, p.z), material: fixtureMat,
        pattern, phase, rate, cycleLen, seed, intensity: 1,
      });
    }

    for (let i = 0; i < SPOT_COUNT; i++) {
      const sl = new SpotLight(
        `flickerSpot${i}`, new Vector3(0, ceilY - 0.15, 0), new Vector3(0, -1, 0),
        AMBIENCE.tube.spotAngle, AMBIENCE.tube.spotExponent, scene,
      );
      sl.diffuse = this.tubeColor.clone();
      sl.specular = Color3.Black();
      sl.range = AMBIENCE.tube.range;
      sl.intensity = 0;
      this.spots.push(sl);
      this.pool.push(sl);
    }
    for (let i = 0; i < POINT_COUNT; i++) {
      const pl = new PointLight(`flickerPoint${i}`, new Vector3(0, ceilY - 0.15, 0), scene);
      pl.diffuse = this.tubeColor.clone();
      pl.specular = Color3.Black();
      pl.range = AMBIENCE.tube.range;
      pl.intensity = 0;
      this.pool.push(pl);
    }
    for (let i = 0; i < this.pool.length; i++) this.slotRegion.push(null);

    this.tier = getSettings().graphicsTier;
    this.rebuildShadows(this.tier);
    onSettingsChange((s) => {
      if (s.graphicsTier !== this.tier) this.setTier(s.graphicsTier);
    });
  }

  setRegionMeshes(map: ReadonlyMap<number, Mesh[]>): void {
    this.regionMeshes = new Map();
    for (const [id, meshes] of map) this.regionMeshes.set(id, [...meshes]);
    this.allRegionMeshes = [];
    for (const meshes of this.regionMeshes.values()) this.allRegionMeshes.push(...meshes);
    this.excludedByRegion.clear();
    this.slotRegion.fill(null);
  }

  addRegionMeshes(regionId: number, meshes: readonly Mesh[]): void {
    if (meshes.length === 0) return;
    const list = this.regionMeshes.get(regionId);
    if (list) list.push(...meshes);
    else this.regionMeshes.set(regionId, [...meshes]);
    this.allRegionMeshes.push(...meshes);
    this.excludedByRegion.clear();
    this.slotRegion.fill(null);
  }

  setShadowCasters(meshes: AbstractMesh[]): void {
    this.casters = meshes.slice();
    for (const gen of this.shadowGenerators) {
      for (const m of this.casters) gen.addShadowCaster(m, false);
    }
  }

  addShadowCaster(mesh: AbstractMesh): void {
    this.casters.push(mesh);
    for (const gen of this.shadowGenerators) gen.addShadowCaster(mesh, false);
  }

  setTier(tier: GraphicsTier): void {
    this.tier = tier;
    this.rebuildShadows(tier);
  }

  private rebuildShadows(tier: GraphicsTier): void {
    for (const gen of this.shadowGenerators) gen.dispose();
    this.shadowGenerators = [];
    const count = Math.min(tierFeatures(tier).shadowLights, SPOT_COUNT);
    this.shadowSlotCount = count;
    const mapSize = tierFeatures(tier).shadowMapSize;
    const supportsShadowSampler = activeScene().getEngine().getCaps().depthTextureExtension;
    for (let i = 0; i < count; i++) {
      const spot = this.spots[i];
      spot.shadowMinZ = AMBIENCE.tube.shadowMinZ;
      spot.shadowMaxZ = AMBIENCE.tube.shadowMaxZ;
      const gen = new ShadowGenerator(mapSize, spot);
      if (supportsShadowSampler) {
        gen.usePercentageCloserFiltering = true;
        gen.filteringQuality = ShadowGenerator.QUALITY_LOW;
      } else {
        gen.useExponentialShadowMap = true;
      }
      gen.useContactHardeningShadow = false;
      gen.darkness = AMBIENCE.tube.shadowDarkness;
      gen.blurKernel = AMBIENCE.tube.shadowBlurKernel;
      gen.bias = AMBIENCE.tube.shadowBias;
      gen.normalBias = AMBIENCE.tube.shadowNormalBias;
      for (const m of this.casters) gen.addShadowCaster(m, false);
      this.shadowGenerators.push(gen);
    }
  }

  update(dt: number, elapsed: number, px = 0, pz = 0): void {
    if (this.activeBlackout) {
      if (elapsed >= this.activeBlackout.endTime) this.activeBlackout = null;
    } else if (this.fixtures.length > 0
      && Math.random() < AMBIENCE.tube.blackoutChancePerSecond * dt) {
      const epicentre = this.fixtures[Math.floor(Math.random() * this.fixtures.length)];
      const duration = AMBIENCE.tube.blackoutMinS
        + Math.random() * (AMBIENCE.tube.blackoutMaxS - AMBIENCE.tube.blackoutMinS);
      this.activeBlackout = { x: epicentre.x, z: epicentre.z, endTime: elapsed + duration };
    }

    const blackout = this.activeBlackout;
    const radius2 = AMBIENCE.tube.blackoutRadius * AMBIENCE.tube.blackoutRadius;
    const floor = AMBIENCE.tube.emissiveFloor;

    for (const f of this.fixtures) {
      const raw = flickerFactor(f, elapsed);
      let shown = raw < floor ? floor : raw;
      if (blackout) {
        const dx = f.x - blackout.x;
        const dz = f.z - blackout.z;
        if (dx * dx + dz * dz <= radius2) shown = 0;
      }
      f.intensity = shown;
      f.material.emissiveColor.set(
        this.tubeColor.r * shown, this.tubeColor.g * shown, this.tubeColor.b * shown,
      );
    }

    if (this.fixtures.length === 0) return;
    const distances: { i: number; d: number }[] = [];
    for (let i = 0; i < this.fixtures.length; i++) {
      const f = this.fixtures[i];
      const dx = f.x - px;
      const dz = f.z - pz;
      distances.push({ i, d: dx * dx + dz * dz });
    }
    distances.sort((a, b) => a.d - b.d);

    const playerRegion = this.regionOf(px, pz);
    const ordered: number[] = [];
    const used = new Set<number>();
    for (const d of distances) {
      if (ordered.length >= this.shadowSlotCount) break;
      if (this.fixtures[d.i].region === playerRegion) {
        ordered.push(d.i);
        used.add(d.i);
      }
    }
    for (const d of distances) {
      if (ordered.length >= this.shadowSlotCount) break;
      if (!used.has(d.i)) {
        ordered.push(d.i);
        used.add(d.i);
      }
    }
    for (const d of distances) {
      if (!used.has(d.i)) {
        ordered.push(d.i);
        used.add(d.i);
      }
    }

    for (let k = 0; k < this.pool.length; k++) {
      const slot = this.pool[k];
      if (k >= ordered.length) {
        slot.intensity = 0;
        continue;
      }
      const f = this.fixtures[ordered[k]];
      slot.position.set(f.x, WALL_HEIGHT - 0.19, f.z);
      slot.intensity = AMBIENCE.tube.baseIntensity * f.intensity;
      this.applySlotRegion(k, slot, f.region);
    }
  }

  private applySlotRegion(k: number, slot: SpotLight | PointLight, region: number): void {
    if (this.slotRegion[k] === region) return;
    this.slotRegion[k] = region;
    slot.excludedMeshes = this.excludedFor(region);
  }

  private excludedFor(region: number): Mesh[] {
    const cached = this.excludedByRegion.get(region);
    if (cached) return cached;
    const owned = new Set<Mesh>(this.regionMeshes.get(region) ?? []);
    const excluded = this.allRegionMeshes.filter((m) => !owned.has(m));
    this.excludedByRegion.set(region, excluded);
    return excluded;
  }
}
