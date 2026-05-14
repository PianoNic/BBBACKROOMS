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
  // Dark inner cylinder, just inside the rim, simulates a hollow opening
  // when viewed from above.
  const cavity = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.16, 16), M(0x101810),
  );
  cavity.position.y = 0.01;
  g.add(cavity);
  // Carry handle: a half-torus arching over the top of the can. The
  // default torus ring lies in the XY plane and the half-arc spans angle
  // 0..π — from (+r,0) over (0,+r) to (-r,0) — so with no rotation the
  // arch opens downward with endpoints flat at y=0. Place the centre at
  // the can's top (y=0.09) so the endpoints anchor onto the rim instead
  // of floating above it.
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.012, 4, 10, Math.PI), wcMat,
  );
  handle.position.set(0, 0.09, 0);
  g.add(handle);
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.028, 0.16, 6), wcMat,
  );
  spout.rotation.z = -0.9;
  spout.position.set(0.13, 0.06, 0);
  g.add(spout);
  return g;
}

// 3.5" hard drive. Brushed-metal top shell, black PCB underneath, SATA +
// power connectors on the back edge, four screw indents on the top, and
// a paper label in the middle.
export function hdd(): THREE.Group {
  const g = new THREE.Group();
  // Approximate real 3.5" dimensions scaled up for visibility.
  const W = 0.20;   // along the SATA edge
  const D = 0.28;   // depth (front to back)
  const SHELL = 0.04;
  const PCB_H = 0.012;
  const shellMat = M(0xb8bcc4);     // brushed aluminium
  const pcbMat = M(0x1a3a2a);       // dark green PCB
  const labelMat = M(0xe6e2d4);     // paper label
  const labelInkMat = M(0x18181c);  // dark text bar
  const sataMat = M(0x181818);      // SATA plastic
  const sataPinMat = new THREE.MeshBasicMaterial({ color: 0xc8b060 });
  const screwMat = M(0x404048);

  // Aluminium top shell sits flush ON the PCB. Shell centred so its
  // bottom face touches the PCB's top face (both share y = PCB_H/2).
  g.add(box(W, SHELL, D, shellMat, 0, PCB_H + SHELL / 2, 0));
  // PCB below the shell, sitting on the ground plane.
  g.add(box(W - 0.005, PCB_H, D - 0.005, pcbMat, 0, PCB_H / 2, 0));
  // Top-of-shell y level, used for the label and screws.
  const TOP = PCB_H + SHELL;
  // Paper label on top, slightly inset.
  const label = box(W * 0.7, 0.002, D * 0.55, labelMat, 0, TOP + 0.001, 0);
  g.add(label);
  // Two dark text bars on the label.
  g.add(box(W * 0.5, 0.0025, 0.012, labelInkMat, 0, TOP + 0.003, -D * 0.12));
  g.add(box(W * 0.4, 0.0025, 0.008, labelInkMat, 0, TOP + 0.003, D * 0.05));
  // Four screw indents (visible top corners of the shell).
  const sx = W * 0.42, sz = D * 0.42;
  for (const [cx, cz] of [[-sx, -sz], [sx, -sz], [-sx, sz], [sx, sz]] as const) {
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.003, 8), screwMat,
    );
    screw.position.set(cx, TOP + 0.0015, cz);
    g.add(screw);
  }
  // SATA data + power connectors along the back edge (+Z side) — at the
  // PCB's level, between the shell and the ground plane.
  const connectorY = PCB_H / 2;
  g.add(box(0.038, 0.012, 0.008, sataMat, -0.04, connectorY, D / 2 + 0.002));
  g.add(box(0.054, 0.012, 0.008, sataMat, 0.04, connectorY, D / 2 + 0.002));
  // Tiny gold pin strips inside each connector slot.
  const pin1 = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.004, 0.002), sataPinMat);
  pin1.position.set(-0.04, connectorY, D / 2 + 0.006);
  g.add(pin1);
  const pin2 = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.004, 0.002), sataPinMat);
  pin2.position.set(0.04, connectorY, D / 2 + 0.006);
  g.add(pin2);
  return g;
}
