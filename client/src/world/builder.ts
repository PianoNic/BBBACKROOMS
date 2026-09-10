import "@babylonjs/core/Meshes/thinInstanceMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Material } from "@babylonjs/core/Materials/material";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Grid, Prop } from "../net/protocol";
import { getDecalMaterial, getRoomMaterials } from "../rendering/materials";
import { AMBIENCE } from "../rendering/ambience";
import { freezeWhenCompiled } from "../rendering/modelMaterials";
import { RoomInference } from "./rooms";
import { mulberry32 } from "./propBuilders/_common";
import { box, group, plane, type Group } from "../rendering/babylon";

export const WALL_HEIGHT = 3;

export type World = {
  group: Group;
  grid: Grid;
  isWall: (cellX: number, cellY: number) => boolean;
  inference: RoomInference;
};

const FLOOR = 1;
const DADO_RAIL_HEIGHT = 0.06;
const WALL_DECAL_Y = 2.1;
const CEILING_DECAL_MARGIN = 0.02;
const WALL_FACE_MARGIN = 0.01;

function bake(mesh: Mesh, matrices: Float32Array, cullable: boolean): void {
  mesh.thinInstanceSetBuffer("matrix", matrices, 16, true);
  mesh.isPickable = false;
  if (cullable) {
    mesh.alwaysSelectAsActiveMesh = false;
    mesh.doNotSyncBoundingInfo = false;
    mesh.thinInstanceRefreshBoundingInfo(true);
  } else {
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.doNotSyncBoundingInfo = true;
  }
  mesh.freezeWorldMatrix();
}

