/** Utility / atmosphere props: electricals, bins, signs, hazards. */
import * as THREE from "three";
import { Basic, M, type Builder } from "./_common";

// Wall-mounted fuse box BODY only — interactive door + levers are
// rendered by the FuseBoxes manager (outside static-merge so each
// fuse box's door/lever pivots remain addressable for animation +
// click toggling).
const buildFuseBox: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.15), M(0xd8d8c8));
  body.position.set(0, 1.35, -0.075);
  g.add(body);
  // Recessed interior (darker) so when the door is open the cavity reads
  // as inset, not flat. The actual lever meshes sit in front of this.
  const cavity = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.60, 0.02), M(0x202024));
  cavity.position.set(0, 1.35, -0.01);
  g.add(cavity);
  return g;
};

// variant 0=paper(blue) / 1=PET(yellow) / 2=alu(green)
const RECYCLE_PALETTE = [0x1f6ec8, 0xd6c52a, 0x2aa356];
const buildRecycleBin: Builder = (prop) => {
  const color = RECYCLE_PALETTE[Math.max(0, Math.min(2, prop.variant ?? 0))];
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.22, 0.55, 14), M(color),
  );
  body.position.y = 0.275;
  g.add(body);
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.21, 0.04, 14), M(0x181818),
  );
  lid.position.y = 0.57;
  g.add(lid);
  return g;
};

const buildExitSign: Builder = () => {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.04), M(0x101012));
  frame.position.set(0, 2.05, 0);
  g.add(frame);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.40, 0.13), Basic(0x2bd14a));
  face.position.set(0, 2.05, 0.021);
  g.add(face);
  const arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), Basic(0xf6f6f4));
  arrow.position.set(-0.14, 2.05, 0.022);
  g.add(arrow);
  return g;
};

const buildMopBucket: Builder = () => {
  const g = new THREE.Group();
  const bucket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.18, 0.32, 14), M(0xd0a020),
  );
  bucket.position.y = 0.16;
  g.add(bucket);
  const wringer = new THREE.Mesh(
    new THREE.BoxGeometry(0.30, 0.04, 0.20), M(0x404048),
  );
  wringer.position.y = 0.34;
  g.add(wringer);
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 1.4, 8), M(0xb08040),
  );
  stick.position.set(0.08, 0.86, 0);
  stick.rotation.z = 0.15;
  g.add(stick);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.10, 8, 6), M(0xeeeeea),
  );
  head.position.set(0.10, 0.18, 0);
  g.add(head);
  return g;
};

const buildPylon: Builder = () => {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.45, 12), M(0xe06020),
  );
  cone.position.y = 0.225;
  g.add(cone);
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.10, 0.06, 12), M(0xf6f6f4),
  );
  stripe.position.y = 0.28;
  g.add(stripe);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.40, 0.04, 0.40), M(0x181818),
  );
  base.position.y = 0.02;
  g.add(base);
  return g;
};

export const UTILITY_BUILDERS: Record<string, Builder> = {
  fuse_box: buildFuseBox,
  recycle_bin: buildRecycleBin,
  exit_sign: buildExitSign,
  mop_bucket: buildMopBucket,
  pylon: buildPylon,
};
