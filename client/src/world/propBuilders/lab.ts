/** Chemistry-lab props: bench, fume hood, chemical shelf, bunsen burner,
 *  emergency shower. Wall props keep their visible front on local -Z
 *  (project convention), so `wall_yaw` turns them into the room. */
import * as THREE from "three";
import { Basic, M, type Builder } from "./_common";

const STONE = 0x2f3238;   // dark lab worktop
const CABINET = 0xb8bcc4; // pale enamel
const STEEL = 0x8d939c;

/** Island worktop with a lower cupboard and a small sink cut-out.
 *  Footprint 2.0 x 1.0 m — the surface bunsen burners stack onto. */
const buildLabBench: Builder = () => {
  const g = new THREE.Group();
  const cupboard = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.78, 0.9), M(0x6f6a60));
  cupboard.position.y = 0.39;
  g.add(cupboard);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 1.0), M(STONE));
  top.position.y = 0.81;
  g.add(top);
  // Doors, so the base doesn't read as one flat slab.
  for (const dx of [-0.47, 0.47]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.66, 0.02), M(0x807a6e));
    door.position.set(dx, 0.4, 0.46);
    g.add(door);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.02), M(STEEL));
    handle.position.set(dx + 0.36, 0.4, 0.48);
    g.add(handle);
  }
  // Sink basin sunk into one end.
  const basin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.34), M(0x4a4f57));
  basin.position.set(-0.68, 0.845, 0);
  g.add(basin);
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 8), M(STEEL));
  tap.position.set(-0.68, 0.97, -0.16);
  g.add(tap);
  const spout = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.16), M(STEEL));
  spout.position.set(-0.68, 1.09, -0.09);
  g.add(spout);
  return g;
};

/** Wall cabinet with a raised glass sash and a lit interior. */
const buildFumeHood: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.1, 0.7), M(CABINET));
  body.position.set(0, 1.05, -0.35);
  g.add(body);
  // Everything below faces the room. The body spans z 0 (wall) to -0.7, so
  // the visible face is at -0.7 — detail placed near z=0 would be buried
  // inside the cabinet and the hood would read as a blank slab.
  const FRONT = -0.7;
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.82, 0.04), M(0x1b1e23));
  chamber.position.set(0, 1.16, FRONT + 0.02);
  g.add(chamber);
  const sash = new THREE.Mesh(
    new THREE.BoxGeometry(1.24, 0.5, 0.03),
    new THREE.MeshLambertMaterial({
      color: 0x9fd8e8, transparent: true, opacity: 0.35,
    }),
  );
  sash.position.set(0, 1.72, FRONT + 0.02);
  g.add(sash);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.05, 0.06), M(STEEL));
  rail.position.set(0, 1.45, FRONT + 0.01);
  g.add(rail);
  // Strip light along the top of the opening — reads as "still running".
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.04), Basic(0xdff3ff));
  lamp.position.set(0, 1.56, FRONT + 0.03);
  g.add(lamp);
  // Sill jutting into the room under the opening.
  const worktop = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.05, 0.14), M(STONE));
  worktop.position.set(0, 0.74, FRONT - 0.04);
  g.add(worktop);
  return g;
};

/** Two shelves of reagent bottles in mismatched colours.
 *  Open-fronted: a back panel against the wall plus two uprights, so the
 *  bottles are actually visible from the room (local -Z is the front). */
const buildChemicalShelf: Builder = () => {
  const g = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.03), M(0x6b6257));
  back.position.set(0, 0.75, -0.015);
  g.add(back);
  for (const sx of [-0.585, 0.585]) {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.5, 0.3), M(0x6b6257));
    upright.position.set(sx, 0.75, -0.16);
    g.add(upright);
  }
  const bottleColors = [0xd8b23a, 0x4fa3d8, 0xc94f4f, 0x6fc36f, 0xb07ad8];
  for (const [shelfY, count] of [[0.62, 5], [1.12, 4]] as const) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.03, 0.3), M(0x8a8074));
    plank.position.set(0, shelfY, -0.16);
    g.add(plank);
    for (let i = 0; i < count; i++) {
      const x = -0.44 + (0.88 * i) / Math.max(1, count - 1);
      const h = 0.16 + ((i * 7) % 3) * 0.05;
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, h, 8),
        M(bottleColors[(i * 3) % bottleColors.length]),
      );
      bottle.position.set(x, shelfY + h / 2 + 0.015, -0.16);
      g.add(bottle);
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.04, 8), M(0x2c2c30),
      );
      cap.position.set(x, shelfY + h + 0.035, -0.16);
      g.add(cap);
    }
  }
  return g;
};

/** Burner on a tripod, flame lit. Sits on a lab bench. */
const buildBunsenBurner: Builder = () => {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 0.03, 10), M(0x33363c),
  );
  base.position.y = 0.015;
  g.add(base);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.034, 0.22, 8), M(STEEL),
  );
  barrel.position.y = 0.14;
  g.add(barrel);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.035, 0.14, 8), Basic(0x4fb8ff),
  );
  flame.position.y = 0.32;
  g.add(flame);
  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(0.018, 0.07, 6), Basic(0xdff0ff),
  );
  inner.position.y = 0.28;
  g.add(inner);
  // Gas hose trailing off the side.
  const hose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), M(0x2a2a2e),
  );
  hose.rotation.z = Math.PI / 2;
  hose.position.set(0.12, 0.05, 0.04);
  g.add(hose);
  return g;
};

/** Emergency shower + eyewash, the yellow-and-green kind bolted to a wall. */
const buildEmergencyShower: Builder = () => {
  const g = new THREE.Group();
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 2.2, 8), M(0x2f7a3f),
  );
  pipe.position.set(0, 1.1, -0.16);
  g.add(pipe);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.42), M(0x2f7a3f));
  arm.position.set(0, 2.16, 0.05);
  g.add(arm);
  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.16, 0.08, 12), M(CABINET),
  );
  head.position.set(0, 2.1, 0.24);
  g.add(head);
  // Triangular pull handle on a rod.
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.8, 6), M(STEEL),
  );
  rod.position.set(0.18, 1.7, 0.2);
  g.add(rod);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.03), Basic(0xd8c23a));
  handle.position.set(0.18, 1.31, 0.2);
  g.add(handle);
  // Eyewash bowl lower down.
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.1, 0.07, 10), M(CABINET),
  );
  bowl.position.set(0, 1.02, 0.1);
  g.add(bowl);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.02), Basic(0x2f7a3f));
  sign.position.set(0, 2.42, -0.14);
  g.add(sign);
  return g;
};

export const LAB_BUILDERS: Record<string, Builder> = {
  lab_bench: buildLabBench,
  fume_hood: buildFumeHood,
  chemical_shelf: buildChemicalShelf,
  bunsen_burner: buildBunsenBurner,
  emergency_shower: buildEmergencyShower,
};