export function buildWorld(grid: Grid, props: Prop[]): World {
  const { width, height, cellSize, cells } = grid;
  const stage = group("world");

  const frozenMaterials = new Set<Material>();
  const scheduleFreeze = (material: Material, mesh: Mesh): void => {
    if (frozenMaterials.has(material)) return;
    frozenMaterials.add(material);
    freezeWhenCompiled(material, mesh, { useInstances: true });
  };

  const isFloor = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && cells[y * width + x] === FLOOR;

  const inference = new RoomInference(grid, props);

  const wallSet = new Set<number>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isFloor(x, y)) continue;
      if (isFloor(x - 1, y) || isFloor(x + 1, y) || isFloor(x, y - 1) || isFloor(x, y + 1)) {
        wallSet.add(y * width + x);
      }
    }
  }

  const boundary: [number, number][] = [];
  for (let y = 0; y < height; y++) {
    if (isFloor(0, y)) boundary.push([-1, y]);
    if (isFloor(width - 1, y)) boundary.push([width, y]);
  }
  for (let x = 0; x < width; x++) {
    if (isFloor(x, 0)) boundary.push([x, -1]);
    if (isFloor(x, height - 1)) boundary.push([x, height]);
  }
  for (const [cxi, cyi, ox, oy] of [
    [0, 0, -1, -1],
    [0, height - 1, -1, height],
    [width - 1, 0, width, -1],
    [width - 1, height - 1, width, height],
  ] as const) {
    if (isFloor(cxi, cyi)) boundary.push([ox, oy]);
  }

  function wallRegion(x: number, y: number): number {
    const neighbours: [number, number][] = [
      [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
    ];
    for (const [nx, ny] of neighbours) {
      if (isFloor(nx, ny)) return inference.regionAt(ny * width + nx);
    }
    return 0;
  }

  const floorByRegion = new Map<number, number[]>();
  const wallByRegion = new Map<number, [number, number][]>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (cells[idx] === FLOOR) {
        const r = inference.regionAt(idx);
        const list = floorByRegion.get(r);
        if (list) list.push(idx);
        else floorByRegion.set(r, [idx]);
      } else if (wallSet.has(idx)) {
        const r = wallRegion(x, y);
        const list = wallByRegion.get(r);
        if (list) list.push([x, y]);
        else wallByRegion.set(r, [[x, y]]);
      }
    }
  }
  for (const [bx, by] of boundary) {
    const r = wallRegion(bx, by);
    const list = wallByRegion.get(r);
    if (list) list.push([bx, by]);
    else wallByRegion.set(r, [[bx, by]]);
  }

  for (const [regionId, idxs] of floorByRegion) {
    const matSet = getRoomMaterials(inference.regionArchetype(regionId));
    const floorMesh = plane(cellSize, cellSize, matSet.floor, false, `floors_r${regionId}`);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.bakeCurrentTransformIntoVertices();
    const ceilMesh = plane(cellSize, cellSize, matSet.ceiling, false, `ceils_r${regionId}`);
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.bakeCurrentTransformIntoVertices();

    const floorMatrices = new Float32Array(idxs.length * 16);
    const ceilMatrices = new Float32Array(idxs.length * 16);
    const tmp = Matrix.Identity();
    idxs.forEach((idx, i) => {
      const x = idx % width;
      const y = (idx / width) | 0;
      const cx = (x + 0.5) * cellSize;
      const cz = (y + 0.5) * cellSize;
      Matrix.TranslationToRef(cx, 0, cz, tmp);
      tmp.copyToArray(floorMatrices, i * 16);
      Matrix.TranslationToRef(cx, WALL_HEIGHT, cz, tmp);
      tmp.copyToArray(ceilMatrices, i * 16);
    });
    stage.add(floorMesh, ceilMesh);
    bake(floorMesh, floorMatrices, true);
    bake(ceilMesh, ceilMatrices, true);
    scheduleFreeze(matSet.floor, floorMesh);
    scheduleFreeze(matSet.ceiling, ceilMesh);
  }

  for (const [regionId, coords] of wallByRegion) {
    const archetype = inference.regionArchetype(regionId);
    const matSet = getRoomMaterials(archetype);
    const wallMesh = box(cellSize, WALL_HEIGHT, cellSize, matSet.wall, `walls_r${regionId}`);
    const wallMatrices = new Float32Array(coords.length * 16);
    const tmp = Matrix.Identity();
    coords.forEach(([x, y], i) => {
      const cx = (x + 0.5) * cellSize;
      const cz = (y + 0.5) * cellSize;
      Matrix.TranslationToRef(cx, WALL_HEIGHT / 2, cz, tmp);
      tmp.copyToArray(wallMatrices, i * 16);
    });
    stage.add(wallMesh);
    bake(wallMesh, wallMatrices, true);
    scheduleFreeze(matSet.wall, wallMesh);

    const config = AMBIENCE.materials.rooms[archetype];
    if (config.dado && matSet.dado && matSet.rail) {
      const dadoHeight = config.dadoHeight ?? 1.0;
      const dadoMesh = box(
        cellSize + 0.02, dadoHeight, cellSize + 0.02, matSet.dado, `dado_r${regionId}`,
      );
      const railMesh = box(
        cellSize + 0.05, DADO_RAIL_HEIGHT, cellSize + 0.05, matSet.rail, `rail_r${regionId}`,
      );
      const dadoMatrices = new Float32Array(coords.length * 16);
      const railMatrices = new Float32Array(coords.length * 16);
      const tmp2 = Matrix.Identity();
      coords.forEach(([x, y], i) => {
        const cx = (x + 0.5) * cellSize;
        const cz = (y + 0.5) * cellSize;
        Matrix.TranslationToRef(cx, dadoHeight / 2, cz, tmp2);
        tmp2.copyToArray(dadoMatrices, i * 16);
        Matrix.TranslationToRef(cx, dadoHeight, cz, tmp2);
        tmp2.copyToArray(railMatrices, i * 16);
      });
      stage.add(dadoMesh, railMesh);
      bake(dadoMesh, dadoMatrices, true);
      bake(railMesh, railMatrices, true);
      scheduleFreeze(matSet.dado, dadoMesh);
      scheduleFreeze(matSet.rail, railMesh);
    }
  }

  if (inference.rooms.length > 0) {
    const decalCfg = AMBIENCE.materials.decal;
    const decalMat = getDecalMaterial();
    const composedByRegion = new Map<number, Matrix[]>();

    inference.rooms.forEach((room, roomIndex) => {
      const regionId = roomIndex + 1;
      const rng = mulberry32(room.seed);
      const wallCandidates: { wx: number; wy: number; dx: number; dy: number }[] = [];
      for (let y = room.minY; y <= room.maxY; y++) {
        for (let x = room.minX; x <= room.maxX; x++) {
          const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
          for (const [dx, dy] of dirs) {
            const wx = x + dx;
            const wy = y + dy;
            if (wx < 0 || wy < 0 || wx >= width || wy >= height) continue;
            if (wallSet.has(wy * width + wx)) {
              wallCandidates.push({ wx, wy, dx: -dx, dy: -dy });
            }
          }
        }
      }

      const composed: Matrix[] = [];
      for (let i = 0; i < decalCfg.perRoom; i++) {
        const scale = decalCfg.minScale + rng() * (decalCfg.maxScale - decalCfg.minScale);
        const onCeiling = rng() < 0.5;
        if (onCeiling) {
          const rx = room.minX + Math.floor(rng() * (room.maxX - room.minX + 1));
          const ry = room.minY + Math.floor(rng() * (room.maxY - room.minY + 1));
          const cx = (rx + 0.5) * cellSize;
          const cz = (ry + 0.5) * cellSize;
          const spin = rng() * Math.PI * 2;
          const rot = Quaternion.RotationAxis(Vector3.Up(), spin).multiply(
            Quaternion.RotationAxis(Vector3.Right(), Math.PI / 2),
          );
          composed.push(Matrix.Compose(
            new Vector3(scale, scale, scale), rot,
            new Vector3(cx, WALL_HEIGHT - CEILING_DECAL_MARGIN, cz),
          ));
        } else if (wallCandidates.length > 0) {
          const pick = wallCandidates[Math.floor(rng() * wallCandidates.length)];
          const cx = (pick.wx + 0.5) * cellSize;
          const cz = (pick.wy + 0.5) * cellSize;
          const faceX = cx + pick.dx * (cellSize / 2 - WALL_FACE_MARGIN);
          const faceZ = cz + pick.dy * (cellSize / 2 - WALL_FACE_MARGIN);
          const yaw = Math.atan2(pick.dx, pick.dy);
          const rot = Quaternion.RotationAxis(Vector3.Up(), yaw);
          composed.push(Matrix.Compose(
            new Vector3(scale, scale, scale), rot,
            new Vector3(faceX, WALL_DECAL_Y, faceZ),
          ));
        }
      }
      if (composed.length > 0) composedByRegion.set(regionId, composed);
    });

    for (const [regionId, composed] of composedByRegion) {
      const decalMesh = plane(1, 1, decalMat, false, `decals_r${regionId}`);
      const decalMatrices = new Float32Array(composed.length * 16);
      composed.forEach((m, i) => m.copyToArray(decalMatrices, i * 16));
      stage.add(decalMesh);
      bake(decalMesh, decalMatrices, true);
      scheduleFreeze(decalMat, decalMesh);
    }
  }

  return {
    group: stage,
    grid,
    isWall: (cx, cy) => !isFloor(cx, cy),
    inference,
  };
}
