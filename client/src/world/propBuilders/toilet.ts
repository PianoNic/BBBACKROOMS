/** Toilet fixtures: stalls (with bowl inside), urinals, sinks (+ mirror). */
import * as THREE from "three";
import { materials } from "../../rendering/materials";
import type { Builder } from "./_common";

const STALL_BACK = new THREE.BoxGeometry(1.0, 2.0, 0.05);
const STALL_SIDE = new THREE.BoxGeometry(0.05, 2.0, 1.0);
const TANK = new THREE.BoxGeometry(0.42, 0.5, 0.18);
const BOWL = new THREE.BoxGeometry(0.4, 0.36, 0.42);
const SEAT = new THREE.BoxGeometry(0.42, 0.04, 0.44);
const LID = new THREE.BoxGeometry(0.42, 0.03, 0.42);

const URINAL_BOWL = new THREE.BoxGeometry(0.34, 0.5, 0.28);
const URINAL_LIP = new THREE.BoxGeometry(0.34, 0.06, 0.22);
const URINAL_PIPE = new THREE.BoxGeometry(0.05, 0.22, 0.05);

const SINK_BODY = new THREE.BoxGeometry(0.6, 0.3, 0.4);
const SINK_BASIN = new THREE.BoxGeometry(0.46, 0.08, 0.28);
const SINK_FAUCET = new THREE.BoxGeometry(0.04, 0.18, 0.04);
const SINK_SPOUT = new THREE.BoxGeometry(0.04, 0.04, 0.14);
const MIRROR = new THREE.BoxGeometry(0.55, 0.5, 0.03);

function buildStallShell(g: THREE.Group): void {
  const back = new THREE.Mesh(STALL_BACK, materials.stallPanel);
  back.position.set(0, 1.0, 0.475);
  g.add(back);
  const left = new THREE.Mesh(STALL_SIDE, materials.stallPanel);
  left.position.set(-0.475, 1.0, 0);
  g.add(left);
  const right = new THREE.Mesh(STALL_SIDE, materials.stallPanel);
  right.position.set(0.475, 1.0, 0);
  g.add(right);
}

function buildToiletFixture(g: THREE.Group): void {
  const tank = new THREE.Mesh(TANK, materials.toiletPorcelain);
  tank.position.set(0, 0.6, 0.36);
  g.add(tank);
  const bowl = new THREE.Mesh(BOWL, materials.toiletPorcelain);
  bowl.position.set(0, 0.2, 0.06);
  g.add(bowl);
  const seat = new THREE.Mesh(SEAT, materials.toiletSeat);
  seat.position.set(0, 0.4, 0.05);
  g.add(seat);
  const lid = new THREE.Mesh(LID, materials.toiletSeat);
  lid.position.set(0, 0.6, 0.22);
  lid.rotation.x = -Math.PI / 4;
  g.add(lid);
}

const buildToiletStall: Builder = () => {
  const g = new THREE.Group();
  buildStallShell(g);
  buildToiletFixture(g);
  return g;
};

const buildUrinal: Builder = () => {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(URINAL_BOWL, materials.toiletPorcelain);
  bowl.position.set(0, 0.85, -0.16);
  g.add(bowl);
  const lip = new THREE.Mesh(URINAL_LIP, materials.toiletPorcelain);
  lip.position.set(0, 1.13, -0.12);
  g.add(lip);
  const pipe = new THREE.Mesh(URINAL_PIPE, materials.faucet);
  pipe.position.set(0, 1.25, -0.02);
  g.add(pipe);
  return g;
};

const buildSink: Builder = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(SINK_BODY, materials.sink);
  body.position.set(0, 0.85, -0.2);
  g.add(body);
  const basin = new THREE.Mesh(SINK_BASIN, materials.sinkBasin);
  basin.position.set(0, 0.9601, -0.2);
  g.add(basin);
  const faucet = new THREE.Mesh(SINK_FAUCET, materials.faucet);
  faucet.position.set(0, 1.05, -0.04);
  g.add(faucet);
  const spout = new THREE.Mesh(SINK_SPOUT, materials.faucet);
  spout.position.set(0, 1.12, -0.1);
  g.add(spout);
  const mirror = new THREE.Mesh(MIRROR, materials.mirror);
  mirror.position.set(0, 1.7, -0.015);
  g.add(mirror);
  return g;
};

export const TOILET_BUILDERS: Record<string, Builder> = {
  toilet_stall: buildToiletStall,
  urinal: buildUrinal,
  sink: buildSink,
};
