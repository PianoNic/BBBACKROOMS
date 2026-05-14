import * as THREE from "three";
import type { Prop, PropType } from "../net/protocol";
import { materials } from "../rendering/materials";
import { buildItemModel } from "../gameplay/itemModels";
import { EXTRA_BUILDERS } from "./propsExtra";

type Builder = (prop: Prop) => THREE.Object3D;

// Shared geometries.
const G = {
  deskTop: new THREE.BoxGeometry(1.2, 0.05, 0.6),
  deskLeg: new THREE.BoxGeometry(0.05, 0.7, 0.05),
  chairSeat: new THREE.BoxGeometry(0.5, 0.05, 0.5),
  chairBack: new THREE.BoxGeometry(0.5, 0.4, 0.04),
  chairLeg: new THREE.BoxGeometry(0.04, 0.4, 0.04),
  sdTop: new THREE.BoxGeometry(0.7, 0.04, 0.5),
  sdLeg: new THREE.BoxGeometry(0.04, 0.68, 0.04),
  sdSeat: new THREE.BoxGeometry(0.4, 0.04, 0.4),
  sdBack: new THREE.BoxGeometry(0.4, 0.35, 0.04),
  sdSmallLeg: new THREE.BoxGeometry(0.04, 0.42, 0.04),
  wbFrame: new THREE.BoxGeometry(2.6, 1.3, 0.04),
  wbFace: new THREE.BoxGeometry(2.5, 1.2, 0.05),
  cupboardBody: new THREE.BoxGeometry(1.2, 1.8, 0.5),
  cupboardSplit: new THREE.BoxGeometry(0.03, 1.6, 0.51),
  closetBody: new THREE.BoxGeometry(0.8, 2.0, 0.45),
  closetHandle: new THREE.BoxGeometry(0.04, 0.1, 0.46),
  trashCan: new THREE.CylinderGeometry(0.18, 0.18, 0.45, 12),
  paintingFrame: new THREE.BoxGeometry(0.72, 0.52, 0.04),
  paintingArt: new THREE.BoxGeometry(0.6, 0.4, 0.05),
  pot: new THREE.CylinderGeometry(0.18, 0.14, 0.3, 10),
  foliage: new THREE.IcosahedronGeometry(0.32, 0),
  stallBack: new THREE.BoxGeometry(1.0, 2.0, 0.05),
  stallSide: new THREE.BoxGeometry(0.05, 2.0, 1.0),
  sinkBody: new THREE.BoxGeometry(0.6, 0.3, 0.4),
  sinkBasin: new THREE.BoxGeometry(0.46, 0.08, 0.28),
  sinkFaucet: new THREE.BoxGeometry(0.04, 0.18, 0.04),
  mirror: new THREE.BoxGeometry(0.55, 0.5, 0.03),
  benchSeat: new THREE.BoxGeometry(1.5, 0.06, 0.4),
  benchLeg: new THREE.BoxGeometry(0.05, 0.4, 0.05),
};

function addLegs(
  group: THREE.Group,
  geom: THREE.BoxGeometry,
  y: number,
  corners: [number, number][],
) {
  for (const [dx, dz] of corners) {
    const leg = new THREE.Mesh(geom, materials.deskLeg);
    leg.position.set(dx, y, dz);
    group.add(leg);
  }
}

const buildDesk: Builder = () => {
  const g = new THREE.Group();
  const top = new THREE.Mesh(G.deskTop, materials.deskWood);
  top.position.y = 0.725;
  g.add(top);
  addLegs(g, G.deskLeg, 0.35, [[0.55, 0.25], [-0.55, 0.25], [0.55, -0.25], [-0.55, -0.25]]);
  return g;
};

// Standalone chair: backrest on -Z side. At yaw=0 the sitter faces +Z.
const buildChair: Builder = () => {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(G.chairSeat, materials.deskWood);
  seat.position.y = 0.4225;
  g.add(seat);
  const back = new THREE.Mesh(G.chairBack, materials.deskWood);
  back.position.set(0, 0.65, -0.23);
  g.add(back);
  addLegs(g, G.chairLeg, 0.2, [[0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22]]);
  return g;
};

