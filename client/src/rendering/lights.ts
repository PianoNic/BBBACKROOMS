import * as THREE from "three";
import type { Light } from "../net/protocol";
import { WALL_HEIGHT } from "../world/builder";

const BASE_INTENSITY = 20;
const RANGE = 20;

type Fixture = {
  light: THREE.PointLight;
  diffuser: THREE.MeshBasicMaterial;
  seed: number;
};

// Shared geometries / materials — one allocation, instanced via cloning materials per fixture.
const FRAME_GEOM = new THREE.BoxGeometry(1.6, 0.08, 0.52);
const DIFFUSER_GEOM = new THREE.BoxGeometry(1.5, 0.04, 0.44);
const TUBE_GEOM = new THREE.BoxGeometry(1.4, 0.025, 0.05);
const END_CAP_GEOM = new THREE.BoxGeometry(0.06, 0.09, 0.5);

const FRAME_MAT = new THREE.MeshLambertMaterial({ color: 0x2a2a2e });
const TUBE_MAT = new THREE.MeshBasicMaterial({ color: 0xfff5d6 });

export class FlickerLights {
  readonly group = new THREE.Group();
  private readonly fixtures: Fixture[] = [];

  constructor(positions: Light[]) {
    const ceilY = WALL_HEIGHT - 0.04;

    for (const p of positions) {
      const fixture = new THREE.Group();

      // Recessed frame flush with the ceiling.
      const frame = new THREE.Mesh(FRAME_GEOM, FRAME_MAT);
      frame.position.y = ceilY;
      fixture.add(frame);

      // End caps (sides of the troffer).
      const capL = new THREE.Mesh(END_CAP_GEOM, FRAME_MAT);
      capL.position.set(-0.77, ceilY - 0.01, 0);
      const capR = new THREE.Mesh(END_CAP_GEOM, FRAME_MAT);
      capR.position.set(0.77, ceilY - 0.01, 0);
      fixture.add(capL, capR);

      // Two thin tubes behind the diffuser — emissive feel.
      const tube1 = new THREE.Mesh(TUBE_GEOM, TUBE_MAT);
      tube1.position.set(0, ceilY - 0.045, -0.1);
      const tube2 = new THREE.Mesh(TUBE_GEOM, TUBE_MAT);
      tube2.position.set(0, ceilY - 0.045, 0.1);
      fixture.add(tube1, tube2);

      // Bright diffuser panel — owned per-fixture so we can flicker it independently.
      const diffuser = new THREE.MeshBasicMaterial({ color: 0xfff1c2 });
      const panel = new THREE.Mesh(DIFFUSER_GEOM, diffuser);
      panel.position.set(0, ceilY - 0.07, 0);
      fixture.add(panel);

      fixture.position.set(p.x, 0, p.z);
      fixture.rotation.y = p.yaw;
      this.group.add(fixture);

      const light = new THREE.PointLight(0xfff1c2, BASE_INTENSITY, RANGE, 2);
      light.position.set(p.x, ceilY - 0.15, p.z);
      this.group.add(light);

      this.fixtures.push({ light, diffuser, seed: Math.random() * 1000 });
    }
  }

  update(elapsed: number): void {
    for (const { light, diffuser, seed } of this.fixtures) {
      const t = elapsed + seed;
      const dip = Math.sin(t * 13) * Math.sin(t * 1.7) > 0.85 ? 0.15 : 1.0;
      const jitter = 0.92 + Math.sin(t * 40) * 0.04;
      const f = dip * jitter;
      light.intensity = BASE_INTENSITY * f;
      diffuser.color.setRGB(f, f * 0.95, f * 0.78);
    }
  }
}
