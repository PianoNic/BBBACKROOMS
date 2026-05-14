/** Cafeteria / break-room appliances: vending, coffee, microwave, counter. */
import * as THREE from "three";
import { Basic, M, offsetFromWall, type Builder } from "./_common";

// All wall props face local -Z (project convention). The vending
// machine's glass front, shelves, brand panel and tray sit on the -Z
// side of the body so wall_yaw lines them up with the room interior.
const buildVendingMachine: Builder = (prop) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.65), M(0xa01818));
  body.position.y = 1.0;
  g.add(body);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.30, 0.05), M(0x141416));
  frame.position.set(0, 1.30, -0.331);
  g.add(frame);
  const backlight = new THREE.Mesh(new THREE.PlaneGeometry(0.80, 1.22), Basic(0xf6d77a));
  backlight.position.set(0, 1.30, -0.357);
  g.add(backlight);
  const colors = [0x3a8a4a, 0xe8e8d0, 0xd03030, 0x1f6ec8, 0xe8c44a];
  const seed = ((prop.x * 13.7 + prop.z * 29.1) | 0) >>> 0;
  for (let row = 0; row < 3; row++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.02, 0.02), M(0x303034));
    shelf.position.set(0, 0.78 + row * 0.36, -0.365);
    g.add(shelf);
    for (let col = 0; col < 5; col++) {
      const c = colors[(seed + row * 5 + col) % colors.length];
      const isCan = ((seed >> (row + col)) & 1) === 1;
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, isCan ? 0.18 : 0.24, 8), M(c),
      );
      bottle.position.set(-0.32 + col * 0.16, 0.90 + row * 0.36, -0.36);
      g.add(bottle);
      if (!isCan) {
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.04, 6), M(0x303034),
        );
        cap.position.set(-0.32 + col * 0.16, 1.04 + row * 0.36, -0.36);
        g.add(cap);
      }
    }
  }
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 1.30),
    new THREE.MeshBasicMaterial({ color: 0x6ad4f0, transparent: true, opacity: 0.18 }),
  );
  glass.position.set(0, 1.30, -0.365);
  g.add(glass);
  const brand = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 0.03), M(0xf6f6f4));
  brand.position.set(0, 1.90, -0.34);
  g.add(brand);
  const brandAccent = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.10), Basic(0xc81818));
  brandAccent.position.set(0, 1.90, -0.356);
  g.add(brandAccent);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.10, 0.04), M(0x202024));
  panel.position.set(0.36, 0.85, -0.331);
  g.add(panel);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const btn = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.02), M(0x4a4a52));
      btn.position.set(0.30 + c * 0.06, 1.20 - r * 0.07, -0.355);
      g.add(btn);
    }
  }
  const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.02, 0.02), M(0x101012));
  coinSlot.position.set(0.36, 0.90, -0.355);
  g.add(coinSlot);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.20, 0.04), M(0x141416));
  tray.position.set(0, 0.25, -0.331);
  g.add(tray);
  const trayLip = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.06), M(0x303034));
  trayLip.position.set(0, 0.18, -0.345);
  g.add(trayLip);
  return g;
};

const buildCoffeeMachine: Builder = () => {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.45), M(0x202024));
  base.position.y = 0.275;
  g.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.4), M(0x303034));
  top.position.y = 0.64;
  g.add(top);
  // Screen + spout on the -Z (room-facing) side.
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.10), Basic(0x4adef0));
  screen.position.set(0, 0.45, -0.226);
  g.add(screen);
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), M(0x808080),
  );
  spout.position.set(0, 0.30, -0.20);
  g.add(spout);
  return g;
};