// Student desk + attached chair. Chair on +Z side (backrest at +Z).
// At yaw=0 the sitter faces -Z (toward the whiteboard placed on the -Z wall).
const buildStudentDesk: Builder = () => {
  const g = new THREE.Group();
  const top = new THREE.Mesh(G.sdTop, materials.studentDesk);
  top.position.y = 0.7;
  g.add(top);
  addLegs(g, G.sdLeg, 0.34, [[0.31, 0.21], [-0.31, 0.21], [0.31, -0.21], [-0.31, -0.21]]);
  const seat = new THREE.Mesh(G.sdSeat, materials.studentDesk);
  seat.position.set(0, 0.42, 0.55);
  g.add(seat);
  const back = new THREE.Mesh(G.sdBack, materials.studentDesk);
  back.position.set(0, 0.62, 0.73);
  g.add(back);
  addLegs(g, G.sdSmallLeg, 0.21, [
    [0.17, 0.55 - 0.17],
    [-0.17, 0.55 - 0.17],
    [0.17, 0.55 + 0.17],
    [-0.17, 0.55 + 0.17],
  ]);
  return g;
};

const buildWhiteboard: Builder = (prop) => {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(G.wbFrame, materials.whiteboardFrame);
  frame.position.y = 1.6;
  g.add(frame);
  // Only the whiteboards selected by the "wipe" quest carry scribbles
  // (variant >= 1 from the server); the rest stay clean.
  const dirty = (prop.variant ?? 0) > 0;
  const faceMat = dirty
    ? new THREE.MeshLambertMaterial({ map: makeWhiteboardTexture(prop.x * 13.37 + prop.z * 7.7) })
    : materials.whiteboardSurface;
  const face = new THREE.Mesh(G.wbFace, faceMat);
  face.position.set(0, 1.6, 0.025);
  g.add(face);
  return g;
};

const SCRIBBLE_LINES = [
  "f(x) = ax² + bx + c", "∫ x dx = x²/2 + C", "v = s / t",
  "U = R · I", "a² + b² = c²", "Goethe: Faust I",
  "HA: S. 47–52", "Probe am Freitag!", "sin² + cos² = 1",
  "TODO: Vortrag", "E = m·c²", "Prüfung: Kap. 3–5",
  "Σ k = n(n+1)/2", "lim x→0 sin(x)/x = 1", "if (x) { return y; }",
  "ax² + bx + c = 0", "F = m · a", "p · V = n · R · T",
  "HA bis Mi.!", "Klausur 2 Wo.", "Vokabeln S. 12",
];
const SCRIBBLE_COLORS = ["#1a1a1a", "#1a3a8c", "#8c1a1a", "#1a6020"];
const HAND_FONT = "'Caveat', 'Patrick Hand', 'Comic Sans MS', cursive";

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawScribble(c: HTMLCanvasElement, seed: number): void {
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#eae6d2";
  ctx.fillRect(0, 0, c.width, c.height);
  const rand = mulberry32(Math.floor(seed));
  const lines = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < lines; i++) {
    const text = SCRIBBLE_LINES[Math.floor(rand() * SCRIBBLE_LINES.length)];
    const color = SCRIBBLE_COLORS[Math.floor(rand() * SCRIBBLE_COLORS.length)];
    ctx.fillStyle = color;
    ctx.font = `${58 + Math.floor(rand() * 18)}px ${HAND_FONT}`;
    const x = 30 + rand() * 60;
    const y = 90 + i * (75 + rand() * 18);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rand() - 0.5) * 0.06);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  // A couple of crude doodles.
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 3;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    const x0 = 50 + rand() * 800;
    const y0 = 80 + rand() * 380;
    ctx.moveTo(x0, y0);
    for (let s = 0; s < 18; s++) {
      ctx.lineTo(x0 + s * 6 + rand() * 4, y0 + Math.sin(s * 0.5) * 14 + rand() * 4);
    }
    ctx.stroke();
  }
}

