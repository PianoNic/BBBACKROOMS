/** THREE.Group builders for every world pickup. Kept apart from the
 *  `Pickups` runtime so adding a new pickup kind only touches this file
 *  (plus the dispatch at the bottom). */
import * as THREE from "three";
import type { PickupKind } from "../net/protocol";

function buildMedkit(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.28, 0.32),
    new THREE.MeshLambertMaterial({ color: 0xe8e8e2 }),
  );
  g.add(body);
  const cross = new THREE.MeshBasicMaterial({ color: 0xd03030 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.20, 0.34), cross));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.34), cross));
  return g;
}

// Lazily loaded once + shared. Reuses the same Texture across all potion
// pickups so we're not re-decoding the JPG for every can in the level.
let _elTonyTex: THREE.Texture | null = null;
function elTonyTexture(): THREE.Texture {
  if (!_elTonyTex) {
    _elTonyTex = new THREE.TextureLoader().load("/el-tony-logo.jpg");
    _elTonyTex.colorSpace = THREE.SRGBColorSpace;
    _elTonyTex.anisotropy = 4;
  }
  return _elTonyTex;
}

function buildPotion(): THREE.Group {
  const g = new THREE.Group();
  // El Tony Mate-style can. Stubby / wide proportions (fat short can, not
  // a slim energy drink). Navy body, gold bands at top + bottom (the
  // aztec ribbon pattern simplified to solid rings), real logo wrapped
  // around the front, exposed aluminium lid + base.
  const navyMat = new THREE.MeshLambertMaterial({ color: 0x506c95 });
  const silverMat = new THREE.MeshLambertMaterial({ color: 0xc8ccd2 });
  const goldMat = new THREE.MeshLambertMaterial({ color: 0xf2c130 });
  const logoMat = new THREE.MeshBasicMaterial({ map: elTonyTexture() });

  const RADIUS = 0.13;
  const HEIGHT = 0.30;

  // Navy main body.
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIUS, RADIUS, HEIGHT, 24), navyMat,
  );
  g.add(body);

  // Gold ribbon bands wrapping the full circumference, one near the top
  // edge and one near the bottom edge of the label.
  const BAND_H = 0.018;
  const bandR = RADIUS + 0.0008;
  const topBand = new THREE.Mesh(
    new THREE.CylinderGeometry(bandR, bandR, BAND_H, 24, 1, true), goldMat,
  );
  topBand.position.y = HEIGHT / 2 - BAND_H / 2 - 0.008;
  g.add(topBand);
  const bottomBand = topBand.clone();
  bottomBand.position.y = -HEIGHT / 2 + BAND_H / 2 + 0.008;
  g.add(bottomBand);

  // Logo wrapped around the front: arc-of-cylinder hugging the body so
  // the picture follows the curve instead of clipping flat through it.
  const LABEL_ARC = Math.PI * 0.4;
  const LABEL_H = RADIUS * 1.4;
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(
      RADIUS + 0.002, RADIUS + 0.002, LABEL_H,
      24, 1, true,
      Math.PI / 2 - LABEL_ARC / 2, LABEL_ARC,
    ),
    logoMat,
  );
  g.add(label);

  // Aluminium top: slight inward shoulder, then the recessed lid disc,
  // then a small pull tab.
  const topShoulder = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIUS * 0.9, RADIUS, 0.018, 24), silverMat,
  );
  topShoulder.position.y = HEIGHT / 2 + 0.009;
  g.add(topShoulder);
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIUS * 0.9, RADIUS * 0.9, 0.012, 24), silverMat,
  );
  lid.position.y = HEIGHT / 2 + 0.024;
  g.add(lid);
  const tab = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.005, 0.022), silverMat,
  );
  tab.position.set(0, HEIGHT / 2 + 0.034, 0);
  g.add(tab);

  // Aluminium base: inset disc at the bottom so the can stands on its
  // rim, like real aluminium cans.
  const bottomShoulder = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIUS, RADIUS * 0.9, 0.018, 24), silverMat,
  );
  bottomShoulder.position.y = -HEIGHT / 2 - 0.009;
  g.add(bottomShoulder);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIUS * 0.9, RADIUS * 0.9, 0.012, 24), silverMat,
  );
  base.position.y = -HEIGHT / 2 - 0.024;
  g.add(base);

  return g;
}

