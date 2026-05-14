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
  | "server_rack";
export type Prop = { type: PropType; x: number; z: number; yaw: number; variant?: number };

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
};

export type RemotePlayer = {
  id: string;
  color: string;
  x: number;
  z: number;
  yaw: number;
  avatar?: string | null;
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

export type LaptopGame =
  | "slots" | "dice" | "coinflip"
  | "teams_call" | "teams_dm" | "teams_file"
  | "moodle_course" | "moodle_file";

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
  // teams_call
  channels?: string[];
  host?: string;
  // teams_dm
  from?: string;
  question?: string;
  options?: string[];
  // teams_file / moodle_file
  channel?: string;
  files?: string[];
  course?: { name: string; code: string };
  // moodle_course
  courses?: { name: string; code: string }[];
  // common: the thing the player is told to find (course name, file name, ...)
  hint?: string;
};

export type ChairInit = {
  id: string;
  x: number;
  z: number;
  yaw: number;
  heldBy: string | null;
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
  phase: "tasks" | "escape" | "won";
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
};

export type RosterEntry = {
  image: string;
  name: string;
  subject: string;
  ability: string;
};

export type TeachersStatePkt = {
  type: "teachers_state";
  teachers: { id: string; x: number; z: number }[];
};

export type ObjectiveDonePkt = { type: "objective_done"; id: string; by: string };
export type SpotDonePkt = { type: "spot_done"; id: string; spot: number; by: string };
export type PhaseChangePkt = { type: "phase_change"; phase: "tasks" | "escape" | "won" };
export type PlayerExtractedPkt = { type: "player_extracted"; id: string };
export type PlayerKilledPkt = { type: "player_killed"; id: string; x: number; z: number; by: string };
export type GameWonPkt = { type: "game_won" };
export type GameLostPkt = { type: "game_lost" };

export type LobbyPlayer = { id: string; name: string; color: string; avatar?: string | null };
export type ChatMessage = { id: string; author: string; text: string; ts: number };
export type LobbyStatePkt = {
  type: "lobby_state";
  id: string; name: string;
  status: "waiting" | "running" | "ended";
  maxPlayers: number; hasPassword: boolean;
  adminId: string | null;
  selfId: string;
  selectedTeachers: string[] | null;
  roster: RosterEntry[];
  players: LobbyPlayer[];
  chat: ChatMessage[];
  mapSize?: number;
  objectiveCount?: number;
};
export type LobbySettingsPkt = {
  type: "lobby_settings";
  maxPlayers: number;
  hasPassword: boolean;
  selectedTeachers: string[] | null;
  mapSize?: number;
  objectiveCount?: number;
};
export type LobbyPlayerJoinPkt = { type: "lobby_player_join" } & LobbyPlayer;
export type LobbyPlayerRenamePkt = { type: "lobby_player_rename"; id: string; name: string };
export type LobbyAdminChangedPkt = { type: "lobby_admin_changed"; adminId: string };
export type ChatMessagePkt = { type: "chat_message" } & ChatMessage;
export type GambleStatePkt = {
  type: "gamble_state";
  laptopId: string;
  game: LaptopGame;
  done: boolean;
  challenge?: LaptopChallenge;
};
export type GambleResultPkt = {
  type: "gamble_result";
  laptopId: string;
  game: LaptopGame;
  win: boolean;
  symbols?: number[];
  rolls?: number[];
  sum?: number;
  outcome?: "heads" | "tails";
  choice?: string;
};

export type PlayerJoinPkt = { type: "player_join" } & RemotePlayer;
export type PlayerStatePkt = { type: "player_state"; id: string; x: number; z: number; yaw: number };
export type PlayerLeavePkt = { type: "player_leave"; id: string };
export type PlayerAvatarPkt = { type: "player_avatar"; id: string; avatar: string };

export type TeacherAbilityPkt = {
  type: "teacher_ability";
  id: string;
  ability: string;
  x: number;
  z: number;
  targetId?: string;
  payload?: Record<string, unknown>;
};