function makeWhiteboardTexture(seed: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  drawScribble(c, seed);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // Webfonts may not be ready on first paint — redraw once they load.
  if ("fonts" in document) {
    document.fonts.load(`48px Caveat`).then(() => {
      drawScribble(c, seed);
      tex.needsUpdate = true;
    });
  }
  return tex;
}

const buildCupboard: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G.cupboardBody, materials.cupboard);
  body.position.y = 0.9;
  g.add(body);
  const split = new THREE.Mesh(G.cupboardSplit, materials.deskLeg);
  split.position.y = 0.9;
  g.add(split);
  return g;
};

const buildCloset: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G.closetBody, materials.closet);
  body.position.y = 1.0;
  g.add(body);
  const handle = new THREE.Mesh(G.closetHandle, materials.deskLeg);
  handle.position.set(0.3, 1.0, 0);
  g.add(handle);
  return g;
};

const buildTrashCan: Builder = () => {
  const m = new THREE.Mesh(G.trashCan, materials.trashCan);
  m.position.y = 0.225;
  return m;
};

const buildPainting: Builder = (prop) => {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(G.paintingFrame, materials.paintingFrame);
  frame.position.y = 1.7;
  g.add(frame);
  const idx = (prop.variant ?? 0) % materials.paintings.length;
  const art = new THREE.Mesh(G.paintingArt, materials.paintings[idx]);
  art.position.set(0, 1.7, -0.02);
  g.add(art);
  return g;
};

const buildPlant: Builder = () => {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(G.pot, materials.pot);
  pot.position.y = 0.15;
  g.add(pot);
  const foliage = new THREE.Mesh(G.foliage, materials.foliage);
  foliage.position.y = 0.6;
  g.add(foliage);
  return g;
};

const TOILET_TANK = new THREE.BoxGeometry(0.42, 0.5, 0.18);
const TOILET_BOWL = new THREE.BoxGeometry(0.4, 0.36, 0.42);
const TOILET_SEAT = new THREE.BoxGeometry(0.42, 0.04, 0.44);
const TOILET_LID = new THREE.BoxGeometry(0.42, 0.03, 0.42);

function buildStallShell(g: THREE.Group): void {
  const back = new THREE.Mesh(G.stallBack, materials.stallPanel);
  back.position.set(0, 1.0, 0.475);
  g.add(back);
  const left = new THREE.Mesh(G.stallSide, materials.stallPanel);
  left.position.set(-0.475, 1.0, 0);
  g.add(left);
  const right = new THREE.Mesh(G.stallSide, materials.stallPanel);
  right.position.set(0.475, 1.0, 0);
  g.add(right);
}

function buildToiletFixture(g: THREE.Group): void {
  // Tank against the back wall, bowl forward, lid tilted up so the bowl is visible.
  const tank = new THREE.Mesh(TOILET_TANK, materials.toiletPorcelain);
  tank.position.set(0, 0.6, 0.36);
  g.add(tank);
  const bowl = new THREE.Mesh(TOILET_BOWL, materials.toiletPorcelain);
  bowl.position.set(0, 0.2, 0.06);
  g.add(bowl);
  const seat = new THREE.Mesh(TOILET_SEAT, materials.toiletSeat);
  seat.position.set(0, 0.4, 0.05);
  g.add(seat);
  const lid = new THREE.Mesh(TOILET_LID, materials.toiletSeat);
  lid.position.set(0, 0.6, 0.22);
  lid.rotation.x = -Math.PI / 4;
  g.add(lid);
}

const buildToiletStall: Builder = () => {
  const g = new THREE.Group();
  buildStallShell(g);
  buildToiletFixture(g);
  return g;
};

const URINAL_BOWL = new THREE.BoxGeometry(0.34, 0.5, 0.28);
const URINAL_LIP = new THREE.BoxGeometry(0.34, 0.06, 0.22);
const URINAL_PIPE = new THREE.BoxGeometry(0.05, 0.22, 0.05);

