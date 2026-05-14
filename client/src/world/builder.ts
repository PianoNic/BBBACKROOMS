import * as THREE from "three";
import type { Grid } from "../net/protocol";
import { materials } from "../rendering/materials";

export const WALL_HEIGHT = 3;

export type World = {
  group: THREE.Group;
  grid: Grid;
  isWall: (cellX: number, cellY: number) => boolean;
};

const FLOOR = 1;

export function buildWorld(grid: Grid): World {
  const { width, height, cellSize, cells } = grid;
  const group = new THREE.Group();

  const floorCount = cells.filter((c) => c === FLOOR).length;
  const cellGeom = new THREE.PlaneGeometry(cellSize, cellSize).rotateX(-Math.PI / 2);
  const floors = new THREE.InstancedMesh(cellGeom, materials.floor, floorCount);
  const ceilGeom = new THREE.PlaneGeometry(cellSize, cellSize).rotateX(Math.PI / 2);
  const ceils = new THREE.InstancedMesh(ceilGeom, materials.ceiling, floorCount);

  // count walls: any non-floor cell adjacent (4-neighbours) to a floor cell
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
  const wallGeom = new THREE.BoxGeometry(cellSize, WALL_HEIGHT, cellSize);
  const walls = new THREE.InstancedMesh(wallGeom, materials.wall, wallSet.size);

  const dummy = new THREE.Object3D();
  let fIdx = 0;
  let wIdx = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cx = (x + 0.5) * cellSize;
      const cz = (y + 0.5) * cellSize;
      if (cells[y * width + x] === FLOOR) {
        dummy.position.set(cx, 0, cz);
        dummy.updateMatrix();
        floors.setMatrixAt(fIdx, dummy.matrix);
        dummy.position.set(cx, WALL_HEIGHT, cz);
        dummy.updateMatrix();
        ceils.setMatrixAt(fIdx, dummy.matrix);
        fIdx++;
      } else if (wallSet.has(y * width + x)) {
        dummy.position.set(cx, WALL_HEIGHT / 2, cz);
        dummy.updateMatrix();
        walls.setMatrixAt(wIdx, dummy.matrix);
        wIdx++;
      }
    }
  }
  floors.instanceMatrix.needsUpdate = true;
  ceils.instanceMatrix.needsUpdate = true;
  walls.instanceMatrix.needsUpdate = true;
  group.add(floors, ceils, walls);

  return {
    group,
    grid,
    isWall: (cx, cy) => !isFloor(cx, cy),
  };
}
