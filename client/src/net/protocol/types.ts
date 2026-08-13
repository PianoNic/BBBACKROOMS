/** Core world data types — shared between the world snapshot and many
 *  per-packet payloads. Kept here so packet modules can import them
 *  without circular dependencies. */
export type Spawn = { x: number; z: number; yaw: number };

export type Grid = {
  width: number;
  height: number;
  cellSize: number;
  cells: number[];
};

export type Light = { x: number; z: number; yaw: number };

export type PropType =
  | "desk"
  | "chair"
  | "student_desk"
  | "whiteboard"
  | "cupboard"
  | "closet"
  | "trash_can"
  | "painting"
  | "plant"
  | "toilet_stall"
  | "sink"
  | "bench"
  | "papers"
  | "laptop"
  | "urinal"
  | "bookshelf"
  | "clock"
  | "globe"
  | "swiss_flag"
  | "projector"
  | "bulletin_board"
  | "radiator"
  | "backpack"
  | "books_pile"
  | "fire_extinguisher"
  | "locker"
  | "floor_lamp"
  | "vending_machine"
  | "coffee_machine"
  | "microwave"
  | "counter"
  | "fuse_box"
  | "recycle_bin"
  | "exit_sign"
  | "gym_mat"
  | "basketball_hoop"
  | "cafeteria_table"
  | "pylon"
  | "mop_bucket"
  | "server_rack"
  | "printer"
  | "sofa"
  | "fridge"
  | "side_table"
  | "map"
  | "chalkboard"
  | "coat_rack"
  | "microscope"
  | "aquarium" | "skeleton" | "piano" | "water_dispenser"
  | "trophy_case" | "ball_rack" | "easel";

export type Prop = {
  type: PropType; x: number; z: number; yaw: number; variant?: number;
};

export type ItemType =
  | "notebook"
  | "pencil_case"
  | "papers"
  | "calculator"
  | "textbook"
  | "mug"
  | "key"
  | "phone"
  | "toilet_paper"
  | "gloves"
  | "envelope"
  | "sponge"
  | "eye"
  | "watering_can"
  | "hdd";

export type Spot = {
  x: number; z: number; yaw: number; done: boolean;
  tag?: string | null;
  anchor_x?: number | null;
  anchor_y?: number | null;
  anchor_z?: number | null;
};

export type Objective = {
  id: string;
  text: string;
  interact: boolean;
  item: ItemType | null;
  spots: Spot[];
  radius: number;
  done: boolean;
  /** Co-op: players that must stand at the spot together (default 1). */
  min_players?: number;
};

export type CosmeticCategory = "body" | "facePattern" | "hat" | "title";
export type EquippedCosmetics = Partial<Record<CosmeticCategory, string>>;
export type CatalogItem = {
  id: string;
  category: CosmeticCategory;
  name: string;
  price: number;
  rarity: string;
  assetRef: string;
  default: boolean;
};
export type SelfCosmetics = { owned: string[]; equipped: EquippedCosmetics };

export type RemotePlayer = {
  id: string;
  color: string;
  x: number;
  z: number;
  yaw: number;
  avatar?: string | null;
  equipped?: EquippedCosmetics;
};

export type TeacherInfo = {
  id: string;
  image: string;
  name: string;
  subject: string;
  ability: string;
  x: number;
  z: number;
};

export type RosterEntry = {
  image: string;
  name: string;
  subject: string;
  ability: string;
};

export type LaptopGame =
  | "slots" | "dice" | "coinflip"
  | "teams_call" | "teams_dm" | "teams_file"
  | "moodle_course" | "moodle_file" | "moodle_quiz"
  | "rpg_battle";

export type LaptopInfo = {
  id: string;
  x: number;
  z: number;
  yaw: number;
  game: LaptopGame;
  done: boolean;
};

/** Random per-laptop state for challenge games. The `correct` field is
 *  stripped server-side so the client can't peek; everything below is the
 *  display data the player needs to render the UI. */
export type LaptopChallenge = {
  channels?: string[];
  host?: string;
  from?: string;
  question?: string;
  options?: string[];
  channel?: string;
  files?: string[];
  course?: { name: string; code: string };
  courses?: { name: string; code: string }[];
  hint?: string;
  quizTitle?: string;
  boss?: string;
  playerMaxHp?: number;
  bossMaxHp?: number;
};

/** One resolved rpg_battle turn, attached to the gamble_result packet. */
export type RpgBattle = {
  action: string;
  playerHp: number;
  bossHp: number;
  playerDmg: number;
  bossDmg: number;
  healed: number;
  bossDown: boolean;
  playerDown: boolean;
};

export type ChairInit = {
  id: string;
  x: number;
  z: number;
  yaw: number;
  heldBy: string | null;
};

export type PickupKind =
  | "medkit" | "potion" | "compass" | "tracker" | "goggles" | "gps";

export type PickupInfo = { id: string; kind: PickupKind; x: number; z: number };

export type LockerInfo = {
  id: string; x: number; z: number; yaw: number;
  opened: boolean; has_item: boolean;
};

export type DoorInfo = {
  id: string; x: number; z: number; yaw: number; isOpen: boolean;
};

export type CorpseInfo = { id: string; x: number; z: number };

export type LobbyPlayer = {
  id: string; name: string; color: string; avatar?: string | null;
  equipped?: EquippedCosmetics;
};

export type ChatMessage = { id: string; author: string; text: string; ts: number };