const buildUrinal: Builder = () => {
  const g = new THREE.Group();
  // Bowl extends INTO the room (-Z). Origin sits on the wall (z=0).
  const bowl = new THREE.Mesh(URINAL_BOWL, materials.toiletPorcelain);
  bowl.position.set(0, 0.85, -0.16);
  g.add(bowl);
  const lip = new THREE.Mesh(URINAL_LIP, materials.toiletPorcelain);
  lip.position.set(0, 1.13, -0.12);
  g.add(lip);
  const pipe = new THREE.Mesh(URINAL_PIPE, materials.faucet);
  pipe.position.set(0, 1.25, -0.02);
  g.add(pipe);
  return g;
};

const buildSink: Builder = () => {
  const g = new THREE.Group();
  // Body extends in -Z so it juts INTO the room when mounted on a wall.
  const body = new THREE.Mesh(G.sinkBody, materials.sink);
  body.position.set(0, 0.85, -0.2);
  g.add(body);
  const basin = new THREE.Mesh(G.sinkBasin, materials.sinkBasin);
  basin.position.set(0, 0.9601, -0.2);
  g.add(basin);
  const faucet = new THREE.Mesh(G.sinkFaucet, materials.faucet);
  faucet.position.set(0, 1.05, -0.04);
  g.add(faucet);
  const spout = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.14), materials.faucet);
  spout.position.set(0, 1.12, -0.1);
  g.add(spout);
  // Mirror above the sink, flush against the wall (z=0, facing into the room).
  const mirror = new THREE.Mesh(G.mirror, materials.mirror);
  mirror.position.set(0, 1.7, -0.015);
  g.add(mirror);
  return g;
};

const buildBench: Builder = () => {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(G.benchSeat, materials.deskWood);
  seat.position.y = 0.4;
  g.add(seat);
  addLegs(g, G.benchLeg, 0.2, [[0.7, 0.15], [-0.7, 0.15], [0.7, -0.15], [-0.7, -0.15]]);
  return g;
};

const buildPapers: Builder = () => {
  const g = buildItemModel("papers");
  g.position.y = 0.02;
  return g;
};

const BOOK_MATS = [
  materials.bookA, materials.bookB, materials.bookC,
  materials.bookD, materials.bookE,
];
const SHELF_BODY = new THREE.BoxGeometry(1.2, 1.9, 0.35);
const SHELF_PLANK = new THREE.BoxGeometry(1.18, 0.03, 0.34);
const BOOK_SPINE = new THREE.BoxGeometry(0.08, 0.28, 0.22);

// Bookshelf: tall side-wall shelf. Side-wall props show their visible face
// in local -Z (after yaw rotation, this points into the room).
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
  const seed = (prop.x * 31.7 + prop.z * 17.3) | 0;
  const rand = mulberry32(seed);
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

const CLOCK_RIM = new THREE.CylinderGeometry(0.22, 0.22, 0.04, 18);
const CLOCK_FACE = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 18);
const HOUR_HAND = new THREE.BoxGeometry(0.025, 0.12, 0.01);
const MIN_HAND = new THREE.BoxGeometry(0.02, 0.17, 0.01);

// Wall clock mounted high on the FRONT wall. Front-wall props stick out in
// local +Z (which is into the room at yaw=0).
const buildClock: Builder = (prop) => {
  const g = new THREE.Group();
  const Y = 2.6;
  const rim = new THREE.Mesh(CLOCK_RIM, materials.clockRim);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, Y, 0.05);
  g.add(rim);
  const face = new THREE.Mesh(CLOCK_FACE, materials.clockFace);
  face.rotation.x = Math.PI / 2;
  face.position.set(0, Y, 0.07);
  g.add(face);
  const seed = (prop.x * 7.1 + prop.z * 11.3);
  const hourAngle = (seed % (Math.PI * 2));
  const minAngle = ((seed * 12) % (Math.PI * 2));
  const hh = new THREE.Mesh(HOUR_HAND, materials.clockHand);
  hh.position.set(Math.sin(hourAngle) * 0.05, Y + Math.cos(hourAngle) * 0.05, 0.1);
  hh.rotation.z = -hourAngle;
  g.add(hh);
  const mh = new THREE.Mesh(MIN_HAND, materials.clockHand);
  mh.position.set(Math.sin(minAngle) * 0.07, Y + Math.cos(minAngle) * 0.07, 0.1);
  mh.rotation.z = -minAngle;
  g.add(mh);
  return g;
};

