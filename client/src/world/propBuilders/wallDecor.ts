/** Side- + back-wall decoration: paintings, bookshelves, books piles,
 *  bulletin boards, radiators. */
import * as THREE from "three";
import { materials } from "../../rendering/materials";
import { Basic, M, mulberry32, type Builder } from "./_common";

const BOOK_MATS = [
  materials.bookA, materials.bookB, materials.bookC,
  materials.bookD, materials.bookE,
];

const PAINTING_FRAME = new THREE.BoxGeometry(0.72, 0.52, 0.04);
const PAINTING_ART = new THREE.BoxGeometry(0.6, 0.4, 0.05);

const SHELF_BODY = new THREE.BoxGeometry(1.2, 1.9, 0.35);
const SHELF_PLANK = new THREE.BoxGeometry(1.18, 0.03, 0.34);
const BOOK_SPINE = new THREE.BoxGeometry(0.08, 0.28, 0.22);
const PILE_BOOK = new THREE.BoxGeometry(0.28, 0.05, 0.22);

const CORK_BODY = new THREE.BoxGeometry(1.10, 0.78, 0.04);
const NOTE_GEO = new THREE.BoxGeometry(0.10, 0.09, 0.008);

const RAD_BODY = new THREE.BoxGeometry(1.5, 0.7, 0.18);
const RAD_FIN = new THREE.BoxGeometry(0.05, 0.66, 0.19);

const buildPainting: Builder = (prop) => {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(PAINTING_FRAME, materials.paintingFrame);
  frame.position.y = 1.7;
  g.add(frame);
  const idx = (prop.variant ?? 0) % materials.paintings.length;
  const art = new THREE.Mesh(PAINTING_ART, materials.paintings[idx]);
  art.position.set(0, 1.7, -0.05);
  g.add(art);
  return g;
};

// Tall side-wall shelf. Visible face is local -Z.
const buildBookshelf: Builder = (prop) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(SHELF_BODY, materials.bookshelf);
  body.position.set(0, 0.95, -0.15);
  g.add(body);
  const shelfYs = [0.3, 0.7, 1.1, 1.5];
  for (const y of shelfYs) {
    const plank = new THREE.Mesh(SHELF_PLANK, materials.bookshelf);
    plank.position.set(0, y, -0.15);
    g.add(plank);
  }
  const rand = mulberry32((prop.x * 31.7 + prop.z * 17.3) | 0);
  for (const y of shelfYs) {
    let x = -0.5;
    while (x < 0.5) {
      const h = 0.22 + rand() * 0.1;
      const w = 0.06 + rand() * 0.05;
      const book = new THREE.Mesh(BOOK_SPINE, BOOK_MATS[Math.floor(rand() * BOOK_MATS.length)]);
      book.scale.set(w / 0.08, h / 0.28, 1);
      book.position.set(x + w / 2, y + h / 2 + 0.015, -0.22);
      g.add(book);
      x += w + 0.005;
    }
  }
  return g;
};

// Small stack of books on a desk/shelf.
const buildBooksPile: Builder = () => {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const book = new THREE.Mesh(PILE_BOOK, BOOK_MATS[i % BOOK_MATS.length]);
    book.position.y = 0.78 + i * 0.055;
    book.rotation.y = (i % 2) * 0.08;
    g.add(book);
  }
  return g;
};

// Wall-mounted cork board with sticky notes. Faces local -Z. Smaller,
// pushed higher, and tighter to the wall than before.
const buildBulletinBoard: Builder = (prop) => {
  const g = new THREE.Group();
  const Y = 1.95;
  const body = new THREE.Mesh(CORK_BODY, materials.cork);
  // Body centred near the wall plane: local z=0 keeps the board's back
  // at z=+0.02 (just inside the wall) and front at z=-0.02.
  body.position.set(0, Y, 0);
  g.add(body);
  const noteMats = [materials.noteWhite, materials.noteYellow, materials.noteBlue];
  const rand = mulberry32((prop.x * 91.7 + prop.z * 53.1) | 0);
  for (let i = 0; i < 8; i++) {
    // Spread across the bigger board.
    const nx = (rand() - 0.5) * 0.9;
    const ny = Y + (rand() - 0.5) * 0.55;
    const note = new THREE.Mesh(NOTE_GEO, noteMats[Math.floor(rand() * noteMats.length)]);
    // Sit notes flush against the board's front face (board front at
    // z=-0.02). Note half-thickness 0.004 → centre at -0.024.
    note.position.set(nx, ny, -0.024);
    note.rotation.z = (rand() - 0.5) * 0.3;
    g.add(note);
  }
  return g;
};