// Microwave door + control panel face -Z (room interior). Sits ON a
// counter's counter_top — all geometry is offset up so the microwave's
// bottom rests on the counter surface.
const buildMicrowave: Builder = () => {
  const g = new THREE.Group();
  const T = 0.9;   // counter_top height (counter top mesh at y=0.875)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.40), M(0x303034));
  body.position.y = T + 0.16;
  g.add(body);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.02), M(0x141418));
  door.position.set(-0.06, T + 0.16, -0.21);
  g.add(door);
  const window_ = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.20), Basic(0x2a2a30));
  window_.position.set(-0.06, T + 0.16, -0.221);
  g.add(window_);
  const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), Basic(0xe8c44a));
  bulb.position.set(-0.14, T + 0.22, -0.222);
  g.add(bulb);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.02), M(0x1a1a1e));
  panel.position.set(0.20, T + 0.16, -0.21);
  g.add(panel);
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 0.04), Basic(0x4adef0));
  display.position.set(0.20, T + 0.25, -0.222);
  g.add(display);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const btn = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), M(0x4a4a52));
      btn.position.set(0.17 + c * 0.05, T + 0.18 - r * 0.05, -0.222);
      g.add(btn);
    }
  }
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.04), M(0xb8b8c0));
  handle.position.set(0.13, T + 0.16, -0.232);
  g.add(handle);
  // Roof vents stay on top.
  for (let i = 0; i < 5; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.005, 0.02), M(0x141418));
    slat.position.set(-0.05, T + 0.323, -0.12 + i * 0.04);
    g.add(slat);
  }
  return g;
};

const buildCounter: Builder = () => {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.85, 0.65), M(0xc4b88a));
  base.position.y = 0.425;
  g.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.05, 0.70), M(0xe8d8a8));
  top.position.y = 0.875;
  g.add(top);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.02, 0.72), M(0x6a5a3a));
  edge.position.y = 0.84;
  g.add(edge);
  for (let i = 0; i < 2; i++) {
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.6, 0.02), M(0xa89870));
    doorPanel.position.set(-0.45 + i * 0.9, 0.42, -0.331);
    g.add(doorPanel);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.02, 0.02), M(0x303034));
    handle.position.set(i === 0 ? -0.10 : 0.10, 0.42, -0.345);
    g.add(handle);
  }
  const toe = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.05), M(0x303034));
  toe.position.set(0, 0.04, -0.30);
  g.add(toe);
  const stack = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.10, 0.36), M(0x4a8aa8));
  stack.position.set(-0.55, 0.95, 0);
  g.add(stack);
  for (const x of [-0.85, 0.85]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), M(0xb8b8c0));
    post.position.set(x, 1.125, 0.18);
    g.add(post);
  }
  const guard = new THREE.Mesh(
    new THREE.PlaneGeometry(1.70, 0.40),
    new THREE.MeshBasicMaterial({ color: 0xa8c8d8, transparent: true, opacity: 0.25 }),
  );
  guard.position.set(0, 1.13, 0.18);
  g.add(guard);
  return g;
};

// Wall-prop wrappers shift each builder's contents away from the wall
// so the prop's back face sits at the wall plane instead of half-clipping.
// Depths match the body geometry: vending 0.65, coffee 0.45, counter 0.65.
// Microwave is on_top (stacks on counter) — no wall offset.
// Tall white fridge, two-door look. Wall prop. Body depth 0.65 → wrap.
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
// Output tray and slot face local -Z (room side).
const buildPrinter: Builder = () => {
  const g = new THREE.Group();
  const T = 0.75;  // table_top height — printer rests on this
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

// Small square 1m x 1m side table. Top at y=0.75. Centre placement; offers
// the table_top layer so a printer (or anything else) can stack on it.
const buildSideTable: Builder = () => {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.95), M(0x6a4a2a));
  top.position.y = 0.73;
  g.add(top);
  for (const [dx, dz] of [[0.42, 0.42], [-0.42, 0.42], [0.42, -0.42], [-0.42, -0.42]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.71, 0.05), M(0x3a2a1a));
    leg.position.set(dx, 0.355, dz);
    g.add(leg);
  }
  return g;
};

// Two-seater sofa. Cushioned back, soft armrests. Wall prop; front faces
// local -Z (into the room).
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
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), M(0x303034));
    leg.position.set(dx, 0.04, -0.3);
    g.add(leg);
    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), M(0x303034));
    leg2.position.set(dx, 0.04, 0.3);
    g.add(leg2);
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
