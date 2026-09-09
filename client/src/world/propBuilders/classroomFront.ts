/** Front-wall + teacher-desk decor: whiteboard, clock, swiss flag,
 *  projector, globe. Goes on the wall behind the teacher's desk. */
import type { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { box, cylinder, group, lambertMaterial, sphere } from "../../rendering/babylon";
import { materials } from "../../rendering/materials";
import type { Builder } from "./_common";
import { makeWhiteboardTexture } from "./whiteboardTexture";

const buildWhiteboard: Builder = (prop) => {
  const g = group();
  // Frame sits flush against the wall (+Z side of the group, away from
  // the room). Face sits in front of the frame on the room side (-Z).
  // No rotation/UV tricks: the two meshes don't overlap in z, so the
  // beige face is guaranteed to render in front from the room view.
  const frame = box(2.6, 1.3, 0.04, materials.whiteboardFrame);
  frame.position.set(0, 1.6, 0.02);
  g.add(frame);
  const dirty = (prop.variant ?? 0) > 0;
  const faceMat = dirty
    ? (() => {
        const mat = lambertMaterial(0xffffff);
        mat.diffuseTexture = makeWhiteboardTexture(
          prop.x * 13.37 + prop.z * 7.7,
        ) as unknown as Texture;
        return mat;
      })()
    : materials.whiteboardSurface;
  const face = box(2.5, 1.2, 0.05, faceMat);
  face.position.set(0, 1.6, -0.03);
  g.add(face);
  return g;
};

// Wall clock high on a wall. Visible side at LOCAL -Z (project-wide
// convention so wall_yaw points it into the room).
const buildClock: Builder = (prop) => {
  const g = group();
  const Y = 2.6;
  const rim = cylinder(0.22, 0.22, 0.04, 18, materials.clockRim);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, Y, -0.05);
  g.add(rim);
  const face = cylinder(0.2, 0.2, 0.05, 18, materials.clockFace);
  face.rotation.x = Math.PI / 2;
  face.position.set(0, Y, -0.07);
  g.add(face);
  const seed = (prop.x * 7.1 + prop.z * 11.3);
  const hourAngle = (seed % (Math.PI * 2));
  const minAngle = ((seed * 12) % (Math.PI * 2));
  const hh = box(0.025, 0.12, 0.01, materials.clockHand);
  hh.position.set(Math.sin(hourAngle) * 0.05, Y + Math.cos(hourAngle) * 0.05, -0.1);
  hh.rotation.z = -hourAngle;
  g.add(hh);
  const mh = box(0.02, 0.17, 0.01, materials.clockHand);
  mh.position.set(Math.sin(minAngle) * 0.07, Y + Math.cos(minAngle) * 0.07, -0.1);
  mh.rotation.z = -minAngle;
  g.add(mh);
  return g;
};

const buildSwissFlag: Builder = () => {
  const g = group();
  const Y = 2.55;
  const bg = box(0.5, 0.5, 0.04, materials.flagRed);
  bg.position.set(0, Y, -0.04);
  g.add(bg);
  const v = box(0.12, 0.32, 0.05, materials.flagCross);
  v.position.set(0, Y, -0.07);
  g.add(v);
  const h = box(0.32, 0.12, 0.05, materials.flagCross);
  h.position.set(0, Y, -0.07);
  g.add(h);
  return g;
};

// Ceiling-mounted projector aimed at the whiteboard. The prop is anchored
// at the teacher desk's xz (via place_on) but hangs from the ceiling on
// a short pole. It inherits the desk's "back" wall yaw, so local +Z
// points toward the whiteboard.
const buildProjector: Builder = () => {
  const g = group();
  const Y = 2.75;  // body height; ceiling is at 3.0
  const mount = box(0.04, 0.4, 0.04, materials.projector);
  mount.position.set(0, 2.85, 0);  // pole from ceiling to body top
  g.add(mount);
  const body = box(0.4, 0.18, 0.3, materials.projector);
  body.position.y = Y;
  body.rotation.x = 0.25;  // tilt nose (+Z side) down toward whiteboard
  g.add(body);
  const lens = cylinder(0.06, 0.06, 0.06, 10, materials.projectorLens);
  lens.rotation.x = Math.PI / 2 + 0.25;
  // Lens sits at the front of the (tilted) body, pointing down + back.
  lens.position.set(0, Y - 0.05, 0.17);
  g.add(lens);
  return g;
};

// Free-standing globe on a small base.
const buildGlobe: Builder = () => {
  const g = group();
  const stand = cylinder(0.08, 0.1, 0.06, 10, materials.globeStand);
  stand.position.y = 0.03;
  g.add(stand);
  const axis = box(0.02, 0.4, 0.02, materials.globeStand);
  axis.position.y = 0.22;
  axis.rotation.z = 0.4;
  g.add(axis);
  const ball = sphere(0.16, 10, materials.globeBall);
  ball.position.y = 0.26;
  g.add(ball);
  return g;
};

// Small lab microscope that sits ON a desk's desk_top layer. Black base,
// arched arm, eyepiece tube angled forward, stage with sample slide.
const buildMicroscope: Builder = () => {
  const g = group();
  const T = 0.75;  // desk_top height
  const baseMat = materials.projector;
  const trimMat = materials.projectorLens;
  const base = box(0.16, 0.04, 0.16, baseMat);
  base.position.y = T + 0.02;
  g.add(base);
  const arm = box(0.04, 0.22, 0.05, baseMat);
  arm.position.set(-0.04, T + 0.15, 0.02);
  arm.rotation.x = -0.15;
  g.add(arm);
  const tube = cylinder(0.022, 0.022, 0.14, 10, baseMat);
  tube.position.set(0.0, T + 0.24, -0.01);
  tube.rotation.x = 0.15;
  g.add(tube);
  const eye = cylinder(0.018, 0.025, 0.04, 10, trimMat);
  eye.position.set(0.0, T + 0.31, -0.02);
  eye.rotation.x = 0.15;
  g.add(eye);
  const stage = box(0.10, 0.02, 0.08, baseMat);
  stage.position.y = T + 0.10;
  g.add(stage);
  const slide = box(0.06, 0.005, 0.025, trimMat);
  slide.position.y = T + 0.112;
  g.add(slide);
  const obj = cylinder(0.018, 0.012, 0.05, 8, baseMat);
  obj.position.set(0, T + 0.155, 0);
  g.add(obj);
  const knob = cylinder(0.022, 0.022, 0.018, 8, baseMat);
  knob.rotation.z = Math.PI / 2;
  knob.position.set(-0.07, T + 0.12, 0);
  g.add(knob);
  return g;
};

export const CLASSROOM_FRONT_BUILDERS: Record<string, Builder> = {
  whiteboard: buildWhiteboard,
  clock: buildClock,
  swiss_flag: buildSwissFlag,
  projector: buildProjector,
  globe: buildGlobe,
  microscope: buildMicroscope,
};