export type PlayerStatusPkt = {
  type: "player_status";
  slowMs: number;
  slowFactor: number;
  stunMs: number;
  hasteMs?: number;
  hasteFactor?: number;
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

export type InventoryPkt = {
  type: "inventory";
  medkits: number;
  potions: number;
  compasses: number;
  trackers: number;
  goggles: number;
  gps: number;
};

export type GogglesStatePkt = {
  type: "goggles_state";
  activeMs: number;
  cooldownMs: number;
};

export type PickupTakenPkt = { type: "pickup_taken"; id: string; by: string };

export type LockerOpenedPkt = {
  type: "locker_opened";
  id: string;
  by: string;
  autoCollected: PickupKind | null;
  spawned: PickupInfo | null;
};

export type DoorStatePkt = {
  type: "door_state";
  id: string;
  isOpen: boolean;
  by: string | null;
};

export type ReviveProgressPkt = { type: "revive_progress"; progress: number };

export type PlayerRevivedPkt = {
  type: "player_revived";
  id: string;
  by: string;
  x: number;
  z: number;
};


export type SpotRelockedPkt = {
  type: "spot_relocked";
  id: string;
  tag: string | null;
  by: string;
};

export type ChairStatePkt = {
  type: "chair_state";
  chairId: string;
  x: number;
  z: number;
  yaw: number;
  heldBy: string | null;
};

export type ChairThrowStartPkt = {
  type: "chair_throw_start";
  id: string;
  chairId: string;
  ownerId: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
};

export type ChairHitPkt = {
  type: "chair_hit";
  id: string;
  chairId: string;
  x: number;
  z: number;
  hitId: string | null;
  hitKind: "teacher" | "player" | null;
};

export type TeacherStunsPkt = {
  type: "teacher_stuns";
  teachers: { id: string; ms: number }[];
};

export type WebRTCSignalPkt = {
  type: "webrtc_signal";
  from: string;
  kind: "offer" | "answer" | "ice";
  data: Record<string, unknown>;
};

export type WebcamStateBroadcastPkt = {
  type: "webcam_state";
  id: string;
  on: boolean;
};

export type ServerPacket =
  | WorldInit
  | PlayerJoinPkt
  | PlayerStatePkt
  | PlayerLeavePkt
  | PlayerAvatarPkt
  | ObjectiveDonePkt
  | SpotDonePkt
  | PhaseChangePkt
  | PlayerExtractedPkt
  | GameWonPkt
  | GameLostPkt
  | GambleStatePkt
  | GambleResultPkt
  | TeachersStatePkt
  | PlayerKilledPkt
  | LobbyStatePkt
  | LobbySettingsPkt
  | LobbyPlayerJoinPkt
  | LobbyPlayerRenamePkt
  | LobbyAdminChangedPkt
  | ChatMessagePkt
  | TeacherAbilityPkt
  | PlayerStatusPkt
  | SpotRelockedPkt
  | ChairStatePkt
  | ChairThrowStartPkt
  | ChairHitPkt
  | TeacherStunsPkt
  | WebRTCSignalPkt
  | WebcamStateBroadcastPkt
  | InventoryPkt
  | GogglesStatePkt
  | PickupTakenPkt
  | LockerOpenedPkt
  | DoorStatePkt
  | ReviveProgressPkt
  | PlayerRevivedPkt;

export type ClientMovePkt = { type: "move"; x: number; z: number; yaw: number };
export type ClientSetAvatarPkt = { type: "set_avatar"; avatar: string };
export type ClientInteractPkt = { type: "interact" };
export type ClientGambleOpenPkt = { type: "gamble_open" };
export type ClientGamblePlayPkt = {
  type: "gamble_play";
  laptopId: string;
  choice?: string;
};
export type ClientChatSendPkt = { type: "chat_send"; text: string };
export type ClientStartGamePkt = { type: "start_game" };
export type ClientSetNamePkt = { type: "set_name"; name: string };
export type ClientChairPickupPkt = { type: "chair_pickup"; chairId: string };
export type ClientChairThrowPkt = { type: "chair_throw"; dirX: number; dirZ: number };
export type ClientChairDropPkt = { type: "chair_drop" };
export type ClientWebRTCSignalPkt = {
  type: "webrtc_signal";
  to: string;
  kind: "offer" | "answer" | "ice";
  data: Record<string, unknown>;
};
export type ClientWebcamStatePkt = { type: "webcam_state"; on: boolean };
export type ClientPickupCollectPkt = { type: "pickup_collect"; pickupId: string };
export type ClientUsePotionPkt = { type: "use_potion" };
export type ClientUseGogglesPkt = { type: "use_goggles" };
export type ClientBackToLobbyPkt = { type: "back_to_lobby" };
export type ClientReviveStartPkt = { type: "revive_start"; targetId: string };
export type ClientReviveCancelPkt = { type: "revive_cancel" };
export type ClientLockerOpenPkt = { type: "locker_open"; lockerId: string };
export type ClientDoorTogglePkt = { type: "door_toggle"; doorId: string };

export type ClientLobbySettingsPkt = {
  type: "lobby_settings";
  maxPlayers?: number;
  password?: string;
  clearPassword?: boolean;
  selectedTeachers?: string[];
  selectAllTeachers?: boolean;
  mapSize?: number;
  objectiveCount?: number;
};

export type ClientPacket =
  | ClientMovePkt
  | ClientSetAvatarPkt
  | ClientInteractPkt
  | ClientGambleOpenPkt
  | ClientGamblePlayPkt
  | ClientChatSendPkt
  | ClientStartGamePkt
  | ClientSetNamePkt
  | ClientChairPickupPkt
  | ClientChairThrowPkt
  | ClientChairDropPkt
  | ClientLobbySettingsPkt
  | ClientWebRTCSignalPkt
  | ClientWebcamStatePkt
  | ClientPickupCollectPkt
  | ClientUsePotionPkt
  | ClientUseGogglesPkt
  | ClientBackToLobbyPkt
  | ClientReviveStartPkt
  | ClientReviveCancelPkt
  | ClientLockerOpenPkt
  | ClientDoorTogglePkt;
