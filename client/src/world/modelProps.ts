import type { Grid, PickupKind, Prop, PropType, Spawn } from "../net/protocol";
import { RoomInference, type RoomArchetype } from "./rooms";
import footprints from "../../public/models/footprints.json";

export type ModelAnchor = "floor" | "wall" | "wallMounted" | "surface";

export type HingeSide = "left" | "right";

export type ModelHingeSpec = { node: string; side: HingeSide; openRad: number };

export type ModelPropSpec = {
  model: string;
  scale: number;
  scaleY: number;
  scaleZ: number;
  yawOffset: number;
  anchor: ModelAnchor;
  y: number;
  hinge?: ModelHingeSpec;
};

type Footprint = {
  model: string;
  scale: number;
  scaleY?: number;
  scaleZ?: number;
  hinge?: ModelHingeSpec;
};
type PickupFootprint = { model: string; scale: number; scaleY?: number; scaleZ?: number };
type FootprintFile = {
  props: Record<string, Footprint>;
  pickups: Record<PickupKind, PickupFootprint>;
};

const FOOTPRINTS = footprints as FootprintFile;

function spec(type: PropType, anchor: ModelAnchor, y: number): ModelPropSpec {
  const fp = FOOTPRINTS.props[type];
  return {
    model: fp.model,
    scale: fp.scale,
    scaleY: fp.scaleY ?? fp.scale,
    scaleZ: fp.scaleZ ?? fp.scale,
    yawOffset: 0,
    anchor,
    y,
    hinge: fp.hinge,
  };
}

function pickupSpec(kind: PickupKind): ModelPropSpec {
  const fp = FOOTPRINTS.pickups[kind];
  return {
    model: fp.model,
    scale: fp.scale,
    scaleY: fp.scaleY ?? fp.scale,
    scaleZ: fp.scaleZ ?? fp.scale,
    yawOffset: 0,
    anchor: "floor",
    y: 0,
  };
}

export const MODEL_PROPS: Partial<Record<PropType, ModelPropSpec>> = {
  chair: spec("chair", "floor", 0),
  trash_can: spec("trash_can", "floor", 0),
  recycle_bin: spec("recycle_bin", "floor", 0),
  pylon: spec("pylon", "floor", 0),
  mop_bucket: spec("mop_bucket", "floor", 0),
  plant: spec("plant", "floor", 0),
  papers: spec("papers", "floor", 0),
  student_desk: spec("student_desk", "floor", 0),
  desk: spec("desk", "floor", 0),
  side_table: spec("side_table", "floor", 0),
  cafeteria_table: spec("cafeteria_table", "floor", 0),
  bookshelf: spec("bookshelf", "wall", 0),
  sofa: spec("sofa", "wall", 0),
  bench: spec("bench", "wall", 0),
  cupboard: spec("cupboard", "wall", 0),
  clock: spec("clock", "wallMounted", 2.6),
  fire_extinguisher: spec("fire_extinguisher", "wallMounted", 0.75),
  books_pile: spec("books_pile", "surface", 0.78),
  microscope: spec("microscope", "surface", 0.75),
  bunsen_burner: spec("bunsen_burner", "surface", 0.84),
  microwave: spec("microwave", "surface", 0.9),
  laptop: spec("laptop", "surface", 0.75),
  locker: spec("locker", "wall", 0),
};

export const PICKUP_MODELS: Record<PickupKind, ModelPropSpec> = {
  medkit: pickupSpec("medkit"),
  potion: pickupSpec("potion"),
  compass: pickupSpec("compass"),
  tracker: pickupSpec("tracker"),
  goggles: pickupSpec("goggles"),
  gps: pickupSpec("gps"),
};

export const MANAGER_OWNED_TYPES: ReadonlySet<PropType> = new Set<PropType>(
  ["chair", "laptop", "locker"],
);

export const MODEL_PROP_TYPES: ReadonlySet<PropType> = new Set(
  Object.keys(MODEL_PROPS) as PropType[],
);

export const COMMON_BUNDLE: readonly PropType[] = [
  "chair", "laptop", "locker", "trash_can", "recycle_bin", "pylon", "papers",
  "plant", "clock", "fire_extinguisher", "bench",
];

export const ARCHETYPE_BUNDLES: Record<RoomArchetype, readonly PropType[]> = {
  classroom: ["student_desk", "bookshelf", "cupboard", "books_pile", "microscope", "desk"],
  teacher_room: [
    "desk", "side_table", "sofa", "cupboard", "microwave", "bookshelf", "books_pile",
  ],
  cafeteria: ["cafeteria_table", "microwave"],
  chemistry_lab: ["bunsen_burner", "microscope", "bookshelf"],
  janitor_room: ["mop_bucket", "cupboard"],
  toilet: ["bookshelf"],
  gym: [],
  server_room: [],
  hallway: [],
};

export function bundlesFor(
  grid: Grid, props: readonly Prop[], spawn: Spawn,
): { immediate: PropType[]; deferred: PropType[] } {
  const inference = new RoomInference(grid, [...props]);
  const spawnCellX = Math.floor(spawn.x / grid.cellSize);
  const spawnCellZ = Math.floor(spawn.z / grid.cellSize);
  const spawnArchetype = inference.archetypeAt(spawnCellZ * grid.width + spawnCellX);

  const immediateSet = new Set<PropType>(COMMON_BUNDLE);
  for (const t of ARCHETYPE_BUNDLES[spawnArchetype]) immediateSet.add(t);

  const presentArchetypes = new Set<RoomArchetype>();
  for (const room of inference.rooms) presentArchetypes.add(room.archetype);

  const deferredSet = new Set<PropType>();
  for (const archetype of presentArchetypes) {
    if (archetype === spawnArchetype) continue;
    for (const t of ARCHETYPE_BUNDLES[archetype]) {
      if (!immediateSet.has(t)) deferredSet.add(t);
    }
  }

  return { immediate: [...immediateSet], deferred: [...deferredSet] };
}