// Floor-mounted radiator on a side wall. Extends into the room (-Z).
const buildRadiator: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(RAD_BODY, materials.radiator);
  body.position.set(0, 0.45, -0.11);
  g.add(body);
  for (let i = -6; i <= 6; i++) {
    const fin = new THREE.Mesh(RAD_FIN, materials.radiator);
    fin.position.set(i * 0.11, 0.45, -0.11);
    g.add(fin);
  }
  return g;
};

// Large educational wall map. Frame + colourful body. Variant picks
// which "kind" of map (0=world greens, 1=Switzerland reds, 2=periodic
// blues). All sit on the room side of a thin frame.
const MAP_FRAME = new THREE.BoxGeometry(0.6, 0.45, 0.04);
const MAP_BG = new THREE.PlaneGeometry(0.54, 0.40);
const MAP_REGION = new THREE.PlaneGeometry(0.10, 0.08);
const MAP_PALETTES = [
  // world map: ocean blue background, green continents
  { bg: 0x4a8acc, fg: [0x4a8a3a, 0x6aa050, 0x8ab070] },
  // Switzerland: red + white
  { bg: 0xc81818, fg: [0xf6f6f4, 0xe6e6e0, 0xc8c8c0] },
  // periodic table: navy with coloured groups
  { bg: 0x1a2a4a, fg: [0xe8c44a, 0x4adef0, 0xe07060] },
];
const buildMap: Builder = (prop) => {
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
  const rand = mulberry32((prop.x * 41.7 + prop.z * 23.1) | 0);
  // Visible bg area is 0.54 x 0.40 (centred). Each region must fit fully
  // inside that or it'll poke out past the frame.
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

// Old-school green chalkboard. Same overall shape as the whiteboard but
// with a darker face and a wooden chalk tray along the bottom.
const CHALK_FRAME = new THREE.BoxGeometry(2.6, 1.3, 0.04);
const CHALK_FACE = new THREE.BoxGeometry(2.5, 1.2, 0.05);
const CHALK_TRAY = new THREE.BoxGeometry(2.6, 0.06, 0.12);
const CHALK_STICK = new THREE.BoxGeometry(0.08, 0.018, 0.018);
const buildChalkboard: Builder = (prop) => {
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
  const rand = mulberry32((prop.x * 71.3 + prop.z * 13.9) | 0);
  const chalkMats = [M(0xf6f6f4), M(0xf6e070), M(0xf09090)];
  for (let i = 0; i < 4; i++) {
    const chalk = new THREE.Mesh(
      CHALK_STICK,
      chalkMats[Math.floor(rand() * chalkMats.length)],
    );
    chalk.position.set(-1.1 + i * 0.16 + rand() * 0.05, Y - 0.68, -0.11);
    g.add(chalk);
  }
  return g;
};

// Wall coat rack: tall vertical board with 4 hooks. Some hooks have a
// hanging coat in a random colour.
const COAT_BOARD = new THREE.BoxGeometry(0.6, 1.6, 0.04);
const COAT_HOOK = new THREE.BoxGeometry(0.04, 0.04, 0.08);
const COAT_BODY = new THREE.BoxGeometry(0.32, 0.55, 0.12);
const COAT_COLORS = [0x4a4a8a, 0x804a30, 0x2a5a3a, 0x603060, 0x4a4a4e];
const buildCoatRack: Builder = (prop) => {
  const g = new THREE.Group();
  const Y = 1.5;
  const board = new THREE.Mesh(COAT_BOARD, M(0x6a4a2a));
  board.position.set(0, Y, 0.02);
  g.add(board);
  const rand = mulberry32((prop.x * 53.1 + prop.z * 31.7) | 0);
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

export const WALL_DECOR_BUILDERS: Record<string, Builder> = {
  painting: buildPainting,
  bookshelf: buildBookshelf,
  books_pile: buildBooksPile,
  bulletin_board: buildBulletinBoard,
  radiator: buildRadiator,
  map: buildMap,
  chalkboard: buildChalkboard,
  coat_rack: buildCoatRack,
};