function buildCompass(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16),
    new THREE.MeshLambertMaterial({ color: 0xc8a25a }),
  );
  body.rotation.x = Math.PI / 2;
  g.add(body);
  // Dial face inset on the FRONT only — it used to be a deep cylinder
  // that poked through both sides, leaving the back looking black.
  // Shrink to a thin disc and pull it forward so the back of the compass
  // shows the brass case instead.
  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.02, 16),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  face.rotation.x = Math.PI / 2;
  face.position.z = 0.022;
  g.add(face);
  // Proper compass needle: diamond-shaped, red north tip + white south
  // tail + a brass pivot at the centre. Cone geometry gives the pointed
  // shape; we put one cone tip-out for north and a second tip-in for the
  // tail so the silhouette tapers from both ends like a real needle.
  const NEEDLE_LEN = 0.11;
  const NEEDLE_W = 0.022;
  const Z_OFFSET = 0.036;
  const north = new THREE.Mesh(
    new THREE.ConeGeometry(NEEDLE_W, NEEDLE_LEN, 4),
    new THREE.MeshBasicMaterial({ color: 0xd03030 }),
  );
  north.position.set(0, NEEDLE_LEN / 2, Z_OFFSET);
  g.add(north);
  const south = new THREE.Mesh(
    new THREE.ConeGeometry(NEEDLE_W, NEEDLE_LEN, 4),
    new THREE.MeshBasicMaterial({ color: 0xe8e6dc }),
  );
  south.rotation.z = Math.PI;
  south.position.set(0, -NEEDLE_LEN / 2, Z_OFFSET);
  g.add(south);
  const pivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.012, 12),
    new THREE.MeshLambertMaterial({ color: 0xc8a25a }),
  );
  pivot.rotation.x = Math.PI / 2;
  pivot.position.z = Z_OFFSET + 0.006;
  g.add(pivot);
  return g;
}

function buildTracker(): THREE.Group {
  const g = new THREE.Group();
  // Boxy handheld scanner: dark body + cyan radar screen + red-tipped antenna.
  g.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.30, 0.10),
    new THREE.MeshLambertMaterial({ color: 0x1a2a36 }),
  ));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x4adef0 }),
  );
  screen.position.set(0, 0.04, 0.051);
  g.add(screen);
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8),
    new THREE.MeshLambertMaterial({ color: 0x282828 }),
  );
  antenna.position.set(-0.07, 0.24, 0);
  g.add(antenna);
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff5a5a }),
  );
  tip.position.set(-0.07, 0.34, 0);
  g.add(tip);
  return g;
}

function buildGoggles(): THREE.Group {
  const g = new THREE.Group();
  // Two red lens cups + connecting bridge + a temple arm on each side
  // (the sticks that hook over the ears, like real glasses).
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x252a30 });
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xff5a3a });
  const mkLens = (x: number): void => {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 0.08, 16), frameMat,
    );
    cup.rotation.x = Math.PI / 2;
    cup.position.set(x, 0, 0);
    g.add(cup);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), lensMat);
    glass.position.set(x, 0, 0.041);
    g.add(glass);
  };
  mkLens(-0.10);
  mkLens(0.10);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.04), frameMat));
  // Temple arms: a thin stick on each side extending back toward the ear.
  // Anchored at the outer edge of each lens cup, length ~0.18 (≈14cm scaled).
  const templeLen = 0.18;
  const mkTemple = (x: number): void => {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.018, templeLen), frameMat,
    );
    arm.position.set(x, 0, -templeLen / 2);
    g.add(arm);
  };
  mkTemple(-0.19);
  mkTemple(0.19);
  return g;
}

function buildGps(): THREE.Group {
  const g = new THREE.Group();
  // Squat satellite-dish on a puck — distinct from the boxy tracker.
  g.add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16),
    new THREE.MeshLambertMaterial({ color: 0x2a2a30 }),
  ));
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.04, 0.04, 16, 1, true),
    new THREE.MeshLambertMaterial({ color: 0xe8e8ec, side: THREE.DoubleSide }),
  );
  dish.position.y = 0.10;
  g.add(dish);
  const emitter = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff3a3a }),
  );
  emitter.position.y = 0.16;
  g.add(emitter);
  return g;
}

const BUILDERS: Record<PickupKind, () => THREE.Group> = {
  medkit: buildMedkit,
  potion: buildPotion,
  compass: buildCompass,
  tracker: buildTracker,
  goggles: buildGoggles,
  gps: buildGps,
};

export function buildPickupModel(kind: PickupKind): THREE.Group {
  return (BUILDERS[kind] ?? buildCompass)();
}

const LABELS: Record<PickupKind, string> = {
  medkit: "pick up medkit",
  potion: "pick up potion",
  compass: "pick up compass",
  tracker: "pick up tracker",
  goggles: "pick up thermal goggles",
  gps: "pick up GPS tracker",
};

export function pickupLabel(kind: PickupKind): string {
  return LABELS[kind] ?? "pick up item";
}
