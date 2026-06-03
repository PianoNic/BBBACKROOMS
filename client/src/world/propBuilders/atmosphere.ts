/** Atmosphere: plants, backpacks, papers, fire extinguishers, floor lamps. */
import * as THREE from "three";
import { materials } from "../../rendering/materials";
import { buildItemModel } from "../../gameplay/itemModels";
import type { Builder } from "./_common";

const POT = new THREE.CylinderGeometry(0.18, 0.14, 0.3, 10);
const FOLIAGE = new THREE.IcosahedronGeometry(0.32, 0);

const BP_BODY = new THREE.BoxGeometry(0.32, 0.42, 0.2);
const BP_STRAP = new THREE.BoxGeometry(0.04, 0.3, 0.06);
const BP_POCKET = new THREE.BoxGeometry(0.22, 0.18, 0.04);

const FIRE_BODY = new THREE.CylinderGeometry(0.07, 0.07, 0.36, 10);
const FIRE_TOP = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 10);
const FIRE_HOSE = new THREE.BoxGeometry(0.04, 0.18, 0.04);

const LAMP_BASE = new THREE.CylinderGeometry(0.18, 0.22, 0.05, 12);
const LAMP_POLE = new THREE.CylinderGeometry(0.025, 0.025, 1.7, 8);
const LAMP_SHADE = new THREE.CylinderGeometry(0.18, 0.26, 0.32, 12);

const buildPlant: Builder = () => {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(POT, materials.pot);
  pot.position.y = 0.15;
  g.add(pot);
  const foliage = new THREE.Mesh(FOLIAGE, materials.foliage);
  foliage.position.y = 0.6;
  g.add(foliage);
  return g;
};

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

const buildPapers: Builder = () => {
  const g = buildItemModel("papers");
  g.position.y = 0.02;
  return g;
};

// Wall-mounted fire extinguisher on a side wall. Extends into the room.
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
