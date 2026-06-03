/** Break-room / lounge furniture: fridge, sofa, side table, office
 *  printer. The cafeteria-style appliances (vending, coffee, microwave,
 *  counter) live in `_appliancesCafeteria.ts`. Both sets are exposed
 *  through `APPLIANCE_BUILDERS` below. */
import * as THREE from "three";
import { Basic, M, offsetFromWall, type Builder } from "./_common";
import {
  buildCoffeeMachine, buildCounter, buildMicrowave, buildVendingMachine,
} from "./_appliancesCafeteria";

// Tall white fridge, two-door look. Wall prop; body depth 0.65 → wrap.
const buildFridge: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.75, 0.65), M(0xeeeeea));
  body.position.y = 0.875;
  g.add(body);
  const gap = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.03, 0.66), M(0x404048));
  gap.position.y = 1.05;
  g.add(gap);
  for (const dy of [0.45, 1.45]) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.35, 0.04), M(0x808088));
    handle.position.set(0.30, dy, -0.34);
    g.add(handle);
  }
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.02), M(0x303034));
  vent.position.set(0, 0.06, -0.34);
  g.add(vent);
  return g;
};

// Small office printer that sits ON a side_table (table_top y ≈ 0.75).
const buildPrinter: Builder = () => {
  const g = new THREE.Group();
  const T = 0.75;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.38), M(0x2a2a2e));
  base.position.y = T + 0.11;
  g.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.03, 0.40), M(0xc8c8cc));
  top.position.y = T + 0.225;
  g.add(top);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.015, 0.14), M(0xf0f0ec));
  tray.position.set(0, T + 0.13, -0.13);
  g.add(tray);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.015, 0.004), M(0x101012));
  slot.position.set(0, T + 0.21, -0.191);
  g.add(slot);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 0.05), Basic(0x4adef0));
  panel.position.set(0.14, T + 0.20, -0.191);
  g.add(panel);
  return g;
};

// Small 1m x 1m side table. Centre placement; offers table_top so a
// printer (or anything else) can stack on it.
const buildSideTable: Builder = () => {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.95), M(0x6a4a2a));
  top.position.y = 0.73;
  g.add(top);
  for (const [dx, dz] of [
    [0.42, 0.42], [-0.42, 0.42], [0.42, -0.42], [-0.42, -0.42],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.71, 0.05), M(0x3a2a1a));
    leg.position.set(dx, 0.355, dz);
    g.add(leg);
  }
  return g;
};

// Two-seater sofa. Wall prop; front faces local -Z (into the room).
const buildSofa: Builder = () => {
  const g = new THREE.Group();
  const fabric = M(0x5a6a85);
  const cushion = M(0x4a5a75);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.4, 0.85), fabric);
  base.position.y = 0.2;
  g.add(base);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.55, 0.18), fabric);
  back.position.set(0, 0.65, 0.33);
  g.add(back);
  for (const dx of [-0.6, 0.6]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.12, 0.7), cushion);
    seat.position.set(dx, 0.46, -0.06);
    g.add(seat);
  }
  for (const dx of [-0.92, 0.92]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.8), fabric);
    arm.position.set(dx, 0.45, -0.02);
    g.add(arm);
  }
  for (const dx of [-0.85, 0.85]) {
    for (const dz of [-0.3, 0.3]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), M(0x303034));
      leg.position.set(dx, 0.04, dz);
      g.add(leg);
    }
  }
  return g;
};

export const APPLIANCE_BUILDERS: Record<string, Builder> = {
  vending_machine: offsetFromWall(buildVendingMachine, 0.305),
  coffee_machine: offsetFromWall(buildCoffeeMachine, 0.205),
  microwave: buildMicrowave,
  counter: offsetFromWall(buildCounter, 0.32),
  fridge: offsetFromWall(buildFridge, 0.325),
  printer: buildPrinter,
  side_table: buildSideTable,
  sofa: offsetFromWall(buildSofa, 0.425),
};
