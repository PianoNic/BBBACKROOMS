/** Server → client packets for the local player and other connected
 *  players: presence, status effects, inventory, world-interaction
 *  acknowledgements, chair physics, WebRTC signalling. */
import type { PickupInfo, PickupKind, RemotePlayer } from "./types";

export type PlayerJoinPkt = { type: "player_join" } & RemotePlayer;
export type PlayerStatePkt = {
  type: "player_state"; id: string; x: number; z: number; yaw: number;
};
export type PlayerLeavePkt = { type: "player_leave"; id: string };
export type PlayerAvatarPkt = { type: "player_avatar"; id: string; avatar: string };

export type PlayerStatusPkt = {
  type: "player_status";
  slowMs: number;
  slowFactor: number;
  stunMs: number;
  hasteMs?: number;
  hasteFactor?: number;
};

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
