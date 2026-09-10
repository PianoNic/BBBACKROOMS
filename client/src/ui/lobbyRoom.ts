import type { LobbyStatePkt } from "../net/protocol";
import type { NetClient } from "../net/client";
import type { WebcamMesh } from "../gameplay/webcam";
import { mountMenuApp } from "./menu/mount";
import { route } from "./menu/routes";
import { mountLobby, unmountLobby } from "./menu/state/lobby";

export function showLobbyRoom(
  initial: LobbyStatePkt,
  client: NetClient,
  webcam?: WebcamMesh,
): { dismount: () => void } {
  mountMenuApp();
  mountLobby(initial, client, webcam);
  route.value = "lobby";

  return {
    dismount: () => {
      unmountLobby();
      route.value = null;
    },
  };
}
