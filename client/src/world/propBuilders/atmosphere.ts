/** Atmosphere: plants, backpacks, papers, fire extinguishers, floor lamps. */
import { box, cylinder, group, icosahedron } from "../../rendering/babylon";
import { materials } from "../../rendering/materials";
import { buildItemModel } from "../../gameplay/itemModels";
import type { Builder } from "./_common";

const buildPlant: Builder = () => {
  const g = group();
  const pot = cylinder(0.18, 0.14, 0.3, 10, materials.pot);
  pot.position.y = 0.15;
  g.add(pot);
  const foliage = icosahedron(0.32, materials.foliage);
  foliage.position.y = 0.6;
  g.add(foliage);
  return g;
};

const buildBackpack: Builder = () => {
  const g = group();
  const body = box(0.32, 0.42, 0.2, materials.backpack);
  body.position.y = 0.21;
  g.add(body);
  const pocket = box(0.22, 0.18, 0.04, materials.backpack);
  pocket.position.set(0, 0.16, 0.11);
  g.add(pocket);
  const sl = box(0.04, 0.3, 0.06, materials.backpack);
  sl.position.set(-0.1, 0.32, -0.1);
  g.add(sl);
  const sr = box(0.04, 0.3, 0.06, materials.backpack);
  sr.position.set(0.1, 0.32, -0.1);
  g.add(sr);
  g.rotation.z = -0.15;
  return g;
};

const buildPapers: Builder = () => {
  const g = buildItemModel("papers");
  g.position.y = 0.02;
  return g;
};

// Wall-mounted fire extinguisher on a side wall. Extends into the room.
const buildFireExtinguisher: Builder = () => {
  const g = group();
  const body = cylinder(0.07, 0.07, 0.36, 10, materials.fireRed);
  body.position.set(0, 0.75, -0.1);
  g.add(body);
  const top = cylinder(0.04, 0.04, 0.08, 10, materials.lampPole);
  top.position.set(0, 0.97, -0.1);
  g.add(top);
  const hose = box(0.04, 0.18, 0.04, materials.lampPole);
  hose.position.set(0.06, 0.85, -0.13);
  hose.rotation.z = 0.5;
  g.add(hose);
  return g;
};

// Standing floor lamp with a warm glowing shade.
const buildFloorLamp: Builder = () => {
  const g = group();
  const base = cylinder(0.18, 0.22, 0.05, 12, materials.lampPole);
  base.position.y = 0.025;
  g.add(base);
  const pole = cylinder(0.025, 0.025, 1.7, 8, materials.lampPole);
  pole.position.y = 0.9;
  g.add(pole);
  const shade = cylinder(0.18, 0.26, 0.32, 12, materials.lampShade);
  shade.position.y = 1.85;
  g.add(shade);
  // No real PointLight — at 1000+ props that would blow the WebGL
  // uniform budget. The shade material already glows visually.
  return g;
};

export const ATMOSPHERE_BUILDERS: Record<string, Builder> = {
  plant: buildPlant,
  backpack: buildBackpack,
  papers: buildPapers,
  fire_extinguisher: buildFireExtinguisher,
  floor_lamp: buildFloorLamp,
};
