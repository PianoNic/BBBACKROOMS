/** Side- + back-wall decoration: paintings, bookshelves, books piles,
 *  bulletin boards, radiators. */
import * as THREE from "three";
import { materials } from "../../rendering/materials";
import { mulberry32, type Builder } from "./_common";

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

const CORK_BODY = new THREE.BoxGeometry(0.9, 0.7, 0.04);
const NOTE_GEO = new THREE.BoxGeometry(0.16, 0.14, 0.01);

const RAD_BODY = new THREE.BoxGeometry(1.0, 0.5, 0.12);
const RAD_FIN = new THREE.BoxGeometry(0.04, 0.46, 0.13);

const buildPainting: Builder = (prop) => {
  const g = new THREE.Group();
  // Frame against the wall (+Z), art in front of frame on the room side
  // (-Z). No z-overlap so the art is always visibly in front.
  const frame = new THREE.Mesh(PAINTING_FRAME, materials.paintingFrame);
  frame.position.set(0, 1.7, 0.02);
  g.add(frame);
  const idx = (prop.variant ?? 0) % materials.paintings.length;
  const art = new THREE.Mesh(PAINTING_ART, materials.paintings[idx]);
  art.position.set(0, 1.7, -0.03);
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

// Wall-mounted cork board with sticky notes. Faces local -Z.
const buildBulletinBoard: Builder = (prop) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(CORK_BODY, materials.cork);
  body.position.set(0, 1.7, -0.04);
  g.add(body);
  const noteMats = [materials.noteWhite, materials.noteYellow, materials.noteBlue];
  const rand = mulberry32((prop.x * 91.7 + prop.z * 53.1) | 0);
  for (let i = 0; i < 5; i++) {
    const nx = (rand() - 0.5) * 0.7;
    const ny = 1.7 + (rand() - 0.5) * 0.5;
    const note = new THREE.Mesh(NOTE_GEO, noteMats[Math.floor(rand() * noteMats.length)]);
    note.position.set(nx, ny, -0.07);
    note.rotation.z = (rand() - 0.5) * 0.3;
    g.add(note);
  }
  return g;
};

// Floor-mounted radiator on a side wall. Extends into the room (-Z).
const buildRadiator: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(RAD_BODY, materials.radiator);
  body.position.set(0, 0.35, -0.08);
  g.add(body);
  for (let i = -4; i <= 4; i++) {
    const fin = new THREE.Mesh(RAD_FIN, materials.radiator);
    fin.position.set(i * 0.1, 0.35, -0.08);
    g.add(fin);
  }
  return g;
};

export const WALL_DECOR_BUILDERS: Record<string, Builder> = {
  painting: buildPainting,
  bookshelf: buildBookshelf,
  books_pile: buildBooksPile,
  bulletin_board: buildBulletinBoard,
  radiator: buildRadiator,
};
