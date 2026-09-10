/** Group builders for every world pickup. Kept apart from the
 *  `Pickups` runtime so adding a new pickup kind only touches this file
 *  (plus the dispatch at the bottom). */
import type { Material } from "@babylonjs/core/Materials/material";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { PickupKind } from "../net/protocol";
import {
  Color3, Group, Mesh, StandardMaterial,
  activeScene, basicMaterial, box, cone, cylinder, disc, group, lambertMaterial, plane, sphere,
} from "../rendering/babylon";
import { activeModelLibrary } from "../rendering/modelLoader";
import { normalizeModelTemplate } from "../world/modelPropStage";
import { PICKUP_MODELS } from "../world/modelProps";

function buildMedkit(): Group {
  const g = group("medkit");
  const body = box(0.42, 0.28, 0.32, lambertMaterial(0xe8e8e2));
  g.add(body);
  const cross = basicMaterial(0xd03030);
  g.add(box(0.08, 0.20, 0.34, cross));
  g.add(box(0.22, 0.08, 0.34, cross));
  return g;
}

// Lazily loaded once + shared. Reuses the same Texture across all potion
// pickups so we're not re-decoding the JPG for every can in the level.
let _labelTex: Texture | null = null;
function labelTexture(): Texture {
  if (!_labelTex) {
    _labelTex = new Texture("/potion-label.jpg", activeScene());
    _labelTex.anisotropicFilteringLevel = 4;
  }
  return _labelTex;
}

function unlitTexturedMaterial(tex: Texture, name = "unlitTex"): StandardMaterial {
  const mat = new StandardMaterial(name, activeScene());
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.emissiveColor = Color3.White();
  mat.emissiveTexture = tex;
  mat.disableLighting = true;
  return mat;
}

function openCylinder(
  radiusTop: number, radiusBottom: number, height: number, segments: number,
  mat: Material,
  opts: { arc?: number; doubleSided?: boolean } = {},
  name = "cyl",
): Mesh {
  const mesh = CreateCylinder(name, {
    diameterTop: radiusTop * 2, diameterBottom: radiusBottom * 2,
    height, tessellation: segments, cap: Mesh.NO_CAP,
    arc: opts.arc, sideOrientation: opts.doubleSided ? Mesh.DOUBLESIDE : undefined,
  }, activeScene());
  mesh.material = mat;
  mesh.isPickable = false;
  return mesh;
}

function buildPotion(): Group {
  const g = group("potion");
  // Mate energy can. Stubby / wide proportions (fat short can, not a slim
  // energy drink). Navy body, gold bands at top + bottom, generic label
  // wrapped around the front, exposed aluminium lid + base.
  const navyMat = lambertMaterial(0x506c95);
  const silverMat = lambertMaterial(0xc8ccd2);
  const goldMat = lambertMaterial(0xf2c130);
  const logoMat = unlitTexturedMaterial(labelTexture(), "potionLabel");

  const RADIUS = 0.13;
  const HEIGHT = 0.30;

  // Navy main body.
  const body = cylinder(RADIUS, RADIUS, HEIGHT, 24, navyMat);
  g.add(body);

  // Gold ribbon bands wrapping the full circumference, one near the top
  // edge and one near the bottom edge of the label.
  const BAND_H = 0.018;
  const bandR = RADIUS + 0.0008;
  const topBand = openCylinder(bandR, bandR, BAND_H, 24, goldMat, {}, "goldBand");
  topBand.position.y = HEIGHT / 2 - BAND_H / 2 - 0.008;
  g.add(topBand);
  const bottomBand = topBand.clone("goldBandBottom");
  bottomBand.position.y = -HEIGHT / 2 + BAND_H / 2 + 0.008;
  g.add(bottomBand);

  // Logo wrapped around the front: arc-of-cylinder hugging the body so
  // the picture follows the curve instead of clipping flat through it.
  const LABEL_ARC = Math.PI * 0.4;
  const LABEL_H = RADIUS * 1.4;
  const label = openCylinder(
    RADIUS + 0.002, RADIUS + 0.002, LABEL_H, 24, logoMat,
    { arc: LABEL_ARC / (Math.PI * 2) }, "potionLabel",
  );
  label.rotation.y = Math.PI / 2 - LABEL_ARC / 2;
  g.add(label);

  // Aluminium top: slight inward shoulder, then the recessed lid disc,
  // then a small pull tab.
  const topShoulder = cylinder(RADIUS * 0.9, RADIUS, 0.018, 24, silverMat);
  topShoulder.position.y = HEIGHT / 2 + 0.009;
  g.add(topShoulder);
  const lid = cylinder(RADIUS * 0.9, RADIUS * 0.9, 0.012, 24, silverMat);
  lid.position.y = HEIGHT / 2 + 0.024;
  g.add(lid);
  const tab = box(0.07, 0.005, 0.022, silverMat);
  tab.position.set(0, HEIGHT / 2 + 0.034, 0);
  g.add(tab);

  // Aluminium base: inset disc at the bottom so the can stands on its
  // rim, like real aluminium cans.
  const bottomShoulder = cylinder(RADIUS, RADIUS * 0.9, 0.018, 24, silverMat);
  bottomShoulder.position.y = -HEIGHT / 2 - 0.009;
  g.add(bottomShoulder);
  const base = cylinder(RADIUS * 0.9, RADIUS * 0.9, 0.012, 24, silverMat);
  base.position.y = -HEIGHT / 2 - 0.024;
  g.add(base);

  return g;
}

