/** Cafeteria / break-room appliances: vending, coffee, microwave, counter. */
import * as THREE from "three";
import { Basic, M, type Builder } from "./_common";

const buildVendingMachine: Builder = (prop) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.65), M(0xa01818));
  body.position.y = 1.0;
  g.add(body);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.30, 0.05), M(0x141416));
  frame.position.set(0, 1.30, 0.331);
  g.add(frame);
  const backlight = new THREE.Mesh(new THREE.PlaneGeometry(0.80, 1.22), Basic(0xf6d77a));
  backlight.position.set(0, 1.30, 0.357);
  g.add(backlight);
  // Three shelves with bottles + cans, randomised per prop.
  const colors = [0x3a8a4a, 0xe8e8d0, 0xd03030, 0x1f6ec8, 0xe8c44a];
  const seed = ((prop.x * 13.7 + prop.z * 29.1) | 0) >>> 0;
  for (let row = 0; row < 3; row++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.02, 0.02), M(0x303034));
    shelf.position.set(0, 0.78 + row * 0.36, 0.365);
    g.add(shelf);
    for (let col = 0; col < 5; col++) {
      const c = colors[(seed + row * 5 + col) % colors.length];
      const isCan = ((seed >> (row + col)) & 1) === 1;
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, isCan ? 0.18 : 0.24, 8), M(c),
      );
      bottle.position.set(-0.32 + col * 0.16, 0.90 + row * 0.36, 0.36);
      g.add(bottle);
      if (!isCan) {
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.04, 6), M(0x303034),
        );
        cap.position.set(-0.32 + col * 0.16, 1.04 + row * 0.36, 0.36);
        g.add(cap);
      }
    }
  }
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 1.30),
    new THREE.MeshBasicMaterial({ color: 0x6ad4f0, transparent: true, opacity: 0.18 }),
  );
  glass.position.set(0, 1.30, 0.365);
  g.add(glass);
  const brand = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 0.03), M(0xf6f6f4));
  brand.position.set(0, 1.90, 0.34);
  g.add(brand);
  const brandAccent = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.10), Basic(0xc81818));
  brandAccent.position.set(0, 1.90, 0.356);
  g.add(brandAccent);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.10, 0.04), M(0x202024));
  panel.position.set(0.36, 0.85, 0.331);
  g.add(panel);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const btn = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.02), M(0x4a4a52));
      btn.position.set(0.30 + c * 0.06, 1.20 - r * 0.07, 0.355);
      g.add(btn);
    }
  }
  const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.02, 0.02), M(0x101012));
  coinSlot.position.set(0.36, 0.90, 0.355);
  g.add(coinSlot);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.20, 0.04), M(0x141416));
  tray.position.set(0, 0.25, 0.331);
  g.add(tray);
  const trayLip = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.06), M(0x303034));
  trayLip.position.set(0, 0.18, 0.345);
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
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.10), Basic(0x4adef0));
  screen.position.set(0, 0.45, 0.226);
  g.add(screen);
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), M(0x808080),
  );
  spout.position.set(0, 0.30, 0.20);
  g.add(spout);
  return g;
};

const buildMicrowave: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.40), M(0x303034));
  body.position.y = 0.16;
  g.add(body);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.02), M(0x141418));
  door.position.set(-0.06, 0.16, 0.21);
  g.add(door);
  const window_ = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.20), Basic(0x2a2a30));
  window_.position.set(-0.06, 0.16, 0.221);
  g.add(window_);
  const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), Basic(0xe8c44a));
  bulb.position.set(-0.14, 0.22, 0.222);
  g.add(bulb);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.02), M(0x1a1a1e));
  panel.position.set(0.20, 0.16, 0.21);
  g.add(panel);
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 0.04), Basic(0x4adef0));
  display.position.set(0.20, 0.25, 0.222);
  g.add(display);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const btn = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), M(0x4a4a52));
      btn.position.set(0.17 + c * 0.05, 0.18 - r * 0.05, 0.222);
      g.add(btn);
    }
  }
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.04), M(0xb8b8c0));
  handle.position.set(0.13, 0.16, 0.232);
  g.add(handle);
  for (let i = 0; i < 5; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.005, 0.02), M(0x141418));
    slat.position.set(-0.05, 0.323, -0.12 + i * 0.04);
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

export const APPLIANCE_BUILDERS: Record<string, Builder> = {
  vending_machine: buildVendingMachine,
  coffee_machine: buildCoffeeMachine,
  microwave: buildMicrowave,
  counter: buildCounter,
};
