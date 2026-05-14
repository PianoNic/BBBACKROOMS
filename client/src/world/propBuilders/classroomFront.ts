/** Front-wall + teacher-desk decor: whiteboard, clock, swiss flag,
 *  projector, globe. Goes on the wall behind the teacher's desk. */
import * as THREE from "three";
import { materials } from "../../rendering/materials";
import type { Builder } from "./_common";
import { makeWhiteboardTexture } from "./whiteboardTexture";

const WB_FRAME = new THREE.BoxGeometry(2.6, 1.3, 0.04);
const WB_FACE = new THREE.BoxGeometry(2.5, 1.2, 0.05);

const CLOCK_RIM = new THREE.CylinderGeometry(0.22, 0.22, 0.04, 18);
const CLOCK_FACE = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 18);
const HOUR_HAND = new THREE.BoxGeometry(0.025, 0.12, 0.01);
const MIN_HAND = new THREE.BoxGeometry(0.02, 0.17, 0.01);

const FLAG_BG = new THREE.BoxGeometry(0.5, 0.5, 0.04);
const FLAG_BAR_V = new THREE.BoxGeometry(0.12, 0.32, 0.05);
const FLAG_BAR_H = new THREE.BoxGeometry(0.32, 0.12, 0.05);

const PROJ_BODY = new THREE.BoxGeometry(0.4, 0.18, 0.3);
const PROJ_LENS = new THREE.CylinderGeometry(0.06, 0.06, 0.06, 10);
const PROJ_MOUNT = new THREE.BoxGeometry(0.04, 0.4, 0.04);

const GLOBE_BALL = new THREE.SphereGeometry(0.16, 10, 8);
const GLOBE_STAND = new THREE.CylinderGeometry(0.08, 0.1, 0.06, 10);
const GLOBE_AXIS = new THREE.BoxGeometry(0.02, 0.4, 0.02);

const buildWhiteboard: Builder = (prop) => {
  const g = new THREE.Group();
  // Frame sits flush against the wall (+Z side of the group, away from
  // the room). Face sits in front of the frame on the room side (-Z).
  // No rotation/UV tricks: the two meshes don't overlap in z, so the
  // beige face is guaranteed to render in front from the room view.
  const frame = new THREE.Mesh(WB_FRAME, materials.whiteboardFrame);
  frame.position.set(0, 1.6, 0.02);
  g.add(frame);
  const dirty = (prop.variant ?? 0) > 0;
  const faceMat = dirty
    ? new THREE.MeshLambertMaterial({
        map: makeWhiteboardTexture(prop.x * 13.37 + prop.z * 7.7),
      })
    : materials.whiteboardSurface;
  const face = new THREE.Mesh(WB_FACE, faceMat);
  face.position.set(0, 1.6, -0.03);
  g.add(face);
  return g;
};

// Wall clock high on a wall. Visible side at LOCAL -Z (project-wide
// convention so wall_yaw points it into the room).
const buildClock: Builder = (prop) => {
  const g = new THREE.Group();
  const Y = 2.6;
  const rim = new THREE.Mesh(CLOCK_RIM, materials.clockRim);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, Y, -0.05);
  g.add(rim);
  const face = new THREE.Mesh(CLOCK_FACE, materials.clockFace);
  face.rotation.x = Math.PI / 2;
  face.position.set(0, Y, -0.07);
  g.add(face);
  const seed = (prop.x * 7.1 + prop.z * 11.3);
  const hourAngle = (seed % (Math.PI * 2));
  const minAngle = ((seed * 12) % (Math.PI * 2));
  const hh = new THREE.Mesh(HOUR_HAND, materials.clockHand);
  hh.position.set(Math.sin(hourAngle) * 0.05, Y + Math.cos(hourAngle) * 0.05, -0.1);
  hh.rotation.z = -hourAngle;
  g.add(hh);
  const mh = new THREE.Mesh(MIN_HAND, materials.clockHand);
  mh.position.set(Math.sin(minAngle) * 0.07, Y + Math.cos(minAngle) * 0.07, -0.1);
  mh.rotation.z = -minAngle;
  g.add(mh);
  return g;
};

const buildSwissFlag: Builder = () => {
  const g = new THREE.Group();
  const Y = 2.55;
  const bg = new THREE.Mesh(FLAG_BG, materials.flagRed);
  bg.position.set(0, Y, -0.04);
  g.add(bg);
  const v = new THREE.Mesh(FLAG_BAR_V, materials.flagCross);
  v.position.set(0, Y, -0.07);
  g.add(v);
  const h = new THREE.Mesh(FLAG_BAR_H, materials.flagCross);
  h.position.set(0, Y, -0.07);
  g.add(h);
  return g;
};

// Desk-top projector aimed at the whiteboard. It inherits the teacher
// desk's "back" wall yaw, which rotates local -Z into the room. We want
// the lens pointing the OPPOSITE way (toward the whiteboard / back wall),
// so the lens sits on local +Z.
const buildProjector: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(PROJ_BODY, materials.projector);
  body.position.y = 0.84;
  g.add(body);
  const lens = new THREE.Mesh(PROJ_LENS, materials.projectorLens);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.84, 0.18);
  g.add(lens);
  return g;
};

// Free-standing globe on a small base.
const buildGlobe: Builder = () => {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(GLOBE_STAND, materials.globeStand);
  stand.position.y = 0.03;
  g.add(stand);
  const axis = new THREE.Mesh(GLOBE_AXIS, materials.globeStand);
  axis.position.y = 0.22;
  axis.rotation.z = 0.4;
  g.add(axis);
  const ball = new THREE.Mesh(GLOBE_BALL, materials.globeBall);
  ball.position.y = 0.26;
  g.add(ball);
  return g;
};

export const CLASSROOM_FRONT_BUILDERS: Record<string, Builder> = {
  whiteboard: buildWhiteboard,
  clock: buildClock,
  swiss_flag: buildSwissFlag,
  projector: buildProjector,
  globe: buildGlobe,
};
