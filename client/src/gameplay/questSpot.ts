/** Per-spot marker construction for the in-world quest hints (floating
 *  items, doodles, "look down here" arrows). Kept separate from
 *  `quests.ts` so the main class stays focused on lifecycle + dispatch. */
import * as THREE from "three";
import type { Objective, Spot } from "../net/protocol";
import { buildItemModel } from "./itemModels";
import { buildWhiteboardDoodle } from "./whiteboardDoodle";
import { wallForward } from "../world/propBuilders/_common";

const Y = 1.1;
const CASINO_Y = 2.05; // arrow floats higher above the laptop

export type SpotVisuals = {
  marker: THREE.Object3D;
  bobSeed: number;
  extra?: THREE.Object3D;
};

const SCALE_BY_ITEM: Record<string, number> = {
  eye: 0.75, sponge: 0.9, papers: 0.75, watering_can: 1.3,
};

function downArrow(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe66b });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), mat);
  shaft.position.y = 0.18;
  g.add(shaft);
  // Cone tip is at +Y by default → rotate π so it points down.
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.36, 4), mat);
  head.rotation.x = Math.PI;
  head.position.y = -0.18;
  g.add(head);
  return g;
}

/** Build the floating marker + optional doodle for one quest spot.
 *  Adds them to `group` and returns handles for later updates. */
export function buildSpot(o: Objective, s: Spot, group: THREE.Group): SpotVisuals {
  const isArrow = !o.item; // casino spots: no item → "look here" arrow
  const inner = o.item ? buildItemModel(o.item) : downArrow();
  // Items that stay upright vs. lying flat for top-down read.
  // "papers" needs the default rotation.x=π/2 — its geometry is built as
  // flat sheets in the XZ plane, so the rotation stands them up.
  const upright =
    o.item === "eye" || o.item === "watering_can" || o.item === "sponge";
  if (!isArrow) {
    if (!upright) inner.rotation.x = Math.PI / 2;
    inner.scale.setScalar(SCALE_BY_ITEM[o.item as string] ?? 1.7);
    if (o.item === "eye") inner.rotation.x = (20 * Math.PI) / 180;
  }
  const marker = new THREE.Group();
  marker.add(inner);
  let baseY = isArrow ? CASINO_Y : Y;
  let mx = s.x;
  let mz = s.z;
  if (o.item === "eye" && s.anchor_x != null && s.anchor_z != null) {
    const off = wallForward(s.yaw, 0.25);
    mx = s.anchor_x + off.dx; mz = s.anchor_z + off.dz;
    baseY = (s.anchor_y ?? 1.7) + 0.25;
    marker.rotation.y = s.yaw + Math.PI;
  }
  if (o.item === "watering_can" && s.anchor_x != null && s.anchor_z != null) {
    mx = s.anchor_x; mz = s.anchor_z;
    baseY = s.anchor_y ?? 1.1;
  }
  if (o.item === "sponge" && s.anchor_x != null && s.anchor_z != null) {
    const off = wallForward(s.yaw, 0.30);
    mx = s.anchor_x + off.dx; mz = s.anchor_z + off.dz;
    baseY = 1.55;
  }
  if (o.item === "papers" && s.anchor_x != null && s.anchor_z != null) {
    const off = wallForward(s.yaw, 0.2);
    mx = s.anchor_x + off.dx; mz = s.anchor_z + off.dz;
    baseY = (s.anchor_y ?? 1.95);
    marker.rotation.y = s.yaw + Math.PI;
  }
  marker.position.set(mx, baseY, mz);
  marker.userData.baseY = baseY;
  marker.userData.spinning = true;
  marker.visible = !s.done;
  group.add(marker);

  let extra: THREE.Object3D | undefined;
  if (o.item === "sponge" && s.anchor_x != null && s.anchor_z != null) {
    const doodle = buildWhiteboardDoodle();
    const off = wallForward(s.yaw, 0.08);
    doodle.position.set(s.anchor_x + off.dx, 1.6, s.anchor_z + off.dz);
    doodle.rotation.y = s.yaw + Math.PI; // face the player (away from wall)
    doodle.visible = !s.done;
    group.add(doodle);
    extra = doodle;
  }

  return { marker, bobSeed: Math.random() * 10, extra };
}

export const SPOT_BASE_Y = Y;
