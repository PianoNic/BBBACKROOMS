import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Light } from "../net/protocol";
import { WALL_HEIGHT } from "../world/builder";
import { activeScene, basicMaterial, box, group, lambertMaterial } from "./babylon";

// Babylon's StandardMaterial uses a linear point-light falloff
// (1 - d/range) instead of the inverse-square curve three.js used, so the
// intensity/range pair below is fitted to the old 28-candela / decay-2
// curve across the 3–12 m band that actually shows on screen.
const BASE_INTENSITY = 2.6;
const RANGE = 13;
// Number of real `PointLight`s active at any moment. WebGL caps the
// fragment-shader uniform vectors at ~1024, and every light eats a chunk
// of that budget — keeping the pool small avoids shader-compile failures.
const POOL_SIZE = 6;

type Fixture = {
  x: number;
  z: number;
  diffuser: StandardMaterial;
  seed: number;
  intensity: number; // current flicker factor 0..1
};

export class FlickerLights {
  readonly group = group("lights");
  private readonly fixtures: Fixture[] = [];
  private readonly pool: PointLight[] = [];

  constructor(positions: Light[]) {
    const ceilY = WALL_HEIGHT - 0.04;
    const scene = activeScene();
    const frameMat = lambertMaterial(0x2a2a2e, "lightFrame");
    const tubeMat = basicMaterial(0xfff5d6, "lightTube");

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
      const tube1 = box(1.4, 0.025, 0.05, tubeMat);
      tube1.position.set(0, ceilY - 0.045, -0.1);
      const tube2 = box(1.4, 0.025, 0.05, tubeMat);
      tube2.position.set(0, ceilY - 0.045, 0.1);
      fixture.add(tube1, tube2);
      const diffuser = basicMaterial(0xfff1c2, "lightDiffuser");
      const panel = box(1.5, 0.04, 0.44, diffuser);
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

      this.fixtures.push({
        x: p.x, z: p.z, diffuser,
        seed: Math.random() * 1000, intensity: 1.0,
      });
    }

    // Pool of real point lights. Repositioned each frame to the nearest
    // fixtures so the shader sees a constant light count and only ever
    // compiles the program once.
    for (let i = 0; i < POOL_SIZE; i++) {
      const pl = new PointLight(`flicker${i}`, new Vector3(0, ceilY - 0.15, 0), scene);
      pl.diffuse = new Color3(1, 0.945, 0.761);
      pl.specular = Color3.Black();
      pl.range = RANGE;
      pl.intensity = 0;
      this.pool.push(pl);
    }
  }

  /** Per-frame: update flicker intensity on every fixture and re-target
   *  the point-light pool to the N nearest fixtures. */
  update(elapsed: number, px = 0, pz = 0): void {
    for (const f of this.fixtures) {
      const t = elapsed + f.seed;
      const dip = Math.sin(t * 13) * Math.sin(t * 1.7) > 0.85 ? 0.15 : 1.0;
      const jitter = 0.92 + Math.sin(t * 40) * 0.04;
      f.intensity = dip * jitter;
      f.diffuser.emissiveColor.set(
        f.intensity, f.intensity * 0.95, f.intensity * 0.78,
      );
    }
    // Find the POOL_SIZE nearest fixtures to (px, pz). Linear scan is
    // fine: 300 fixtures × small N is <1ms.
    if (this.fixtures.length === 0) return;
    const distances: { i: number; d: number }[] = [];
    for (let i = 0; i < this.fixtures.length; i++) {
      const f = this.fixtures[i];
      const dx = f.x - px;
      const dz = f.z - pz;
      distances.push({ i, d: dx * dx + dz * dz });
    }
    distances.sort((a, b) => a.d - b.d);
    for (let k = 0; k < this.pool.length; k++) {
      const slot = this.pool[k];
      if (k >= distances.length) {
        slot.intensity = 0;
        continue;
      }
      const f = this.fixtures[distances[k].i];
      slot.position.set(f.x, WALL_HEIGHT - 0.19, f.z);
      slot.intensity = BASE_INTENSITY * f.intensity;
    }
  }
}
