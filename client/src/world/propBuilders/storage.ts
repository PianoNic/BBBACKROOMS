/** Storage furniture: cupboards, closets, bins. */
import { box, cylinder, group } from "../../rendering/babylon";
import { materials } from "../../rendering/materials";
import { offsetFromWall, type Builder } from "./_common";

const buildCupboard: Builder = () => {
  const g = group("cupboard");
  const body = box(1.2, 1.8, 0.5, materials.cupboard);
  body.position.y = 0.9;
  g.add(body);
  const split = box(0.03, 1.6, 0.51, materials.deskLeg);
  split.position.y = 0.9;
  g.add(split);
  return g;
};

const buildCloset: Builder = () => {
  const g = group("closet");
  const body = box(0.8, 2.0, 0.45, materials.closet);
  body.position.y = 1.0;
  g.add(body);
  const handle = box(0.04, 0.1, 0.46, materials.deskLeg);
  handle.position.set(0.3, 1.0, 0);
  g.add(handle);
  return g;
};

const buildTrashCan: Builder = () => {
  const m = cylinder(0.18, 0.18, 0.45, 12, materials.trashCan);
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
