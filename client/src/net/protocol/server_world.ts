/** Server → client packets for world state: the initial snapshot, phase
 *  changes, teacher tracking, death/extraction events. */
import type {
  ChairInit,
  CorpseInfo,
  DoorInfo,
  Grid,
  LaptopInfo,
  Light,
  LockerInfo,
  Objective,
  PickupInfo,
  Prop,
  RemotePlayer,
  RosterEntry,
  SelfCosmetics,
  Spawn,
  TeacherInfo,
} from "./types";

/** One player's row in the end-of-round scoreboard. */
export type PlayerScore = {
  id: string;
  name: string;
  color: string;
  tasks: number;
  stuns: number;
  revives: number;
  items: number;
  survivalMs: number;
  extracted: boolean;
  died: boolean;
};

/** The viewing player's own XP/coins/level result for the round. Drives the
 *  level-up animation. `saved` is false for guests (shown but not persisted). */
export type SelfRewards = {
  xpEarned: number;
  coinsEarned: number;
  levelBefore: number;
  levelAfter: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  leveledUp: boolean;
  saved: boolean;
};

/** End-of-round stats summary, attached to game_won/game_lost (and to
 *  world_init when reconnecting into an already-decided round). `selfRewards`
 *  is per-recipient (omitted from the shared stats). */
export type ScoreboardData = {
  result: "won" | "lost";
  durationMs: number;
  players: PlayerScore[];
  team: {
    tasks: number; stuns: number; revives: number; items: number;
    extracted: number; died: number; total: number;
  };
  selfRewards?: SelfRewards | null;
};

export type WorldInit = {
  type: "world_init";
  grid: Grid;
  spawn: Spawn;
  lights: Light[];
  props: Prop[];
  laptops: LaptopInfo[];
  selfId: string;
  selfColor: string;
  players: RemotePlayer[];
  objectives: Objective[];
  extraction: { x: number; z: number; radius: number };
  phase: "tasks" | "escape" | "won" | "lost";
  extractedPlayers: string[];
  deadPlayers: string[];
  teachers: TeacherInfo[];
  roster: RosterEntry[];
  chairs: ChairInit[];
  pickups: PickupInfo[];
  lockers: LockerInfo[];
  doors: DoorInfo[];
  corpses: CorpseInfo[];
  inventory: {
    medkits: number; potions: number; compasses: number;
    trackers: number; goggles: number; gps: number;
  };
  selfCosmetics?: SelfCosmetics;
  scoreboard?: ScoreboardData | null;
};

export type WorldGenStartPkt = { type: "world_gen_start" };

export type TeachersStatePkt = {
  type: "teachers_state";
  teachers: { id: string; x: number; z: number }[];
};

export type TeacherAbilityPkt = {
  type: "teacher_ability";
  id: string;
  ability: string;
  x: number;
  z: number;
  targetId?: string;
  payload?: Record<string, unknown>;
};

export type TeacherStunsPkt = {
  type: "teacher_stuns";
  teachers: { id: string; ms: number }[];
};

export type ObjectiveDonePkt = { type: "objective_done"; id: string; by: string };
export type SpotDonePkt = { type: "spot_done"; id: string; spot: number; by: string };
export type SpotRelockedPkt = {
  type: "spot_relocked";
  id: string;
  tag: string | null;
  by: string;
};

export type PhaseChangePkt = { type: "phase_change"; phase: "tasks" | "escape" | "won" };
export type PlayerExtractedPkt = { type: "player_extracted"; id: string };
export type PlayerKilledPkt = {
  type: "player_killed"; id: string; x: number; z: number; by: string;
};
export type GameWonPkt = { type: "game_won"; scoreboard: ScoreboardData };
export type GameLostPkt = { type: "game_lost"; scoreboard: ScoreboardData };
