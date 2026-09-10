import type { ServerPacket } from "../net/protocol";
import type { WebcamMesh } from "../gameplay/webcam";
import { SHOP_FAIL_TEXT } from "./menu/state/shop";
import {
  lobbyAdminId, lobbyChat, lobbyHasPassword, lobbyMapSeed, lobbyMapSize, lobbyMaxPlayers,
  lobbyObjectiveCount, lobbyPackHash, lobbyPackId, lobbyPlayers, lobbyRemoteStreams,
  lobbySelectedTeachers, lobbySelfId, lobbyShopBalance, lobbyShopNote, selfCosmeticsEquipped,
  selfCosmeticsOwned,
} from "./menu/state/lobby";

export function handleLobbyPacket(pkt: ServerPacket, webcam: WebcamMesh | undefined): void {
  switch (pkt.type) {
    case "lobby_player_join": {
      const next = new Map(lobbyPlayers.value);
      next.set(pkt.id, {
        id: pkt.id, name: pkt.name, color: pkt.color, avatar: pkt.avatar, equipped: pkt.equipped,
      });
      lobbyPlayers.value = next;
      webcam?.addPeer(pkt.id);
      return;
    }
    case "player_cosmetic": {
      const p = lobbyPlayers.value.get(pkt.id);
      if (p) {
        const next = new Map(lobbyPlayers.value);
        next.set(pkt.id, { ...p, equipped: pkt.equipped });
        lobbyPlayers.value = next;
      }
      if (pkt.id === lobbySelfId.value) selfCosmeticsEquipped.value = pkt.equipped;
      return;
    }
    case "shop_result": {
      if (pkt.ok) {
        const next = new Set(selfCosmeticsOwned.value);
        next.add(pkt.cosmeticId);
        selfCosmeticsOwned.value = next;
        lobbyShopNote.value = "Purchased!";
      } else {
        lobbyShopNote.value = SHOP_FAIL_TEXT[pkt.reason] ?? "Purchase failed.";
      }
      lobbyShopBalance.value = pkt.balance;
      return;
    }
    case "player_leave": {
      const next = new Map(lobbyPlayers.value);
      next.delete(pkt.id);
      lobbyPlayers.value = next;
      webcam?.removePeer(pkt.id);
      const streams = new Map(lobbyRemoteStreams.value);
      streams.delete(pkt.id);
      lobbyRemoteStreams.value = streams;
      return;
    }
    case "webrtc_signal":
      void webcam?.applySignal(pkt.from, pkt.kind, pkt.data);
      return;
    case "webcam_state":
      if (!pkt.on) webcam?.applyPeerOff(pkt.id);
      return;
    case "lobby_player_rename": {
      const p = lobbyPlayers.value.get(pkt.id);
      if (p) {
        const next = new Map(lobbyPlayers.value);
        next.set(pkt.id, { ...p, name: pkt.name });
        lobbyPlayers.value = next;
      }
      return;
    }
    case "lobby_admin_changed":
      lobbyAdminId.value = pkt.adminId;
      return;
    case "lobby_settings":
      lobbyMaxPlayers.value = pkt.maxPlayers;
      lobbyHasPassword.value = pkt.hasPassword;
      lobbySelectedTeachers.value = pkt.selectedTeachers;
      if (pkt.mapSize != null) lobbyMapSize.value = pkt.mapSize;
      if ("mapSeed" in pkt) lobbyMapSeed.value = pkt.mapSeed ?? null;
      if (pkt.objectiveCount != null) lobbyObjectiveCount.value = pkt.objectiveCount;
      return;
    case "player_avatar": {
      const p = lobbyPlayers.value.get(pkt.id);
      if (p) {
        const next = new Map(lobbyPlayers.value);
        next.set(pkt.id, { ...p, avatar: pkt.avatar });
        lobbyPlayers.value = next;
      }
      return;
    }
    case "chat_message":
      lobbyChat.value = [
        ...lobbyChat.value,
        { id: pkt.id, author: pkt.author, text: pkt.text, ts: pkt.ts },
      ];
      return;
    case "lobby_pack":
      lobbyPackId.value = pkt.packId;
      lobbyPackHash.value = pkt.packHash;
      return;
  }
}