function buildCompass(): Group {
  const g = group("compass");
  const body = cylinder(0.18, 0.18, 0.06, 16, lambertMaterial(0xc8a25a));
  body.rotation.x = Math.PI / 2;
  g.add(body);
  // Dial face inset on the FRONT only — it used to be a deep cylinder
  // that poked through both sides, leaving the back looking black.
  // Shrink to a thin disc and pull it forward so the back of the compass
  // shows the brass case instead.
  const face = cylinder(0.14, 0.14, 0.02, 16, lambertMaterial(0x1a1a1a));
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
  const north = cone(NEEDLE_W, NEEDLE_LEN, 4, basicMaterial(0xd03030));
  north.position.set(0, NEEDLE_LEN / 2, Z_OFFSET);
  g.add(north);
  const south = cone(NEEDLE_W, NEEDLE_LEN, 4, basicMaterial(0xe8e6dc));
  south.rotation.z = Math.PI;
  south.position.set(0, -NEEDLE_LEN / 2, Z_OFFSET);
  g.add(south);
  const pivot = cylinder(0.015, 0.015, 0.012, 12, lambertMaterial(0xc8a25a));
  pivot.rotation.x = Math.PI / 2;
  pivot.position.z = Z_OFFSET + 0.006;
  g.add(pivot);
  return g;
}

function buildTracker(): Group {
  const g = group("tracker");
  // Boxy handheld scanner: dark body + cyan radar screen + red-tipped antenna.
  g.add(box(0.22, 0.30, 0.10, lambertMaterial(0x1a2a36)));
  const screen = plane(0.16, 0.16, basicMaterial(0x4adef0));
  screen.position.set(0, 0.04, 0.051);
  g.add(screen);
  const antenna = cylinder(0.012, 0.012, 0.18, 8, lambertMaterial(0x282828));
  antenna.position.set(-0.07, 0.24, 0);
  g.add(antenna);
  const tip = sphere(0.025, 8, basicMaterial(0xff5a5a));
  tip.position.set(-0.07, 0.34, 0);
  g.add(tip);
  return g;
}

function buildGoggles(): Group {
  const g = group("goggles");
  // Two red lens cups + connecting bridge + a temple arm on each side
  // (the sticks that hook over the ears, like real glasses).
  const frameMat = lambertMaterial(0x252a30);
  const lensMat = basicMaterial(0xff5a3a);
  const mkLens = (x: number): void => {
    const cup = cylinder(0.10, 0.10, 0.08, 16, frameMat);
    cup.rotation.x = Math.PI / 2;
    cup.position.set(x, 0, 0);
    g.add(cup);
    const glass = disc(0.075, 16, lensMat);
    glass.position.set(x, 0, 0.041);
    g.add(glass);
  };
  mkLens(-0.10);
  mkLens(0.10);
  g.add(box(0.10, 0.04, 0.04, frameMat));
  // Temple arms: a thin stick on each side extending back toward the ear.
  // Anchored at the outer edge of each lens cup, length ~0.18 (≈14cm scaled).
  const templeLen = 0.18;
  const mkTemple = (x: number): void => {
    const arm = box(0.018, 0.018, templeLen, frameMat);
    arm.position.set(x, 0, -templeLen / 2);
    g.add(arm);
  };
  mkTemple(-0.19);
  mkTemple(0.19);
  return g;
}

function buildGps(): Group {
  const g = group("gps");
  // Squat satellite-dish on a puck — distinct from the boxy tracker.
  g.add(cylinder(0.16, 0.16, 0.08, 16, lambertMaterial(0x2a2a30)));
  const dish = openCylinder(
    0.12, 0.04, 0.04, 16, lambertMaterial(0xe8e8ec), { doubleSided: true }, "dish",
  );
  dish.position.y = 0.10;
  g.add(dish);
  const emitter = sphere(0.022, 8, basicMaterial(0xff3a3a));
  emitter.position.y = 0.16;
  g.add(emitter);
  return g;
}

const BUILDERS: Record<PickupKind, () => Group> = {
  medkit: buildMedkit,
  potion: buildPotion,
  compass: buildCompass,
  tracker: buildTracker,
  goggles: buildGoggles,
  gps: buildGps,
};

const pickupTemplates = new Map<PickupKind, Mesh[]>();

function getPickupTemplate(kind: PickupKind): Mesh[] | null {
  const cached = pickupTemplates.get(kind);
  if (cached) return cached;
  const container = activeModelLibrary()?.getPickup(kind);
  const spec = PICKUP_MODELS[kind];
  if (!container || !spec) return null;
  const template = normalizeModelTemplate(container, spec);
  for (const mesh of template) mesh.setEnabled(false);
  pickupTemplates.set(kind, template);
  return template;
}

function buildModelPickup(kind: PickupKind): Group | null {
  const template = getPickupTemplate(kind);
  if (!template || template.length === 0) return null;
  const g = group(`pickup_${kind}`);
  for (const mesh of template) {
    const clone = mesh.clone(mesh.name, null);
    clone.setEnabled(true);
    clone.isPickable = false;
    g.add(clone);
  }
  return g;
}

export function buildPickupModel(kind: PickupKind): Group {
  return buildModelPickup(kind) ?? (BUILDERS[kind] ?? buildCompass)();
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
