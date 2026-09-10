import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Light } from "../net/protocol";
import { WALL_HEIGHT } from "../world/builder";
import { AMBIENCE } from "./ambience";
import { mulberry32, seedFromPos } from "../world/propBuilders/_common";
import { basicMaterial, box, color3, group, lambertMaterial } from "./babylon";

type Pattern = "stable" | "buzzing" | "dying" | "strobing";

type Fixture = {
  x: number;
  z: number;
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
  private readonly tubeColor: Color3;
  private activeBlackout: { x: number; z: number; endTime: number } | null = null;

  constructor(positions: Light[]) {
    const ceilY = WALL_HEIGHT - 0.04;
    const frameMat = lambertMaterial(0x2a2a2e, "lightFrame");
    this.tubeColor = color3(AMBIENCE.tube.color);

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
        x: p.x, z: p.z, material: fixtureMat,
        pattern, phase, rate, cycleLen, seed, intensity: 1,
      });
    }
  }

  update(dt: number, elapsed: number): void {
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
  }

  averageIntensityNear(x: number, z: number): number {
    if (this.fixtures.length === 0) return 1;
    const radius2 = AMBIENCE.ambientLight.radius * AMBIENCE.ambientLight.radius;
    let sum = 0;
    let count = 0;
    let nearestIntensity = this.fixtures[0].intensity;
    let nearestDist2 = Infinity;
    for (const f of this.fixtures) {
      const dx = f.x - x;
      const dz = f.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= radius2) {
        sum += f.intensity;
        count += 1;
      }
      if (d2 < nearestDist2) {
        nearestDist2 = d2;
        nearestIntensity = f.intensity;
      }
    }
    if (count > 0) return sum / count;
    return nearestIntensity;
  }
}
