import { useEffect, useRef, useState } from "preact/hooks";
import {
  activatePack, deactivatePack, getActivePackId, listPacks, resolveTeacherThumb,
} from "../../../core/texturePacks";
import { imagePreloader } from "../../../core/imagePreload";
import { createLobbyMediaControls, type LobbyMediaControls } from "../../lobbyMediaControls";
import { handleLobbyPacket } from "../../lobbyPackets";
import { exitScreen } from "../../screenTransition";
import { Button } from "../components/controls";
import { Modal, Overlay } from "../components/Overlay";
import { useMediaQuery } from "../components/useMediaQuery";
import { adminModalOpen, shopOverlayOpen } from "../routes";
import {
  buyLobbyShopItem, equipLobbyShopItem, leaveLobby, lobbyAdminId, lobbyChat, lobbyClient,
  lobbyHasPassword, lobbyMapSeed, lobbyMapSize, lobbyMaxPlayers, lobbyName, lobbyObjectiveCount,
  lobbyPackHash, lobbyPackId, lobbyPlayers, lobbyRemoteStreams, lobbyRoomId, lobbyRoster,
  lobbySelectedTeachers, lobbySelfId, lobbyShopBalance, lobbyShopNote, lobbyShopSignedIn,
  lobbyWebcam, selfCosmeticsEquipped, selfCosmeticsOwned, shopCatalog,
} from "../state/lobby";
import { AdminPanel } from "./lobby/AdminPanel";
import { Chat } from "./lobby/Chat";
import { PlayersList } from "./lobby/PlayersList";
import { ShopOverlay } from "./shop/ShopOverlay";