const GLOBE_BALL = new THREE.SphereGeometry(0.16, 10, 8);
const GLOBE_STAND = new THREE.CylinderGeometry(0.08, 0.1, 0.06, 10);
const GLOBE_AXIS = new THREE.BoxGeometry(0.02, 0.4, 0.02);

// Free-standing globe on a small base.
const buildGlobe: Builder = () => {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(GLOBE_STAND, materials.globeStand);
  stand.position.y = 0.03;
  g.add(stand);
  const axis = new THREE.Mesh(GLOBE_AXIS, materials.globeStand);
  axis.position.y = 0.22;
  axis.rotation.z = 0.4;
  g.add(axis);
  const ball = new THREE.Mesh(GLOBE_BALL, materials.globeBall);
  ball.position.y = 0.26;
  g.add(ball);
  return g;
};

const FLAG_BG = new THREE.BoxGeometry(0.5, 0.5, 0.04);
const FLAG_BAR_V = new THREE.BoxGeometry(0.12, 0.32, 0.05);
const FLAG_BAR_H = new THREE.BoxGeometry(0.32, 0.12, 0.05);

// Wall-mounted Swiss flag on the FRONT wall. Sticks out in local +Z.
const buildSwissFlag: Builder = () => {
  const g = new THREE.Group();
  const Y = 2.55;
  const bg = new THREE.Mesh(FLAG_BG, materials.flagRed);
  bg.position.set(0, Y, 0.04);
  g.add(bg);
  const v = new THREE.Mesh(FLAG_BAR_V, materials.flagCross);
  v.position.set(0, Y, 0.07);
  g.add(v);
  const h = new THREE.Mesh(FLAG_BAR_H, materials.flagCross);
  h.position.set(0, Y, 0.07);
  g.add(h);
  return g;
};

const PROJ_BODY = new THREE.BoxGeometry(0.4, 0.18, 0.3);
const PROJ_LENS = new THREE.CylinderGeometry(0.06, 0.06, 0.06, 10);
const PROJ_MOUNT = new THREE.BoxGeometry(0.04, 0.4, 0.04);

// Ceiling-mounted projector hanging on a short rod.
const buildProjector: Builder = () => {
  const g = new THREE.Group();
  const mount = new THREE.Mesh(PROJ_MOUNT, materials.lampPole);
  mount.position.y = 2.6;
  g.add(mount);
  const body = new THREE.Mesh(PROJ_BODY, materials.projector);
  body.position.y = 2.35;
  g.add(body);
  const lens = new THREE.Mesh(PROJ_LENS, materials.projectorLens);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 2.35, -0.18);
  g.add(lens);
  return g;
};

const CORK_BODY = new THREE.BoxGeometry(0.9, 0.7, 0.04);
const NOTE_GEO = new THREE.BoxGeometry(0.16, 0.14, 0.01);

// Wall-mounted cork bulletin board on a SIDE wall. Faces local -Z.
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

const RAD_BODY = new THREE.BoxGeometry(1.0, 0.5, 0.12);
const RAD_FIN = new THREE.BoxGeometry(0.04, 0.46, 0.13);

// Floor-mounted radiator on a SIDE wall. Extends in local -Z (into room).
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

const BP_BODY = new THREE.BoxGeometry(0.32, 0.42, 0.2);
const BP_STRAP = new THREE.BoxGeometry(0.04, 0.3, 0.06);
const BP_POCKET = new THREE.BoxGeometry(0.22, 0.18, 0.04);

// Backpack slumped on the floor.
const buildBackpack: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(BP_BODY, materials.backpack);
  body.position.y = 0.21;
  g.add(body);
  const pocket = new THREE.Mesh(BP_POCKET, materials.backpack);
  pocket.position.set(0, 0.16, 0.11);
  g.add(pocket);
  const sl = new THREE.Mesh(BP_STRAP, materials.backpack);
  sl.position.set(-0.1, 0.32, -0.1);
  g.add(sl);
  const sr = new THREE.Mesh(BP_STRAP, materials.backpack);
  sr.position.set(0.1, 0.32, -0.1);
  g.add(sr);
  g.rotation.z = -0.15;
  return g;
};

