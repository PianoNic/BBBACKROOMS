/** Packet handler for the pre-game lobby room.
 *
 *  Mirrors the in-game `gamePackets.ts` split. Owns nothing — receives
 *  the lobby state, webcam, and render callbacks and dispatches. */
import type { ServerPacket, LobbyPlayer, ChatMessage } from "../net/protocol";
import type { WebcamMesh } from "../gameplay/webcam";
import type { AdminPanelState } from "./lobbyAdminPanel";

export type LobbyState = AdminPanelState & {
  players: Map<string, LobbyPlayer>;
  chat: ChatMessage[];
};

export type LobbyCallbacks = {
  renderPlayers: () => void;
  refreshAdmin: () => void;
  appendChatLine: (m: ChatMessage) => void;
};

export function handleLobbyPacket(
  pkt: ServerPacket, state: LobbyState, webcam: WebcamMesh | undefined,
  remoteStreams: Map<string, MediaStream>, cb: LobbyCallbacks,
): void {
  switch (pkt.type) {
    case "lobby_player_join":
      state.players.set(pkt.id, { id: pkt.id, name: pkt.name, color: pkt.color, avatar: pkt.avatar });
      webcam?.addPeer(pkt.id);
      cb.renderPlayers();
      return;
    case "player_leave":
      state.players.delete(pkt.id);
      webcam?.removePeer(pkt.id);
      remoteStreams.delete(pkt.id);
      cb.renderPlayers();
      return;
    case "webrtc_signal":
      void webcam?.applySignal(pkt.from, pkt.kind, pkt.data);
      return;
    case "webcam_state":
      if (!pkt.on) webcam?.applyPeerOff(pkt.id);
      return;
    case "lobby_player_rename": {
      const p = state.players.get(pkt.id);
      if (p) { p.name = pkt.name; cb.renderPlayers(); }
      return;
    }
    case "lobby_admin_changed":
      state.adminId = pkt.adminId;
      cb.renderPlayers();
      cb.refreshAdmin();
      return;
    case "lobby_settings":
      state.maxPlayers = pkt.maxPlayers;
      state.hasPassword = pkt.hasPassword;
      state.selectedTeachers = pkt.selectedTeachers;
      if (pkt.mapSize != null) state.mapSize = pkt.mapSize;
      // mapSeed can legitimately become null (admin cleared it → random).
      // Use `in` to distinguish "field present in payload" from "absent".
      if ("mapSeed" in pkt) state.mapSeed = pkt.mapSeed ?? null;
      if (pkt.objectiveCount != null) state.objectiveCount = pkt.objectiveCount;
      cb.refreshAdmin();
      cb.renderPlayers();
      return;
    case "player_avatar": {
      const p = state.players.get(pkt.id);
      if (p) { p.avatar = pkt.avatar; cb.renderPlayers(); }
      return;
    }
    case "chat_message":
      state.chat.push({ id: pkt.id, author: pkt.author, text: pkt.text, ts: pkt.ts });
      cb.appendChatLine({ id: pkt.id, author: pkt.author, text: pkt.text, ts: pkt.ts });
      return;
  }
}
