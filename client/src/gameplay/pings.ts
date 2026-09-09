/** In-world teammate ping markers: a bobbing diamond over a light beam and
 *  ground ring in the pinging player's colour. Markers live ~6 seconds and
 *  fade out over the last one. Minimap dots come from `getMapDots`. */
import type { Group, Mesh, StandardMaterial } from "../rendering/babylon";
import {
  Color3, basicMaterial, cylinder, group, octahedron, ring,
} from "../rendering/babylon";

const LIFETIME_S = 6;
const FADE_S = 1;
const DIAMOND_Y = 1.7;

type Entry = {
  group: Group;
  diamond: Mesh;
  mats: StandardMaterial[];
  born: number;
  x: number;
  z: number;
  color: string;
};

export class Pings {
  readonly group = group("pings");
  private readonly entries: Entry[] = [];
  private elapsed = 0;

  add(x: number, z: number, color: string): void {
    const c = Color3.FromHexString(color);
    const g = group("ping");
    const mats: StandardMaterial[] = [];
    const mat = (opacity: number): StandardMaterial => {
      const m = basicMaterial(c);
      m.alpha = opacity;
      m.disableDepthWrite = true;
      m.metadata = { baseOpacity: opacity };
      mats.push(m);
      return m;
    };

    const diamond = octahedron(0.22, mat(0.95));
    diamond.position.y = DIAMOND_Y;
    g.add(diamond);

    const beam = cylinder(0.05, 0.05, DIAMOND_Y, 8, mat(0.25));
    beam.position.y = DIAMOND_Y / 2;
    g.add(beam);

    const ringMesh = ring(0.3, 0.45, 24, mat(0.55), true);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.03;
    g.add(ringMesh);

    g.position.set(x, 0, z);
    this.group.add(g);
    this.entries.push({ group: g, diamond, mats, born: this.elapsed, x, z, color });
  }

  update(elapsed: number): void {
    this.elapsed = elapsed;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const p = this.entries[i];
      const age = elapsed - p.born;
      if (age >= LIFETIME_S) {
        this.dispose(p);
        this.entries.splice(i, 1);
        continue;
      }
      p.diamond.rotation.y = elapsed * 2.5;
      p.diamond.position.y = DIAMOND_Y + Math.sin(elapsed * 3 + p.born) * 0.12;
      const fade = Math.min(1, (LIFETIME_S - age) / FADE_S);
      for (const m of p.mats) {
        m.alpha = (m.metadata.baseOpacity as number) * fade;
      }
    }
  }

  /** Active pings for the minimap (always shown — that's the point). */
  getMapDots(): { x: number; z: number; color: string }[] {
    return this.entries.map((p) => ({ x: p.x, z: p.z, color: p.color }));
  }

  private dispose(p: Entry): void {
    this.group.remove(p.group);
    p.group.traverse((o) => (o as Mesh).geometry?.dispose?.());
    for (const m of p.mats) m.dispose();
  }
}
