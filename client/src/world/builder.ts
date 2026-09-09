import "@babylonjs/core/Meshes/thinInstanceMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Matrix } from "@babylonjs/core/Maths/math.vector";
import type { Grid } from "../net/protocol";
import { materials } from "../rendering/materials";
import { box, group, plane, type Group } from "../rendering/babylon";

export const WALL_HEIGHT = 3;

export type World = {
  group: Group;
  grid: Grid;
  isWall: (cellX: number, cellY: number) => boolean;
};

const FLOOR = 1;

function bake(mesh: Mesh, matrices: Float32Array): void {
  mesh.thinInstanceSetBuffer("matrix", matrices, 16, true);
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.doNotSyncBoundingInfo = true;
  mesh.freezeWorldMatrix();
}

export function buildWorld(grid: Grid): World {
  const { width, height, cellSize, cells } = grid;
  const stage = group("world");

  const floorCount = cells.filter((c) => c === FLOOR).length;
  const floors = plane(cellSize, cellSize, materials.floor, false, "floors");
  floors.rotation.x = -Math.PI / 2;
  floors.bakeCurrentTransformIntoVertices();
  const ceils = plane(cellSize, cellSize, materials.ceiling, false, "ceils");
  ceils.rotation.x = Math.PI / 2;
  ceils.bakeCurrentTransformIntoVertices();

  // Count walls: any non-floor cell adjacent (4-neighbours) to a floor cell.
  const isFloor = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && cells[y * width + x] === FLOOR;
  const wallSet = new Set<number>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isFloor(x, y)) continue;
      if (isFloor(x - 1, y) || isFloor(x + 1, y) || isFloor(x, y - 1) || isFloor(x, y + 1)) {
        wallSet.add(y * width + x);
      }
    }
  }
  // Map-edge virtual walls: for every FLOOR cell sitting on the grid
  // boundary, place an extra wall cube just outside the grid so rooms
  // flush against the edge don't show void on that side.
  const boundary: [number, number][] = [];
  for (let y = 0; y < height; y++) {
    if (isFloor(0, y)) boundary.push([-1, y]);
    if (isFloor(width - 1, y)) boundary.push([width, y]);
  }
  for (let x = 0; x < width; x++) {
    if (isFloor(x, 0)) boundary.push([x, -1]);
    if (isFloor(x, height - 1)) boundary.push([x, height]);
  }
  // A floor cell in a grid corner gets two boundary cubes that meet only at
  // a point, leaving a hairline diagonal gap to look through. Plug the
  // diagonal too. Rare — 17 corners across 100 generated maps — but free.
  for (const [cxi, cyi, ox, oy] of [
    [0, 0, -1, -1],
    [0, height - 1, -1, height],
    [width - 1, 0, width, -1],
    [width - 1, height - 1, width, height],
  ] as const) {
    if (isFloor(cxi, cyi)) boundary.push([ox, oy]);
  }
  const walls = box(cellSize, WALL_HEIGHT, cellSize, materials.wall, "walls");

  const floorMatrices = new Float32Array(floorCount * 16);
  const ceilMatrices = new Float32Array(floorCount * 16);
  const wallMatrices = new Float32Array((wallSet.size + boundary.length) * 16);
  const tmp = Matrix.Identity();
  let fIdx = 0;
  let wIdx = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cx = (x + 0.5) * cellSize;
      const cz = (y + 0.5) * cellSize;
      if (cells[y * width + x] === FLOOR) {
        Matrix.TranslationToRef(cx, 0, cz, tmp);
        tmp.copyToArray(floorMatrices, fIdx * 16);
        Matrix.TranslationToRef(cx, WALL_HEIGHT, cz, tmp);
        tmp.copyToArray(ceilMatrices, fIdx * 16);
        fIdx++;
      } else if (wallSet.has(y * width + x)) {
        Matrix.TranslationToRef(cx, WALL_HEIGHT / 2, cz, tmp);
        tmp.copyToArray(wallMatrices, wIdx * 16);
        wIdx++;
      }
    }
  }
  for (const [bx, by] of boundary) {
    const cx = (bx + 0.5) * cellSize;
    const cz = (by + 0.5) * cellSize;
    Matrix.TranslationToRef(cx, WALL_HEIGHT / 2, cz, tmp);
    tmp.copyToArray(wallMatrices, wIdx * 16);
    wIdx++;
  }
  stage.add(floors, ceils, walls);
  bake(floors, floorMatrices);
  bake(ceils, ceilMatrices);
  bake(walls, wallMatrices);

  return {
    group: stage,
    grid,
    isWall: (cx, cy) => !isFloor(cx, cy),
  };
}
