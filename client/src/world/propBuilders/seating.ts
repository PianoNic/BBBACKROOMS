/** Tables, desks, chairs, benches. Anything someone sits at. */
import * as THREE from "three";
import { materials } from "../../rendering/materials";
import { offsetFromWall, type Builder } from "./_common";

const DESK_TOP = new THREE.BoxGeometry(2.0, 0.05, 0.6);
const DESK_LEG = new THREE.BoxGeometry(0.05, 0.7, 0.05);
const CHAIR_SEAT = new THREE.BoxGeometry(0.5, 0.05, 0.5);
const CHAIR_BACK = new THREE.BoxGeometry(0.5, 0.4, 0.04);
const CHAIR_LEG = new THREE.BoxGeometry(0.04, 0.4, 0.04);
const SD_TOP = new THREE.BoxGeometry(0.7, 0.04, 0.5);
const SD_TOP_WIDE = new THREE.BoxGeometry(1.4, 0.04, 0.5);
const SD_LEG = new THREE.BoxGeometry(0.04, 0.68, 0.04);
const SD_SEAT = new THREE.BoxGeometry(0.4, 0.04, 0.4);
const SD_BACK = new THREE.BoxGeometry(0.4, 0.35, 0.04);
const SD_SMALL_LEG = new THREE.BoxGeometry(0.04, 0.42, 0.04);
const BENCH_SEAT = new THREE.BoxGeometry(1.5, 0.06, 0.4);
const BENCH_LEG = new THREE.BoxGeometry(0.05, 0.4, 0.05);

function addLegs(
  group: THREE.Group,
  geom: THREE.BoxGeometry,
  y: number,
  corners: [number, number][],
) {
  for (const [dx, dz] of corners) {
    const leg = new THREE.Mesh(geom, materials.deskLeg);
    leg.position.set(dx, y, dz);
    group.add(leg);
  }
}

const buildDesk: Builder = () => {
  const g = new THREE.Group();
  const top = new THREE.Mesh(DESK_TOP, materials.deskWood);
  top.position.y = 0.725;
  g.add(top);
  addLegs(g, DESK_LEG, 0.35,
    [[0.95, 0.25], [-0.95, 0.25], [0.95, -0.25], [-0.95, -0.25]]);
  return g;
};

// Standalone chair. Backrest on -Z. At yaw=0 the sitter faces +Z.
const buildChair: Builder = () => {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(CHAIR_SEAT, materials.deskWood);
  seat.position.y = 0.4225;
  g.add(seat);
  const back = new THREE.Mesh(CHAIR_BACK, materials.deskWood);
  back.position.set(0, 0.65, -0.23);
  g.add(back);
  addLegs(g, CHAIR_LEG, 0.2,
    [[0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22]]);
  return g;
};

// Student desk + attached chair(s). Backrest on +Z. Sitter faces -Z
// (whiteboard). variant 0 = single seat, variant 1 = double-wide desk
// with two seats side by side.
function addStudentSeat(g: THREE.Group, x: number): void {
  const seat = new THREE.Mesh(SD_SEAT, materials.studentDesk);
  seat.position.set(x, 0.42, 0.55);
  g.add(seat);
  const back = new THREE.Mesh(SD_BACK, materials.studentDesk);
  back.position.set(x, 0.62, 0.73);
  g.add(back);
  addLegs(g, SD_SMALL_LEG, 0.21, [
    [x + 0.17, 0.55 - 0.17], [x - 0.17, 0.55 - 0.17],
    [x + 0.17, 0.55 + 0.17], [x - 0.17, 0.55 + 0.17],
  ]);
}

const buildStudentDesk: Builder = (prop) => {
  const g = new THREE.Group();
  const isDouble = (prop.variant ?? 0) === 1;
  if (isDouble) {
    const top = new THREE.Mesh(SD_TOP_WIDE, materials.studentDesk);
    top.position.y = 0.7;
    g.add(top);
    addLegs(g, SD_LEG, 0.34,
      [[0.66, 0.21], [-0.66, 0.21], [0.66, -0.21], [-0.66, -0.21]]);
    addStudentSeat(g, -0.35);
    addStudentSeat(g, 0.35);
  } else {
    const top = new THREE.Mesh(SD_TOP, materials.studentDesk);
    top.position.y = 0.7;
    g.add(top);
    addLegs(g, SD_LEG, 0.34,
      [[0.31, 0.21], [-0.31, 0.21], [0.31, -0.21], [-0.31, -0.21]]);
    addStudentSeat(g, 0);
  }
  return g;
};

const buildBench: Builder = () => {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(BENCH_SEAT, materials.deskWood);
  seat.position.y = 0.4;
  g.add(seat);
  addLegs(g, BENCH_LEG, 0.2,
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
