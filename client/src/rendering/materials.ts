import * as THREE from "three";

function loadTiled(url: string, repeat: [number, number]) {
  const tex = new THREE.TextureLoader().load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.repeat.set(...repeat);
  return tex;
}

function loadPainting(url: string) {
  const tex = new THREE.TextureLoader().load(url);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

const wallTexture = loadTiled("/textures/wall.png", [1, 1.5]);
const floorTexture = loadTiled("/textures/floor.png", [1, 1]);
const ceilingTexture = loadTiled("/textures/ceiling.png", [1, 1]);

const PAINTING_FILES: ReadonlyArray<string> = Array.from(
  { length: 42 }, (_, i) => `painting-${String(i + 1).padStart(2, "0")}.png`,
);
const paintingMaterials = PAINTING_FILES.map(
  (f) => new THREE.MeshLambertMaterial({ map: loadPainting(`/textures/paintings/${f}`) }),
);

/** Central palette. PS1-ish: Lambert for surfaces, Basic for emissives. */
export const materials = {
  floor: new THREE.MeshLambertMaterial({ map: floorTexture }),
  wall: new THREE.MeshLambertMaterial({ map: wallTexture }),
  ceiling: new THREE.MeshLambertMaterial({ map: ceilingTexture }),
  deskWood: new THREE.MeshLambertMaterial({ color: 0x7a4a22 }),
  deskLeg: new THREE.MeshLambertMaterial({ color: 0x222227 }),
  studentDesk: new THREE.MeshLambertMaterial({ color: 0xa57a3a }),
  whiteboardFrame: new THREE.MeshLambertMaterial({ color: 0x2a2a2e }),
  whiteboardSurface: new THREE.MeshLambertMaterial({ color: 0xeae6d2 }),
  cupboard: new THREE.MeshLambertMaterial({ color: 0x4a3520 }),
  closet: new THREE.MeshLambertMaterial({ color: 0x6f7480 }),
  trashCan: new THREE.MeshLambertMaterial({ color: 0x222226 }),
  paintings: paintingMaterials,
  paintingFrame: new THREE.MeshLambertMaterial({ color: 0x18120a }),
  pot: new THREE.MeshLambertMaterial({ color: 0x5a3a2a }),
  foliage: new THREE.MeshLambertMaterial({ color: 0x356b2d }),
  stallPanel: new THREE.MeshLambertMaterial({ color: 0x8a9099 }),
  sink: new THREE.MeshLambertMaterial({ color: 0xe6e6e2 }),
  sinkBasin: new THREE.MeshLambertMaterial({ color: 0xbcbcb8 }),
  faucet: new THREE.MeshLambertMaterial({ color: 0x8a8d92 }),
  mirror: new THREE.MeshBasicMaterial({ color: 0x9fb8c8 }),
  toiletPorcelain: new THREE.MeshLambertMaterial({ color: 0xeeeee8 }),
  toiletSeat: new THREE.MeshLambertMaterial({ color: 0xd9d9d3 }),
  neon: new THREE.MeshBasicMaterial({ color: 0xff4dc4 }),
  lightFixture: new THREE.MeshBasicMaterial({ color: 0xffffcc }),
  bookshelf: new THREE.MeshLambertMaterial({ color: 0x3a2614 }),
  bookA: new THREE.MeshLambertMaterial({ color: 0x8a3030 }),
  bookB: new THREE.MeshLambertMaterial({ color: 0x2f4a78 }),
  bookC: new THREE.MeshLambertMaterial({ color: 0x4a6a2a }),
  bookD: new THREE.MeshLambertMaterial({ color: 0xc8a25a }),
  bookE: new THREE.MeshLambertMaterial({ color: 0x553a1c }),
  clockFace: new THREE.MeshLambertMaterial({ color: 0xeae6d2 }),
  clockRim: new THREE.MeshLambertMaterial({ color: 0x18120a }),
  clockHand: new THREE.MeshBasicMaterial({ color: 0x111111 }),
  globeBall: new THREE.MeshLambertMaterial({ color: 0x2a5a8a }),
  globeStand: new THREE.MeshLambertMaterial({ color: 0x18120a }),
  flagRed: new THREE.MeshLambertMaterial({ color: 0xc62828 }),
  flagCross: new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }),
  projector: new THREE.MeshLambertMaterial({ color: 0x1a1a1e }),
  projectorLens: new THREE.MeshBasicMaterial({ color: 0xffe28a }),
  cork: new THREE.MeshLambertMaterial({ color: 0x7a5230 }),
  pin: new THREE.MeshBasicMaterial({ color: 0xff4d4d }),
  noteWhite: new THREE.MeshLambertMaterial({ color: 0xeae6d2 }),
  noteYellow: new THREE.MeshLambertMaterial({ color: 0xe8c95a }),
  noteBlue: new THREE.MeshLambertMaterial({ color: 0x7a9fc8 }),
  radiator: new THREE.MeshLambertMaterial({ color: 0xd0cec5 }),
  backpack: new THREE.MeshLambertMaterial({ color: 0x2a3a4a }),
  fireRed: new THREE.MeshLambertMaterial({ color: 0xa01818 }),
  locker: new THREE.MeshLambertMaterial({ color: 0x4a5260 }),
  lockerDoor: new THREE.MeshLambertMaterial({ color: 0x3a4250 }),
  lockerInside: new THREE.MeshLambertMaterial({ color: 0x1c2028 }),
  lampPole: new THREE.MeshLambertMaterial({ color: 0x1a1a1e }),
  lampShade: new THREE.MeshBasicMaterial({ color: 0xf3d98a }),
};
