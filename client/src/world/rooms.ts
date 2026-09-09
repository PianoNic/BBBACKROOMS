import type { Grid, Prop } from "../net/protocol";
import { seedFromPos } from "./propBuilders/_common";

export type RoomArchetype =
  | "classroom" | "hallway" | "cafeteria" | "chemistry_lab"
  | "gym" | "janitor_room" | "server_room" | "teacher_room" | "toilet";

export const ROOM_ARCHETYPES: readonly RoomArchetype[] = [
  "hallway", "classroom", "cafeteria", "chemistry_lab",
  "gym", "janitor_room", "server_room", "teacher_room", "toilet",
];

export type Room = {
  archetype: RoomArchetype;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  seed: number;
};

const FLOOR = 1;
const MIN_ROOM = 4;
const ATRIUM_MIN_SIDE = 8;
const STRONG_WEIGHT = 3;
const WEAK_WEIGHT = 1;

type Signature = { strong: readonly string[]; weak: readonly string[] };

const SIGNATURES: Partial<Record<RoomArchetype, Signature>> = {
  toilet: { strong: ["toilet_stall", "urinal"], weak: ["sink"] },
  server_room: { strong: ["server_rack"], weak: [] },
  gym: { strong: ["basketball_hoop", "gym_mat", "ball_rack", "pylon"], weak: [] },
  chemistry_lab: {
    strong: ["lab_bench", "fume_hood", "chemical_shelf", "bunsen_burner", "emergency_shower"],
    weak: ["microscope"],
  },
  cafeteria: { strong: ["cafeteria_table", "vending_machine", "counter", "microwave"], weak: [] },
  janitor_room: { strong: ["fuse_box", "mop_bucket"], weak: [] },
  teacher_room: { strong: ["sofa", "printer", "fridge", "side_table", "trophy_case"], weak: [] },
  classroom: {
    strong: ["student_desk", "whiteboard", "projector", "easel", "globe", "map", "skeleton"],
    weak: [],
  },
};

type Component = {
  cells: number[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function buildPrefixSum(
  width: number, height: number, isFloor: (x: number, y: number) => boolean,
): Int32Array {
  const stride = width + 1;
  const psum = new Int32Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const above = psum[y * stride + (x + 1)];
      const left = psum[(y + 1) * stride + x];
      const diag = psum[y * stride + x];
      const v = isFloor(x, y) ? 1 : 0;
      psum[(y + 1) * stride + (x + 1)] = above + left - diag + v;
    }
  }
  return psum;
}

function rectSum(
  psum: Int32Array, width: number, x0: number, y0: number, x1: number, y1: number,
): number {
  const stride = width + 1;
  return psum[(y1 + 1) * stride + (x1 + 1)] - psum[y0 * stride + (x1 + 1)]
    - psum[(y1 + 1) * stride + x0] + psum[y0 * stride + x0];
}

function hasFloorWindow(
  psum: Int32Array, width: number, height: number, x: number, y: number,
): boolean {
  for (let wy = Math.max(0, y - MIN_ROOM + 1); wy <= y; wy++) {
    if (wy + MIN_ROOM > height) continue;
    for (let wx = Math.max(0, x - MIN_ROOM + 1); wx <= x; wx++) {
      if (wx + MIN_ROOM > width) continue;
      const sum = rectSum(psum, width, wx, wy, wx + MIN_ROOM - 1, wy + MIN_ROOM - 1);
      if (sum === MIN_ROOM * MIN_ROOM) return true;
    }
  }
  return false;
}

