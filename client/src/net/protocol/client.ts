/** Client → server packet definitions and the discriminated union. */

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
export type ClientSetCosmeticPkt = {
  type: "set_cosmetic";
  category: "body" | "facePattern" | "hat" | "title";
  cosmeticId: string | null;
};
export type ClientBuyCosmeticPkt = { type: "buy_cosmetic"; cosmeticId: string };
export type ClientPingPkt = { type: "ping"; x: number; z: number };
export type ClientVoiceNoisePkt = { type: "voice_noise" };
export type ClientHidePkt = { type: "hide" };

export type ClientLobbySettingsPkt = {
  type: "lobby_settings";
  maxPlayers?: number;
  password?: string;
  clearPassword?: boolean;
  selectedTeachers?: string[];
  selectAllTeachers?: boolean;
  mapSize?: number;
  mapSeed?: number;
  clearMapSeed?: boolean;
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
  | ClientDoorTogglePkt
  | ClientSetCosmeticPkt
  | ClientBuyCosmeticPkt
  | ClientPingPkt
  | ClientVoiceNoisePkt
  | ClientHidePkt;
