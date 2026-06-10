/** In-world teammate ping markers: a bobbing diamond over a light beam and
 *  ground ring in the pinging player's colour. Markers live ~6 seconds and
 *  fade out over the last one. Minimap dots come from `getMapDots`. */
import * as THREE from "three";

const LIFETIME_S = 6;
const FADE_S = 1;
const DIAMOND_Y = 1.7;

type Entry = {
  group: THREE.Group;
  diamond: THREE.Mesh;
  mats: THREE.MeshBasicMaterial[];
  born: number;
  x: number;
  z: number;
  color: string;
};

export class Pings {
  readonly group = new THREE.Group();
  private readonly entries: Entry[] = [];
  private elapsed = 0;

  add(x: number, z: number, color: string): void {
    const c = new THREE.Color(color);
    const g = new THREE.Group();
    const mats: THREE.MeshBasicMaterial[] = [];
    const mat = (opacity: number, double = false): THREE.MeshBasicMaterial => {
      const m = new THREE.MeshBasicMaterial({
        color: c, transparent: true, opacity, depthWrite: false,
        side: double ? THREE.DoubleSide : THREE.FrontSide,
      });
      m.userData.baseOpacity = opacity;
      mats.push(m);
      return m;
    };

    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), mat(0.95));
    diamond.position.y = DIAMOND_Y;
    g.add(diamond);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, DIAMOND_Y, 8), mat(0.25),
    );
    beam.position.y = DIAMOND_Y / 2;
    g.add(beam);

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 24), mat(0.55, true));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    g.add(ring);

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
        m.opacity = (m.userData.baseOpacity as number) * fade;
      }
    }
  }

  /** Active pings for the minimap (always shown — that's the point). */
  getMapDots(): { x: number; z: number; color: string }[] {
    return this.entries.map((p) => ({ x: p.x, z: p.z, color: p.color }));
  }

  private dispose(p: Entry): void {
    this.group.remove(p.group);
    p.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose?.());
    for (const m of p.mats) m.dispose();
  }
}