export function LobbyRoom() {
  const [media] = useState<LobbyMediaControls>(() => createLobbyMediaControls(lobbyWebcam.value));
  const [packNote, setPackNote] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const wide = useMediaQuery("(min-width: 720px)");
  const screenRef = useRef<HTMLDivElement | null>(null);

  const selfId = lobbySelfId.value;
  const adminId = lobbyAdminId.value;
  const isAdmin = selfId === adminId && adminId !== null;
  const players = lobbyPlayers.value;
  const client = lobbyClient.value;

  useEffect(() => {
    const webcam = lobbyWebcam.value;
    imagePreloader.warm(
      lobbyRoster.value.map((t, i) => resolveTeacherThumb(t.ability, i, t.image)),
    );
    if (webcam) {
      webcam.onRemoteStream((id, stream) => {
        const next = new Map(lobbyRemoteStreams.value);
        if (stream) next.set(id, stream);
        else next.delete(id);
        lobbyRemoteStreams.value = next;
      });
    }
    client?.onPacket((pkt) => handleLobbyPacket(pkt, webcam));
    return () => media.dispose();
  }, []);

  useEffect(() => {
    const packId = lobbyPackId.value;
    if (!packId) {
      deactivatePack();
      setPackNote("");
      return;
    }
    void activatePack(packId, lobbyPackHash.value ?? "").then((ok) => {
      setPackNote(ok ? "Pack aktiv" : `Host verwendet Pack ${packId} (nicht installiert)`);
    });
  }, [lobbyPackId.value, lobbyPackHash.value]);

  useEffect(() => {
    if (!isAdmin || !client) return;
    const activeId = getActivePackId();
    if (!activeId) return;
    void listPacks().then((packs) => {
      const found = packs.find((p) => p.id === activeId);
      if (found) client.send({ type: "pack_announce", pack_id: activeId, pack_hash: found.hash });
    });
  }, [isAdmin]);

  const adminName = players.get(adminId ?? "")?.name ?? "admin";

  return (
    <div id="lobby-room" class="bb-screen" ref={screenRef}>
      <h1>BACKROOMS BADEN</h1>
      <div class="sysbar">
        <span>{`SYS://LOBBY/${lobbyRoomId.value}`}</span>
        <span>{`${lobbyHasPassword.value ? "🔒 " : ""}${lobbyName.value}`}</span>
        <span id="pack-indicator">{packNote}</span>
      </div>

      <div class="bb-panel lobby-panel">
        <div class="cols">
          <div class="col players-col">
            <div class="bb-subheading">
              <span>PLAYERS</span>
              <span class="count">{`${players.size}/${lobbyMaxPlayers.value}`}</span>
            </div>
            <div class="bb-scroll players-scroll">
              <PlayersList media={media} />
            </div>
          </div>

          <div class="col chat-col">
            {wide ? (
              <>
                <div class="bb-subheading"><span>CHAT</span></div>
                <Chat client={client!} />
              </>
            ) : (
              <>
                <button
                  type="button"
                  class="chat-toggle bb-focus"
                  aria-expanded={chatOpen}
                  onClick={() => setChatOpen(!chatOpen)}
                >
                  <span>{`CHAT (${lobbyChat.value.length})`}</span>
                  <span aria-hidden="true">{chatOpen ? "−" : "+"}</span>
                </button>
                {chatOpen ? <Chat client={client!} /> : null}
              </>
            )}
          </div>
        </div>

        <div class="footer">
          <div class="admin-note">
            {isAdmin ? "you're the admin — start when ready" : `waiting for ${adminName} to start…`}
          </div>
          <a class="legal-link" href="/datenschutz.html" target="_blank" rel="noopener noreferrer">
            Datenschutz
          </a>
          <Button
            variant="primary"
            class="start-btn"
            disabled={!isAdmin}
            onClick={() => client?.send({ type: "start_game" })}
          >
            START GAME
          </Button>
          {isAdmin ? (
            <Button onClick={() => { adminModalOpen.value = true; }}>SETTINGS</Button>
          ) : null}
          <Button onClick={() => { shopOverlayOpen.value = true; }}>SHOP</Button>
          {media.available ? (
            <Button disabled={media.micBusy.value} onClick={() => void media.toggleMic()}>
              {media.micOn.value ? "MIC OFF" : "MIC ON"}
            </Button>
          ) : null}
          {media.available ? (
            <Button disabled={media.camBusy.value} onClick={() => void media.toggleCam()}>
              {media.camOn.value ? "CAM OFF" : "CAM ON"}
            </Button>
          ) : null}
          <Button
            variant="back"
            class="leave-btn"
            onClick={async () => {
              leaveLobby();
              if (screenRef.current?.parentElement) {
                await exitScreen(screenRef.current.parentElement, "back");
              }
              client?.close();
              window.location.reload();
            }}
          >
            ← LEAVE
          </Button>
        </div>
      </div>

      {adminModalOpen.value ? (
        <Overlay id="lobby-admin-overlay" onClose={() => { adminModalOpen.value = false; }}>
          <Modal class="admin-modal">
            <h2 class="bb-heading">ADMIN SETTINGS</h2>
            <div class="bb-scroll admin-scroll">
              <AdminPanel
                client={client!}
                isAdmin={isAdmin}
                maxPlayers={lobbyMaxPlayers.value}
                hasPassword={lobbyHasPassword.value}
                mapSize={lobbyMapSize.value}
                mapSeed={lobbyMapSeed.value}
                objectiveCount={lobbyObjectiveCount.value}
                selectedTeachers={lobbySelectedTeachers.value}
                roster={lobbyRoster.value}
              />
            </div>
            <Button variant="primary" onClick={() => { adminModalOpen.value = false; }}>CLOSE</Button>
          </Modal>
        </Overlay>
      ) : null}

      {shopOverlayOpen.value ? (
        <ShopOverlay
          signedIn={lobbyShopSignedIn}
          balance={lobbyShopBalance}
          owned={selfCosmeticsOwned}
          equipped={selfCosmeticsEquipped}
          note={lobbyShopNote}
          catalog={shopCatalog}
          onBuy={buyLobbyShopItem}
          onEquip={equipLobbyShopItem}
          onClose={() => { shopOverlayOpen.value = false; }}
        />
      ) : null}
    </div>
  );
}
