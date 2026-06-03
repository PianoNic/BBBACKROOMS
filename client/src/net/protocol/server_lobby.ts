/** Server → client packets for lobby room state, chat, and the
 *  laptop-gambling minigames played inside the lobby. */
import type {
  ChatMessage,
  LaptopChallenge,
  LaptopGame,
  LobbyPlayer,
  RosterEntry,
  SelfCosmetics,
} from "./types";

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
  selfCosmetics?: SelfCosmetics;
  chat: ChatMessage[];
  mapSize?: number;
  mapSeed?: number | null;
  objectiveCount?: number;
};

export type LobbySettingsPkt = {
  type: "lobby_settings";
  maxPlayers: number;
  hasPassword: boolean;
  selectedTeachers: string[] | null;
  mapSize?: number;
  mapSeed?: number | null;
  objectiveCount?: number;
};

export type LobbyPlayerJoinPkt = { type: "lobby_player_join" } & LobbyPlayer;
export type LobbyPlayerRenamePkt = {
  type: "lobby_player_rename"; id: string; name: string;
};
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
