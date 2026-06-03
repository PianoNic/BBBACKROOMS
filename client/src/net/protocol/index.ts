/** Public re-exports for the WebSocket protocol.
 *
 *  Layout:
 *    - `./types`         — shared data shapes (Prop, Spot, Objective, …).
 *    - `./server_world`  — server packets for world snapshot + game state.
 *    - `./server_lobby`  — server packets for lobby room + chat + gamble.
 *    - `./server_player` — server packets for players + interactions.
 *    - `./client`        — packets sent by the client.
 *
 *  Existing imports of `../net/protocol` keep working because every name
 *  is re-exported here, and the `ServerPacket` / `ClientPacket` unions
 *  are assembled below. */
import type {
  GameLostPkt,
  GameWonPkt,
  ObjectiveDonePkt,
  PhaseChangePkt,
  PlayerExtractedPkt,
  PlayerKilledPkt,
  SpotDonePkt,
  SpotRelockedPkt,
  TeacherAbilityPkt,
  TeacherStunsPkt,
  TeachersStatePkt,
  WorldGenStartPkt,
  WorldInit,
} from "./server_world";
import type {
  ChatMessagePkt,
  GambleResultPkt,
  GambleStatePkt,
  LobbyAdminChangedPkt,
  LobbyPlayerJoinPkt,
  LobbyPlayerRenamePkt,
  LobbySettingsPkt,
  LobbyStatePkt,
} from "./server_lobby";
import type {
  ChairHitPkt,
  ChairStatePkt,
  ChairThrowStartPkt,
  DoorStatePkt,
  GogglesStatePkt,
  InventoryPkt,
  LockerOpenedPkt,
  PickupTakenPkt,
  PlayerAvatarPkt,
  PlayerCosmeticPkt,
  PlayerJoinPkt,
  PlayerLeavePkt,
  PlayerRevivedPkt,
  PlayerStatePkt,
  PlayerStatusPkt,
  ReviveProgressPkt,
  ShopResultPkt,
  WebRTCSignalPkt,
  WebcamStateBroadcastPkt,
} from "./server_player";

export * from "./types";
export * from "./server_world";
export * from "./server_lobby";
export * from "./server_player";
export * from "./client";

export type ServerPacket =
  | WorldInit
  | WorldGenStartPkt
  | TeachersStatePkt
  | TeacherAbilityPkt
  | TeacherStunsPkt
  | ObjectiveDonePkt
  | SpotDonePkt
  | SpotRelockedPkt
  | PhaseChangePkt
  | PlayerExtractedPkt
  | PlayerKilledPkt
  | GameWonPkt
  | GameLostPkt
  | LobbyStatePkt
  | LobbySettingsPkt
  | LobbyPlayerJoinPkt
  | LobbyPlayerRenamePkt
  | LobbyAdminChangedPkt
  | ChatMessagePkt
  | GambleStatePkt
  | GambleResultPkt
  | PlayerJoinPkt
  | PlayerCosmeticPkt
  | ShopResultPkt
  | PlayerStatePkt
  | PlayerLeavePkt
  | PlayerAvatarPkt
  | PlayerStatusPkt
  | InventoryPkt
  | GogglesStatePkt
  | PickupTakenPkt
  | LockerOpenedPkt
  | DoorStatePkt
  | ReviveProgressPkt
  | PlayerRevivedPkt
  | ChairStatePkt
  | ChairThrowStartPkt
  | ChairHitPkt
  | WebRTCSignalPkt
  | WebcamStateBroadcastPkt;
