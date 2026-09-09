/** Desk-found items: school supplies + personal objects players hunt for. */
import {
  Group, basicMaterial, disc, group, cylinder as bxCylinder, torus,
} from "../../rendering/babylon";
import { box, cyl, halfTorus, M } from "./_common";

const COVER_BLUE = () => M(0x2a4ea0);
const COVER_RED = () => M(0x923030);
const PAPER = () => M(0xf2eedd);
const PENCIL_RED = () => M(0xcc3a30);
const PENCIL_BLACK = () => M(0x18181a);
const PLASTIC_DARK = () => M(0x222226);
const SCREEN = () => M(0x101418);
const KEY_BRASS = () => M(0xc7a14a);
const PHONE = () => M(0x1b1b20);
const ENV_CREAM = () => M(0xe9dcb4);
const MUG_WHITE = () => M(0xeeeeea);

export function notebook(): Group {
  const g = group("notebook");
  g.add(box(0.36, 0.04, 0.26, COVER_BLUE()));
  g.add(box(0.34, 0.045, 0.24, PAPER(), 0, 0, 0));
  g.add(box(0.02, 0.05, 0.26, M(0x1a1a1a), -0.17, 0.005, 0));
  return g;
}

export function pencilCase(): Group {
  const g = group("pencilCase");
  const c = cyl(0.06, 0.32, PENCIL_RED());
  c.rotation.z = Math.PI / 2;
  g.add(c);
  const zip = box(0.34, 0.005, 0.005, PENCIL_BLACK(), 0, 0.06, 0);
  g.add(zip);
  return g;
}

export function papers(): Group {
  const g = group("papers");
  for (let i = 0; i < 4; i++) {
    const sheet = box(
      0.3, 0.01, 0.22, PAPER(),
      (Math.random() - 0.5) * 0.04, i * 0.012, (Math.random() - 0.5) * 0.04,
    );
    sheet.rotation.y = (Math.random() - 0.5) * 0.3;
    g.add(sheet);
  }
  return g;
}

export function calculator(): Group {
  const g = group("calculator");
  g.add(box(0.18, 0.03, 0.3, PLASTIC_DARK()));
  g.add(box(0.14, 0.005, 0.08, SCREEN(), 0, 0.018, -0.08));
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      g.add(box(
        0.025, 0.005, 0.025, M(0x444448),
        -0.04 + c * 0.04, 0.018, -0.005 + r * 0.04,
      ));
    }
  }
  return g;
}

export function textbook(): Group {
  const g = group("textbook");
  g.add(box(0.36, 0.1, 0.26, COVER_RED()));
  g.add(box(0.34, 0.09, 0.24, PAPER()));
  g.add(box(0.02, 0.1, 0.26, M(0x4a1414), -0.17, 0, 0));
  return g;
}

export function mug(): Group {
  const g = group("mug");
  g.add(cyl(0.07, 0.16, MUG_WHITE(), 0, 0, 0, 20));
  const handle = halfTorus(0.05, 0.012, 8, 16, MUG_WHITE());
  handle.position.set(0.07, 0, 0);
  handle.rotation.y = Math.PI / 2;
  g.add(handle);
  g.add(cyl(0.06, 0.005, M(0x3a2418), 0, 0.078, 0, 20));
  return g;
}

export function key(): Group {
  const g = group("key");
  const bow = cyl(0.05, 0.012, KEY_BRASS(), -0.1, 0, 0);
  bow.rotation.x = Math.PI / 2;
  g.add(bow);
  g.add(box(0.22, 0.01, 0.018, KEY_BRASS(), 0, 0, 0));
  g.add(box(0.02, 0.01, 0.035, KEY_BRASS(), 0.09, 0, 0.022));
  g.add(box(0.02, 0.01, 0.03, KEY_BRASS(), 0.06, 0, 0.02));
  return g;
}

export function phone(): Group {
  const g = group("phone");
  g.add(box(0.1, 0.015, 0.2, PHONE()));
  g.add(box(0.085, 0.005, 0.17, SCREEN(), 0, 0.01, 0));
  return g;
}

export function envelope(): Group {
  const g = group("envelope");
  g.add(box(0.3, 0.01, 0.2, ENV_CREAM()));
  const flap = box(0.3, 0.005, 0.1, ENV_CREAM(), 0, 0.007, -0.05);
  flap.rotation.x = -0.4;
  g.add(flap);
  return g;
}

export function eye(): Group {
  // Magnifying glass — reads as "inspect" better than a floating eyeball.
  const g = group("eye");
  const brass = M(0xc8a25a);
  const dark = M(0x1a1a1f);
  const RING_RADIUS = 0.18;
  const RING_TUBE = 0.025;
  const ring = torus(RING_RADIUS, RING_TUBE, 28, brass);
  g.add(ring);
  const lensMat = basicMaterial(0x9bd6ff);
  lensMat.alpha = 0.35;
  const lens = disc(RING_RADIUS - 0.01, 24, lensMat, true);
  g.add(lens);
  const handleLen = 0.34;
  const handle = bxCylinder(0.028, 0.028, handleLen, 12, dark);
  handle.position.y = -RING_RADIUS - handleLen / 2 + RING_TUBE;
  g.add(handle);
  const ferrule = bxCylinder(0.036, 0.036, 0.05, 12, brass);
  ferrule.position.y = -RING_RADIUS - 0.005;
  g.add(ferrule);
  return g;
}
