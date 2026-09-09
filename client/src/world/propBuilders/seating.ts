/** Tables, desks, chairs, benches. Anything someone sits at. */
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { box, group } from "../../rendering/babylon";
import { materials } from "../../rendering/materials";
import { offsetFromWall, type Builder } from "./_common";

function addLegs(
  g: TransformNode,
  dims: [number, number, number],
  mat: StandardMaterial,
  y: number,
  corners: [number, number][],
) {
  for (const [dx, dz] of corners) {
    const leg = box(dims[0], dims[1], dims[2], mat);
    leg.position.set(dx, y, dz);
    g.add(leg);
  }
}

const buildDesk: Builder = () => {
  const g = group("desk");
  const top = box(2.0, 0.05, 0.6, materials.deskWood);
  top.position.y = 0.725;
  g.add(top);
  addLegs(g, [0.05, 0.7, 0.05], materials.deskLeg, 0.35,
    [[0.95, 0.25], [-0.95, 0.25], [0.95, -0.25], [-0.95, -0.25]]);
  return g;
};

// Standalone chair. Backrest on -Z. At yaw=0 the sitter faces +Z.
const buildChair: Builder = () => {
  const g = group("chair");
  const seat = box(0.5, 0.05, 0.5, materials.deskWood);
  seat.position.y = 0.4225;
  g.add(seat);
  const back = box(0.5, 0.4, 0.04, materials.deskWood);
  back.position.set(0, 0.65, -0.23);
  g.add(back);
  addLegs(g, [0.04, 0.4, 0.04], materials.deskLeg, 0.2,
    [[0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22]]);
  return g;
};

// Student desk + attached chair(s). Backrest on +Z. Sitter faces -Z
// (whiteboard). variant 0 = single seat, variant 1 = double-wide desk
// with two seats side by side.
function addStudentSeat(g: TransformNode, x: number): void {
  const seat = box(0.4, 0.04, 0.4, materials.studentDesk);
  seat.position.set(x, 0.42, 0.55);
  g.add(seat);
  const back = box(0.4, 0.35, 0.04, materials.studentDesk);
  back.position.set(x, 0.62, 0.73);
  g.add(back);
  addLegs(g, [0.04, 0.42, 0.04], materials.deskLeg, 0.21, [
    [x + 0.17, 0.55 - 0.17], [x - 0.17, 0.55 - 0.17],
    [x + 0.17, 0.55 + 0.17], [x - 0.17, 0.55 + 0.17],
  ]);
}

const buildStudentDesk: Builder = (prop) => {
  const g = group("studentDesk");
  const isDouble = (prop.variant ?? 0) === 1;
  if (isDouble) {
    const top = box(1.4, 0.04, 0.5, materials.studentDesk);
    top.position.y = 0.7;
    g.add(top);
    addLegs(g, [0.04, 0.68, 0.04], materials.deskLeg, 0.34,
      [[0.66, 0.21], [-0.66, 0.21], [0.66, -0.21], [-0.66, -0.21]]);
    addStudentSeat(g, -0.35);
    addStudentSeat(g, 0.35);
  } else {
    const top = box(0.7, 0.04, 0.5, materials.studentDesk);
    top.position.y = 0.7;
    g.add(top);
    addLegs(g, [0.04, 0.68, 0.04], materials.deskLeg, 0.34,
      [[0.31, 0.21], [-0.31, 0.21], [0.31, -0.21], [-0.31, -0.21]]);
    addStudentSeat(g, 0);
  }
  return g;
};

const buildBench: Builder = () => {
  const g = group("seatingBench");
  const seat = box(1.5, 0.06, 0.4, materials.deskWood);
  seat.position.y = 0.4;
  g.add(seat);
  addLegs(g, [0.05, 0.4, 0.05], materials.deskLeg, 0.2,
    [[0.7, 0.15], [-0.7, 0.15], [0.7, -0.15], [-0.7, -0.15]]);
  return g;
};

// bench is a wall prop (BENCH_SEAT 1.5 x 0.4) — half clips into the wall
// without offset. desk/chair/student_desk are floor/center placements.
export const SEATING_BUILDERS: Record<string, Builder> = {
  desk: buildDesk,
  chair: buildChair,
  student_desk: buildStudentDesk,
  bench: offsetFromWall(buildBench, 0.2),
};
