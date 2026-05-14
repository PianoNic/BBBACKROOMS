/** Wall decor: educational maps, chalkboard, and coat rack. Re-exported
 *  via `wallDecor.ts` so the main file stays under the size budget. */
import * as THREE from "three";
import { materials } from "../../rendering/materials";
import { Basic, M, mulberry32, seedFromPos, type Builder } from "./_common";

// Large educational wall map. Variant picks the "kind" (0=world greens,
// 1=Switzerland reds, 2=periodic blues).
const MAP_FRAME = new THREE.BoxGeometry(0.6, 0.45, 0.04);
const MAP_BG = new THREE.PlaneGeometry(0.54, 0.40);
const MAP_REGION = new THREE.PlaneGeometry(0.10, 0.08);
const MAP_PALETTES = [
  { bg: 0x4a8acc, fg: [0x4a8a3a, 0x6aa050, 0x8ab070] },  // world
  { bg: 0xc81818, fg: [0xf6f6f4, 0xe6e6e0, 0xc8c8c0] },  // Switzerland
  { bg: 0x1a2a4a, fg: [0xe8c44a, 0x4adef0, 0xe07060] },  // periodic
];
export const buildMap: Builder = (prop) => {
  const g = new THREE.Group();
  const Y = 1.7;
  const frame = new THREE.Mesh(MAP_FRAME, materials.paintingFrame);
  frame.position.set(0, Y, 0.02);
  g.add(frame);
  const palette = MAP_PALETTES[(prop.variant ?? 0) % MAP_PALETTES.length];
  const bg = new THREE.Mesh(MAP_BG, Basic(palette.bg));
  bg.position.set(0, Y, -0.03);
  bg.rotation.y = Math.PI;
  g.add(bg);
  const rand = mulberry32(seedFromPos(prop.x, prop.z, 41.7, 23.1));
  // Visible bg area is 0.54 x 0.40 (centred). Clamp regions so they
  // don't poke past the frame.
  const BG_W = 0.54;
  const BG_H = 0.40;
  for (let i = 0; i < 5; i++) {
    const fg = palette.fg[Math.floor(rand() * palette.fg.length)];
    const region = new THREE.Mesh(MAP_REGION, Basic(fg));
    const w = 0.10 + rand() * 0.14;
    const h = 0.07 + rand() * 0.10;
    region.scale.set(w / 0.10, h / 0.08, 1);
    const maxX = (BG_W - w) / 2 - 0.02;
    const maxY = (BG_H - h) / 2 - 0.02;
    region.position.set(
      (rand() - 0.5) * 2 * maxX,
      Y + (rand() - 0.5) * 2 * maxY,
      -0.031,
    );
    region.rotation.y = Math.PI;
    g.add(region);
  }
  return g;
};

// Old-school green chalkboard — whiteboard shape with a wooden chalk tray.
const CHALK_FRAME = new THREE.BoxGeometry(2.6, 1.3, 0.04);
const CHALK_FACE = new THREE.BoxGeometry(2.5, 1.2, 0.05);
const CHALK_TRAY = new THREE.BoxGeometry(2.6, 0.06, 0.12);
const CHALK_STICK = new THREE.BoxGeometry(0.08, 0.018, 0.018);
export const buildChalkboard: Builder = (prop) => {
  const g = new THREE.Group();
  const Y = 1.6;
  const frame = new THREE.Mesh(CHALK_FRAME, M(0x4a3520));
  frame.position.set(0, Y, 0.02);
  g.add(frame);
  const face = new THREE.Mesh(CHALK_FACE, M(0x2a5a3a));
  face.position.set(0, Y, -0.03);
  g.add(face);
  const tray = new THREE.Mesh(CHALK_TRAY, M(0x4a3520));
  tray.position.set(0, Y - 0.7, -0.08);
  g.add(tray);
  const rand = mulberry32(seedFromPos(prop.x, prop.z, 71.3, 13.9));
  const chalkMats = [M(0xf6f6f4), M(0xf6e070), M(0xf09090)];
  for (let i = 0; i < 4; i++) {
    const chalk = new THREE.Mesh(
      CHALK_STICK, chalkMats[Math.floor(rand() * chalkMats.length)],
    );
    chalk.position.set(-1.1 + i * 0.16 + rand() * 0.05, Y - 0.68, -0.11);
    g.add(chalk);
  }
  return g;
};

// Wall coat rack: tall vertical board with 4 hooks. Some hooks have
// hanging coats in random colours.
const COAT_BOARD = new THREE.BoxGeometry(0.6, 1.6, 0.04);
const COAT_HOOK = new THREE.BoxGeometry(0.04, 0.04, 0.08);
const COAT_BODY = new THREE.BoxGeometry(0.32, 0.55, 0.12);
const COAT_COLORS = [0x4a4a8a, 0x804a30, 0x2a5a3a, 0x603060, 0x4a4a4e];
export const buildCoatRack: Builder = (prop) => {
  const g = new THREE.Group();
  const Y = 1.5;
  const board = new THREE.Mesh(COAT_BOARD, M(0x6a4a2a));
  board.position.set(0, Y, 0.02);
  g.add(board);
  const rand = mulberry32(seedFromPos(prop.x, prop.z, 53.1, 31.7));
  for (let i = 0; i < 4; i++) {
    const x = -0.21 + i * 0.14;
    const hook = new THREE.Mesh(COAT_HOOK, M(0xb8b8c0));
    hook.position.set(x, Y + 0.4, -0.06);
    g.add(hook);
    if (rand() < 0.65) {
      const color = COAT_COLORS[Math.floor(rand() * COAT_COLORS.length)];
      const coat = new THREE.Mesh(COAT_BODY, M(color));
      coat.position.set(x, Y - 0.05, -0.13);
      g.add(coat);
    }
  }
  return g;
};