const PILE_GEO = new THREE.BoxGeometry(0.28, 0.05, 0.22);

// Small stack of books on a desk/shelf.
const buildBooksPile: Builder = () => {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const book = new THREE.Mesh(PILE_GEO, BOOK_MATS[i % BOOK_MATS.length]);
    book.position.y = 0.78 + i * 0.055;
    book.rotation.y = (i % 2) * 0.08;
    g.add(book);
  }
  return g;
};

const FIRE_BODY = new THREE.CylinderGeometry(0.07, 0.07, 0.36, 10);
const FIRE_TOP = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 10);
const FIRE_HOSE = new THREE.BoxGeometry(0.04, 0.18, 0.04);

// Wall-mounted fire extinguisher (side wall). Extends in local -Z.
const buildFireExtinguisher: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(FIRE_BODY, materials.fireRed);
  body.position.set(0, 0.75, -0.1);
  g.add(body);
  const top = new THREE.Mesh(FIRE_TOP, materials.lampPole);
  top.position.set(0, 0.97, -0.1);
  g.add(top);
  const hose = new THREE.Mesh(FIRE_HOSE, materials.lampPole);
  hose.position.set(0.06, 0.85, -0.13);
  hose.rotation.z = 0.5;
  g.add(hose);
  return g;
};

const LAMP_BASE = new THREE.CylinderGeometry(0.18, 0.22, 0.05, 12);
const LAMP_POLE = new THREE.CylinderGeometry(0.025, 0.025, 1.7, 8);
const LAMP_SHADE = new THREE.CylinderGeometry(0.18, 0.26, 0.32, 12);

// Standing floor lamp with a warm glowing shade.
const buildFloorLamp: Builder = () => {
  const g = new THREE.Group();
  const base = new THREE.Mesh(LAMP_BASE, materials.lampPole);
  base.position.y = 0.025;
  g.add(base);
  const pole = new THREE.Mesh(LAMP_POLE, materials.lampPole);
  pole.position.y = 0.9;
  g.add(pole);
  const shade = new THREE.Mesh(LAMP_SHADE, materials.lampShade);
  shade.position.y = 1.85;
  g.add(shade);
  const light = new THREE.PointLight(0xf3d98a, 0.6, 4.5, 1.6);
  light.position.y = 1.75;
  g.add(light);
  return g;
};

// "laptop" props are filtered out server-side and rendered by the Laptops manager.
const BUILDERS: Partial<Record<PropType, Builder>> = {
  desk: buildDesk,
  chair: buildChair,
  student_desk: buildStudentDesk,
  whiteboard: buildWhiteboard,
  cupboard: buildCupboard,
  closet: buildCloset,
  trash_can: buildTrashCan,
  painting: buildPainting,
  plant: buildPlant,
  toilet_stall: buildToiletStall,
  sink: buildSink,
  bench: buildBench,
  papers: buildPapers,
  urinal: buildUrinal,
  bookshelf: buildBookshelf,
  clock: buildClock,
  globe: buildGlobe,
  swiss_flag: buildSwissFlag,
  projector: buildProjector,
  bulletin_board: buildBulletinBoard,
  radiator: buildRadiator,
  backpack: buildBackpack,
  books_pile: buildBooksPile,
  fire_extinguisher: buildFireExtinguisher,
  // "locker" is server-filtered and rendered by the Lockers manager.
  floor_lamp: buildFloorLamp,
  ...(EXTRA_BUILDERS as Partial<Record<PropType, Builder>>),
};

export function buildProps(props: Prop[]): THREE.Group {
  const group = new THREE.Group();
  for (const p of props) {
    const obj = BUILDERS[p.type]?.(p);
    if (!obj) continue;
    obj.position.set(p.x, 0, p.z);
    obj.rotation.y = p.yaw;
    group.add(obj);
  }
  return group;
}
