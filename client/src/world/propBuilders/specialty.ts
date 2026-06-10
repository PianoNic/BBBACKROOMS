/** Specialty-room props: aquarium, anatomy skeleton, piano, water
 *  dispenser, trophy case, ball rack, easel. Wall props keep their
 *  visible front on local -Z (project convention). */
import * as THREE from "three";
import { Basic, M, type Builder } from "./_common";

const buildAquarium: Builder = () => {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.42), M(0x3a3a40));
  stand.position.set(0, 0.275, -0.21);
  g.add(stand);
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(1.24, 0.4, 0.36),
    new THREE.MeshLambertMaterial({
      color: 0x2a9fd8, transparent: true, opacity: 0.55,
    }),
  );
  water.position.set(0, 0.78, -0.21);
  g.add(water);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.42), M(0x202024));
  rim.position.set(0, 1.0, -0.21);
  g.add(rim);
  // Fish: tiny bright boxes "swimming" at staggered heights.
  for (const [fx, fy] of [[-0.35, 0.72], [0.1, 0.84], [0.42, 0.76]] as const) {
    const fish = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.05, 0.04), Basic(0xff8c2e),
    );
    fish.position.set(fx, fy, -0.21);
    g.add(fish);
  }
  return g;
};

const buildSkeleton: Builder = () => {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.06, 12), M(0x303034));
  base.position.y = 0.03;
  g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 8), M(0x55555c));
  pole.position.y = 0.88;
  g.add(pole);
  const bone = M(0xe8e2d2);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), bone);
  skull.position.set(0, 1.62, -0.06);
  g.add(skull);
  // Ribcage: stacked thin slabs narrowing downward.
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.34 - i * 0.04, 0.045, 0.16), bone,
    );
    rib.position.set(0, 1.38 - i * 0.1, -0.06);
    g.add(rib);
  }
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.14), bone);
  pelvis.position.set(0, 0.92, -0.06);
  g.add(pelvis);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.04), bone);
    arm.position.set(side * 0.22, 1.18, -0.06);
    g.add(arm);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), bone);
    leg.position.set(side * 0.08, 0.52, -0.06);
    g.add(leg);
  }
  return g;
};

const buildPiano: Builder = () => {
  const g = new THREE.Group();
  const dark = M(0x1c1410);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.45), dark);
  body.position.set(0, 0.6, 0.1);
  g.add(body);
  const keybed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.28), dark);
  keybed.position.set(0, 0.78, -0.24);
  g.add(keybed);
  const keys = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.03, 0.22), M(0xf2efe6));
  keys.position.set(0, 0.83, -0.24);
  g.add(keys);
  // Black-key strip suggested as one thin slab.
  const blacks = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.035, 0.1), dark);
  blacks.position.set(0, 0.85, -0.29);
  g.add(blacks);
  for (const side of [-1, 1]) {
    const legM = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.08), dark);
    legM.position.set(side * 0.66, 0.36, -0.3);
    g.add(legM);
  }
  return g;
};

const buildWaterDispenser: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.0, 0.36), M(0xeceff1));
  body.position.set(0, 0.5, -0.18);
  g.add(body);
  const bottle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 0.4, 12),
    new THREE.MeshLambertMaterial({
      color: 0x4db3e8, transparent: true, opacity: 0.7,
    }),
  );
  bottle.position.set(0, 1.2, -0.18);
  g.add(bottle);
  const tap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.08), M(0x303034));
  tap.position.set(0, 0.72, -0.38);
  g.add(tap);
  return g;
};

const buildTrophyCase: Builder = () => {
  const g = new THREE.Group();
  const caseBox = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 0.32), M(0x4a3526));
  caseBox.position.set(0, 1.1, -0.16);
  g.add(caseBox);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.86, 0.02),
    new THREE.MeshLambertMaterial({
      color: 0xbfdce8, transparent: true, opacity: 0.3,
    }),
  );
  glass.position.set(0, 1.1, -0.33);
  g.add(glass);
  for (const [tx, scale] of [[-0.4, 0.8], [0, 1.1], [0.4, 0.9]] as const) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05 * scale, 0.07 * scale, 0.16 * scale, 10),
      M(0xffd24a),
    );
    cup.position.set(tx, 0.95 + 0.08 * scale, -0.24);
    g.add(cup);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045 * scale, 8, 8), M(0xffd24a));
    ball.position.set(tx, 1.06 + 0.12 * scale, -0.24);
    g.add(ball);
  }
  return g;
};

const buildBallRack: Builder = () => {
  const g = new THREE.Group();
  const frame = M(0x55555c);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), frame);
    post.position.set(side * 0.42, 0.5, -0.2);
    g.add(post);
  }
  for (const fy of [0.35, 0.8]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.4), frame);
    shelf.position.set(0, fy, -0.2);
    g.add(shelf);
  }
  const colors = [0xe06a2e, 0xf2efe6, 0xe06a2e, 0x2e6ae0];
  colors.forEach((c, i) => {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), M(c));
    ball.position.set(-0.3 + (i % 2) * 0.4, 0.49 + Math.floor(i / 2) * 0.45, -0.2);
    g.add(ball);
  });
  return g;
};

const buildEasel: Builder = () => {
  const g = new THREE.Group();
  const wood = M(0xb08040);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.04), wood);
    leg.position.set(side * 0.28, 0.73, 0);
    leg.rotation.z = side * -0.18;
    g.add(leg);
  }
  const backLeg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.45, 0.04), wood);
  backLeg.position.set(0, 0.71, 0.3);
  backLeg.rotation.x = 0.35;
  g.add(backLeg);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.08), wood);
  tray.position.set(0, 0.62, -0.08);
  g.add(tray);
  const canvas = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.7, 0.02), M(0xf6f3ea));
  canvas.position.set(0, 1.02, -0.1);
  canvas.rotation.x = -0.08;
  g.add(canvas);
  // A few paint daubs so the canvas isn't sterile white.
  for (const [px, py, c] of [
    [-0.12, 1.1, 0xc23a3a], [0.08, 0.98, 0x2e6ae0], [0.15, 1.16, 0x3fa34d],
  ] as const) {
    const daub = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.005), Basic(c));
    daub.position.set(px, py, -0.115);
    daub.rotation.x = -0.08;
    g.add(daub);
  }
  return g;
};

export const SPECIALTY_BUILDERS: Record<string, Builder> = {
  aquarium: buildAquarium,
  skeleton: buildSkeleton,
  piano: buildPiano,
  water_dispenser: buildWaterDispenser,
  trophy_case: buildTrophyCase,
  ball_rack: buildBallRack,
  easel: buildEasel,
};
