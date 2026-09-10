import { signal } from "@preact/signals";
import type { NetClient } from "../../../net/client";
import type { WebcamMesh } from "../../../gameplay/webcam";
import { buyCosmetic, equipCosmetic } from "../../../gameplay/cosmetics";
import { getMe } from "../../../net/auth";
import type {
  ChatMessage, CosmeticCategory, EquippedCosmetics, LobbyPlayer, LobbyStatePkt,
  RosterEntry,
} from "../../../net/protocol";
import { ensureShopCatalog, shopCatalog } from "./shop";
import { LOBBY_RESUME_KEY, MENU_BACK_KEY } from "./storageKeys";

export type SelfCosmetics = { owned: Set<string>; equipped: EquippedCosmetics };

export const lobbyRoomId = signal("");
export const lobbyName = signal("");
export const lobbyHasPassword = signal(false);
export const lobbyPlayers = signal<Map<string, LobbyPlayer>>(new Map());
export const lobbyChat = signal<ChatMessage[]>([]);
export const lobbyAdminId = signal<string | null>(null);
export const lobbySelfId = signal("");
export const lobbyMaxPlayers = signal(8);
export const lobbySelectedTeachers = signal<string[] | null>(null);
export const lobbyRoster = signal<RosterEntry[]>([]);
export const lobbyMapSize = signal(60);
export const lobbyMapSeed = signal<number | null>(null);
export const lobbyObjectiveCount = signal(6);
export const lobbyPackId = signal<string | null>(null);
export const lobbyPackHash = signal<string | null>(null);
export const lobbyRemoteStreams = signal<Map<string, MediaStream>>(new Map());

export const selfCosmeticsOwned = signal<Set<string>>(new Set());
export const selfCosmeticsEquipped = signal<EquippedCosmetics>({});
export const lobbyShopSignedIn = signal(false);
export const lobbyShopBalance = signal(0);
export const lobbyShopNote = signal("");

export const lobbyClient = signal<NetClient | null>(null);
export const lobbyWebcam = signal<WebcamMesh | undefined>(undefined);

export function mountLobby(
  initial: LobbyStatePkt, client: NetClient, webcam?: WebcamMesh,
): void {
  lobbyRoomId.value = initial.id;
  lobbyName.value = initial.name;
  lobbyHasPassword.value = initial.hasPassword;
  lobbyPlayers.value = new Map(initial.players.map((p) => [p.id, p]));
  lobbyChat.value = [...initial.chat];
  lobbyAdminId.value = initial.adminId;
  lobbySelfId.value = initial.selfId;
  lobbyMaxPlayers.value = initial.maxPlayers;
  lobbySelectedTeachers.value = initial.selectedTeachers;
  lobbyRoster.value = initial.roster;
  lobbyMapSize.value = initial.mapSize ?? 60;
  lobbyMapSeed.value = initial.mapSeed ?? null;
  lobbyObjectiveCount.value = initial.objectiveCount ?? 6;
  lobbyPackId.value = initial.packId ?? null;
  lobbyPackHash.value = initial.packHash ?? null;
  lobbyRemoteStreams.value = new Map();

  selfCosmeticsOwned.value = new Set(initial.selfCosmetics?.owned ?? []);
  selfCosmeticsEquipped.value = initial.selfCosmetics?.equipped ?? {};
  lobbyShopSignedIn.value = false;
  lobbyShopBalance.value = 0;
  lobbyShopNote.value = "";

  lobbyClient.value = client;
  lobbyWebcam.value = webcam;

  void ensureShopCatalog();
  void getMe().then((acc) => {
    lobbyShopSignedIn.value = acc !== null;
    lobbyShopBalance.value = acc?.coins ?? 0;
    if (!acc) lobbyShopNote.value = "Sign in on the title screen to buy and save cosmetics.";
  });
}

export function unmountLobby(): void {
  lobbyClient.value = null;
  lobbyWebcam.value = undefined;
}

export function buyLobbyShopItem(cosmeticId: string): void {
  const client = lobbyClient.value;
  if (!client) return;
  buyCosmetic(client, cosmeticId);
}

export function equipLobbyShopItem(category: CosmeticCategory, cosmeticId: string): void {
  const client = lobbyClient.value;
  if (!client) return;
  equipCosmetic(client, category, cosmeticId);
}

export { shopCatalog };

export function leaveLobby(): void {
  sessionStorage.removeItem(LOBBY_RESUME_KEY);
  sessionStorage.setItem(MENU_BACK_KEY, "1");
}
