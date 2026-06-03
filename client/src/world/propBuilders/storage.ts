/** Storage furniture: cupboards, closets, bins. */
import * as THREE from "three";
import { materials } from "../../rendering/materials";
import { offsetFromWall, type Builder } from "./_common";

const CUPBOARD_BODY = new THREE.BoxGeometry(1.2, 1.8, 0.5);
const CUPBOARD_SPLIT = new THREE.BoxGeometry(0.03, 1.6, 0.51);
const CLOSET_BODY = new THREE.BoxGeometry(0.8, 2.0, 0.45);
const CLOSET_HANDLE = new THREE.BoxGeometry(0.04, 0.1, 0.46);
const TRASH_CAN = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 12);

const buildCupboard: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(CUPBOARD_BODY, materials.cupboard);
  body.position.y = 0.9;
  g.add(body);
  const split = new THREE.Mesh(CUPBOARD_SPLIT, materials.deskLeg);
  split.position.y = 0.9;
  g.add(split);
  return g;
};

const buildCloset: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(CLOSET_BODY, materials.closet);
  body.position.y = 1.0;
  g.add(body);
  const handle = new THREE.Mesh(CLOSET_HANDLE, materials.deskLeg);
  handle.position.set(0.3, 1.0, 0);
  g.add(handle);
  return g;
};

const buildTrashCan: Builder = () => {
  const m = new THREE.Mesh(TRASH_CAN, materials.trashCan);
  m.position.y = 0.225;
  return m;
};

// Wall-prop wrappers: cupboard is 0.5m deep → shift back to wall by 0.23m.
// Closet 0.45m deep → 0.205m. trash_can is floor placement, no offset.
export const STORAGE_BUILDERS: Record<string, Builder> = {
  cupboard: offsetFromWall(buildCupboard, 0.23),
  closet: offsetFromWall(buildCloset, 0.205),
  trash_can: buildTrashCan,
};
