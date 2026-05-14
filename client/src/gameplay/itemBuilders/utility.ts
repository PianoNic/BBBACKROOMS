/** Utility / janitor / tech items: cleaning gear, gardening tools, an HDD. */
import * as THREE from "three";
import { box, cyl, M } from "./_common";

const TP_WHITE = M(0xf6f6f4);
const TP_CORE = M(0x6b4a2c);
const GLOVE_BLUE = M(0x4a90c0);

export function toiletPaper(): THREE.Group {
  const g = new THREE.Group();
  const roll = cyl(0.1, 0.12, TP_WHITE, 0, 0, 0, 24);
  roll.rotation.z = Math.PI / 2;
  g.add(roll);
  const core = cyl(0.035, 0.125, TP_CORE, 0, 0, 0, 16);
  core.rotation.z = Math.PI / 2;
  g.add(core);
  return g;
}

export function gloves(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.12, 0.04, 0.18, GLOVE_BLUE, -0.08, 0, 0));
  g.add(box(0.12, 0.04, 0.18, GLOVE_BLUE, 0.08, 0, 0));
  return g;
}

export function sponge(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.18, 0.07, 0.1, M(0xf0c850)));               // yellow soft top
  g.add(box(0.18, 0.03, 0.1, M(0x2a8a4a), 0, -0.05, 0));  // green scour pad
  return g;
}

export function wateringCan(): THREE.Group {
  const g = new THREE.Group();
  const wcMat = M(0x4a7e3a);
  g.add(cyl(0.13, 0.18, wcMat, 0, 0, 0));
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.012, 4, 10, Math.PI), wcMat,
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0.12, -0.05);
  g.add(handle);
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.028, 0.16, 6), wcMat,
  );
  spout.rotation.z = -0.9;
  spout.position.set(0.13, 0.06, 0);
  g.add(spout);
  return g;
}

export function hdd(): THREE.Group {
  const g = new THREE.Group();
  const shellMat = M(0x8a8e96);
  g.add(box(0.20, 0.04, 0.15, shellMat));
  const label = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.005, 0.10), M(0x1e1e22),
  );
  label.position.y = 0.024;
  g.add(label);
  const sata = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.012, 0.005),
    new THREE.MeshBasicMaterial({ color: 0xc83838 }),
  );
  sata.position.set(-0.08, 0, 0.077);
  g.add(sata);
  return g;
}
