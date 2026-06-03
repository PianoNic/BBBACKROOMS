import * as THREE from "three";
import type { Light } from "../net/protocol";
import { WALL_HEIGHT } from "../world/builder";

const BASE_INTENSITY = 28;
const RANGE = 22;
// Number of real `PointLight`s active at any moment. WebGL caps the
// fragment-shader uniform vectors at ~1024, and every light eats a chunk
// of that budget — keeping the pool small avoids shader-compile failures.
const POOL_SIZE = 6;

type Fixture = {
  x: number;
  z: number;
  diffuser: THREE.MeshBasicMaterial;
  seed: number;
  intensity: number; // current flicker factor 0..1
};

const FRAME_GEOM = new THREE.BoxGeometry(1.6, 0.08, 0.52);
const DIFFUSER_GEOM = new THREE.BoxGeometry(1.5, 0.04, 0.44);
const TUBE_GEOM = new THREE.BoxGeometry(1.4, 0.025, 0.05);
const END_CAP_GEOM = new THREE.BoxGeometry(0.06, 0.09, 0.5);

const FRAME_MAT = new THREE.MeshLambertMaterial({ color: 0x2a2a2e });
const TUBE_MAT = new THREE.MeshBasicMaterial({ color: 0xfff5d6 });

export class FlickerLights {
  readonly group = new THREE.Group();
  private readonly fixtures: Fixture[] = [];
  private readonly pool: THREE.PointLight[] = [];

  constructor(positions: Light[]) {
    const ceilY = WALL_HEIGHT - 0.04;

    for (const p of positions) {
      const fixture = new THREE.Group();
      const frame = new THREE.Mesh(FRAME_GEOM, FRAME_MAT);
      frame.position.y = ceilY;
      fixture.add(frame);
      const capL = new THREE.Mesh(END_CAP_GEOM, FRAME_MAT);
      capL.position.set(-0.77, ceilY - 0.01, 0);
      const capR = new THREE.Mesh(END_CAP_GEOM, FRAME_MAT);
      capR.position.set(0.77, ceilY - 0.01, 0);
      fixture.add(capL, capR);
      const tube1 = new THREE.Mesh(TUBE_GEOM, TUBE_MAT);
      tube1.position.set(0, ceilY - 0.045, -0.1);
      const tube2 = new THREE.Mesh(TUBE_GEOM, TUBE_MAT);
      tube2.position.set(0, ceilY - 0.045, 0.1);
      fixture.add(tube1, tube2);
      const diffuser = new THREE.MeshBasicMaterial({ color: 0xfff1c2 });
      const panel = new THREE.Mesh(DIFFUSER_GEOM, diffuser);
      panel.position.set(0, ceilY - 0.07, 0);
      fixture.add(panel);

      fixture.position.set(p.x, 0, p.z);
      fixture.rotation.y = p.yaw;
      this.group.add(fixture);

      this.fixtures.push({
        x: p.x, z: p.z, diffuser,
        seed: Math.random() * 1000, intensity: 1.0,
      });
    }

    // Pool of real point lights. Repositioned each frame to the nearest
    // fixtures so the shader sees a constant light count and only ever
    // compiles the program once.
    for (let i = 0; i < POOL_SIZE; i++) {
      const pl = new THREE.PointLight(0xfff1c2, 0, RANGE, 2);
      pl.position.set(0, ceilY - 0.15, 0);
      this.group.add(pl);
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
      f.diffuser.color.setRGB(f.intensity, f.intensity * 0.95, f.intensity * 0.78);
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
