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

function buildPotion(): THREE.Group {
  const g = new THREE.Group();
  const glass = new THREE.MeshLambertMaterial({
    color: 0x6ad6b8, transparent: true, opacity: 0.85,
  });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 12), glass));
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), glass);
  neck.position.y = 0.22;
  g.add(neck);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.06, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a3a2a }),
  );
  cap.position.y = 0.31;
  g.add(cap);
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
  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.064, 16),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  face.rotation.x = Math.PI / 2;
  g.add(face);
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.20, 0.01),
    new THREE.MeshBasicMaterial({ color: 0xe8c44a }),
  );
  needle.position.z = 0.035;
  g.add(needle);
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
  // Two red lens cups + connecting bridge + headstrap arc.
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
  const strap = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.018, 6, 16, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0x101012 }),
  );
  strap.rotation.x = Math.PI / 2;
  strap.position.set(0, 0, -0.04);
  g.add(strap);
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
