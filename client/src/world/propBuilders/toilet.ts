/** Toilet fixtures: stall shells + fixtures (interactive cabin doors
 *  are handled separately by ToiletStallDoors), urinals, sinks. */
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { box, cylinder, group } from "../../rendering/babylon";
import { materials } from "../../rendering/materials";
import { M, offsetFromWall, type Builder } from "./_common";

function buildStallShell(g: TransformNode): void {
  const back = box(1.0, 2.0, 0.05, materials.stallPanel);
  back.position.set(0, 1.0, 0.475);
  g.add(back);
  const left = box(0.05, 2.0, 1.0, materials.stallPanel);
  left.position.set(-0.475, 1.0, 0);
  g.add(left);
  const right = box(0.05, 2.0, 1.0, materials.stallPanel);
  right.position.set(0.475, 1.0, 0);
  g.add(right);
}

function buildToiletFixture(g: TransformNode): void {
  const tank = box(0.42, 0.5, 0.18, materials.toiletPorcelain);
  tank.position.set(0, 0.6, 0.36);
  g.add(tank);
  const bowl = box(0.4, 0.36, 0.42, materials.toiletPorcelain);
  bowl.position.set(0, 0.2, 0.06);
  g.add(bowl);
  const seat = box(0.42, 0.04, 0.44, materials.toiletSeat);
  seat.position.set(0, 0.4, 0.05);
  g.add(seat);
  // Hole through the seat — a dark cavity inset just below the seat
  // surface so the toilet actually looks usable.
  const hole = cylinder(0.13, 0.13, 0.18, 14, M(0x080a0c));
  hole.position.set(0, 0.32, 0.05);
  g.add(hole);
  const lid = box(0.42, 0.03, 0.42, materials.toiletSeat);
  lid.position.set(0, 0.6, 0.22);
  lid.rotation.x = -Math.PI / 4;
  g.add(lid);
}

const buildToiletStall: Builder = () => {
  const g = group();
  buildStallShell(g);
  buildToiletFixture(g);
  return g;
};

const buildUrinal: Builder = () => {
  const g = group();
  const bowl = box(0.34, 0.5, 0.28, materials.toiletPorcelain);
  bowl.position.set(0, 0.85, -0.16);
  g.add(bowl);
  const lip = box(0.34, 0.06, 0.22, materials.toiletPorcelain);
  lip.position.set(0, 1.13, -0.12);
  g.add(lip);
  const pipe = box(0.05, 0.22, 0.05, materials.faucet);
  pipe.position.set(0, 1.25, -0.02);
  g.add(pipe);
  // Inner cavity — a dark inset that reads as the bowl opening / drain.
  const cavity = box(0.26, 0.4, 0.04, M(0x141416));
  cavity.position.set(0, 0.93, -0.28);
  g.add(cavity);
  const drain = cylinder(0.05, 0.05, 0.02, 12, M(0x080a0c));
  drain.position.set(0, 0.62, -0.20);
  g.add(drain);
  return g;
};

const buildSink: Builder = () => {
  const g = group();
  const body = box(0.6, 0.3, 0.4, materials.sink);
  body.position.set(0, 0.85, -0.2);
  g.add(body);
  const basin = box(0.46, 0.08, 0.28, materials.sinkBasin);
  basin.position.set(0, 0.9601, -0.2);
  g.add(basin);
  const faucet = box(0.04, 0.18, 0.04, materials.faucet);
  faucet.position.set(0, 1.05, -0.04);
  g.add(faucet);
  const spout = box(0.04, 0.04, 0.14, materials.faucet);
  spout.position.set(0, 1.12, -0.1);
  g.add(spout);
  const mirror = box(0.55, 0.5, 0.03, materials.mirror);
  mirror.position.set(0, 1.7, -0.015);
  g.add(mirror);
  return g;
};

// Stall back panel is at z=+0.475 in local coords; sides extend the stall
// 1m forward. Shift the whole stall ~0.5m so the back is at the wall.
// Urinal and sink already place their meshes on the room side (-Z),
// so they don't need wrapping.
export const TOILET_BUILDERS: Record<string, Builder> = {
  toilet_stall: offsetFromWall(buildToiletStall, 0.5),
  urinal: buildUrinal,
  sink: buildSink,
};