function labelComponents(width: number, height: number, roomCell: Uint8Array): Component[] {
  const visited = new Uint8Array(width * height);
  const components: Component[] = [];
  const stack: number[] = [];
  for (let start = 0; start < width * height; start++) {
    if (!roomCell[start] || visited[start]) continue;
    const cells: number[] = [];
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    stack.push(start);
    visited[start] = 1;
    while (stack.length > 0) {
      const idx = stack.pop()!;
      const x = idx % width;
      const y = (idx / width) | 0;
      cells.push(idx);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const neighbours: [number, number][] = [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
      ];
      for (const [nx, ny] of neighbours) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nIdx = ny * width + nx;
        if (roomCell[nIdx] && !visited[nIdx]) {
          visited[nIdx] = 1;
          stack.push(nIdx);
        }
      }
    }
    components.push({ cells, minX, minY, maxX, maxY });
  }
  return components;
}

function findAtriumIndex(components: Component[], width: number, height: number): number {
  const cx = width / 2;
  const cy = height / 2;
  let best = -1;
  let bestDist = Infinity;
  components.forEach((c, i) => {
    const w = c.maxX - c.minX + 1;
    const h = c.maxY - c.minY + 1;
    if (w < ATRIUM_MIN_SIDE || h < ATRIUM_MIN_SIDE) return;
    const dx = (c.minX + c.maxX) / 2 - cx;
    const dy = (c.minY + c.maxY) / 2 - cy;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

function classify(comp: Component, props: Prop[], cellSize: number): RoomArchetype {
  const scores = new Map<RoomArchetype, number>();
  for (const prop of props) {
    const cellX = Math.floor(prop.x / cellSize);
    const cellZ = Math.floor(prop.z / cellSize);
    if (cellX < comp.minX || cellX > comp.maxX || cellZ < comp.minY || cellZ > comp.maxY) continue;
    const typeName = prop.type as string;
    for (const [archetype, sig] of Object.entries(SIGNATURES) as [RoomArchetype, Signature][]) {
      let add = 0;
      if (sig.strong.includes(typeName)) add = STRONG_WEIGHT;
      else if (sig.weak.includes(typeName)) add = WEAK_WEIGHT;
      if (add > 0) scores.set(archetype, (scores.get(archetype) ?? 0) + add);
    }
  }
  let bestScore = 0;
  for (const score of scores.values()) if (score > bestScore) bestScore = score;
  if (bestScore === 0) return "classroom";
  const winners: RoomArchetype[] = [];
  for (const [archetype, score] of scores) if (score === bestScore) winners.push(archetype);
  return winners.length === 1 ? winners[0] : "classroom";
}

export class RoomInference {
  readonly cellArchetype: Uint8Array;
  readonly rooms: Room[];

  constructor(grid: Grid, props: Prop[]) {
    const { width, height, cells, cellSize } = grid;
    const isFloor = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < width && y < height && cells[y * width + x] === FLOOR;

    const psum = buildPrefixSum(width, height, isFloor);
    const roomCell = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isFloor(x, y)) continue;
        if (hasFloorWindow(psum, width, height, x, y)) roomCell[y * width + x] = 1;
      }
    }

    const components = labelComponents(width, height, roomCell);
    const atriumIdx = components.length > 0 ? findAtriumIndex(components, width, height) : -1;

    const cellArchetype = new Uint8Array(width * height);
    const rooms: Room[] = [];

    components.forEach((comp, i) => {
      if (i === atriumIdx) return;
      const archetype = classify(comp, props, cellSize);
      const id = ROOM_ARCHETYPES.indexOf(archetype);
      for (const cellIdx of comp.cells) cellArchetype[cellIdx] = id;
      const seed = seedFromPos(comp.minX, comp.minY, 131.71, 197.37);
      rooms.push({ archetype, minX: comp.minX, minY: comp.minY, maxX: comp.maxX, maxY: comp.maxY, seed });
    });

    this.cellArchetype = cellArchetype;
    this.rooms = rooms;
  }

  archetypeAt(cellIndex: number): RoomArchetype {
    return ROOM_ARCHETYPES[this.cellArchetype[cellIndex]] ?? "hallway";
  }

  archetypeAtXY(x: number, y: number, width: number): RoomArchetype {
    return this.archetypeAt(y * width + x);
  }
}
