import type { LobbyStatePkt, LobbyPlayer, ChatMessage } from "../net/protocol";
import type { NetClient } from "../net/client";
import type { WebcamMesh } from "../gameplay/webcam";
import { el } from "./dom";
import { icon, Volume2 } from "./icons";
import { buildAdminPanel } from "./lobbyAdminPanel";
import { openAdminModal } from "./lobbyAdminModal";
import { createLobbyMediaControls } from "./lobbyMediaControls";
import { handleLobbyPacket, type LobbyState } from "./lobbyPackets";

type State = LobbyState;

/** Show the pre-game lobby room. Resolves when the admin starts the game. */
export function showLobbyRoom(
  initial: LobbyStatePkt,
  client: NetClient,
  webcam?: WebcamMesh,
): { dismount: () => void } {
  const state: State = {
    players: new Map(initial.players.map((p) => [p.id, p])),
    chat: [...initial.chat],
    adminId: initial.adminId,
    selfId: initial.selfId,
    maxPlayers: initial.maxPlayers,
    hasPassword: initial.hasPassword,
    selectedTeachers: initial.selectedTeachers,
    roster: initial.roster,
    mapSize: initial.mapSize ?? 60,
    mapSeed: initial.mapSeed ?? null,
    objectiveCount: initial.objectiveCount ?? 6,
  };

  const root = el<HTMLDivElement>("div");
  root.id = "lobby-room";

  root.appendChild(el("h1", undefined, "BBBACKROOMS"));
  const sysbar = el<HTMLDivElement>("div", "sysbar");
  sysbar.appendChild(el("span", undefined, `SYS://LOBBY/${initial.id}`));
  const lockTxt = initial.hasPassword ? "🔒 " : "";
  sysbar.appendChild(el("span", undefined, `${lockTxt}${initial.name}`));
  root.appendChild(sysbar);

  const panel = el<HTMLDivElement>("div", "panel panel-brackets");
  const cols = el<HTMLDivElement>("div", "cols");

  const playersCol = el<HTMLDivElement>("div", "col players-col");
  const playersHeader = el<HTMLDivElement>("div", "col-header");
  playersHeader.appendChild(el("span", undefined, "PLAYERS"));
  const countSpan = el<HTMLSpanElement>("span", "count");
  playersHeader.appendChild(countSpan);
  playersCol.appendChild(playersHeader);
  const playersList = el<HTMLUListElement>("ul", "players-list");
  playersCol.appendChild(playersList);

  const chatCol = el<HTMLDivElement>("div", "col chat-col");
  chatCol.appendChild(el("div", "col-header", "CHAT"));
  const chatLog = el<HTMLDivElement>("div", "chat-log");
  chatCol.appendChild(chatLog);
  const chatForm = el<HTMLFormElement>("form", "chat-form");
  const chatInput = el<HTMLInputElement>("input");
  chatInput.placeholder = "say something…";
  chatInput.maxLength = 300;
  chatForm.appendChild(chatInput);
  const sendBtn = el<HTMLButtonElement>("button", "menu-btn", "SEND");
  sendBtn.type = "submit";
  chatForm.appendChild(sendBtn);
  chatCol.appendChild(chatForm);

  cols.append(playersCol, chatCol);
  panel.appendChild(cols);

  const adminPanel = buildAdminPanel(state, client);

  const media = createLobbyMediaControls(webcam);
  media.onChange(() => renderPlayers());

  const footer = el<HTMLDivElement>("div", "footer");
  const startBtn = el<HTMLButtonElement>("button", "menu-btn primary", "START GAME");
  const settingsBtn = el<HTMLButtonElement>("button", "menu-btn", "SETTINGS");
  settingsBtn.onclick = () => openAdminModal(adminPanel.root);
  const leaveBtn = el<HTMLButtonElement>("button", "menu-btn back", "← LEAVE");
  const adminNote = el<HTMLDivElement>("note", "admin-note");
  footer.append(adminNote, startBtn, settingsBtn, media.micBtn, media.camBtn, leaveBtn);
  panel.appendChild(footer);

  const remoteStreams = new Map<string, MediaStream>();
  if (webcam) {
    webcam.onRemoteStream((id, stream) => {
      if (stream) remoteStreams.set(id, stream);
      else remoteStreams.delete(id);
      renderPlayers();
    });
  }

  root.appendChild(panel);
  document.body.appendChild(root);

  function buildVolumeSlider(playerId: string): HTMLDivElement {
    const wrap = el<HTMLDivElement>("div", "p-volume");
    const range = el<HTMLInputElement>("input", "p-volume-range");
    range.type = "range";
    range.min = "-200";
    range.max = "200";
    range.step = "10";
    const val = media.getPeerVolume(playerId);
    range.value = String(val);
    const label = el<HTMLSpanElement>("span", "p-volume-label",
      val >= 0 ? `+${val}%` : `${val}%`);
    range.oninput = () => {
      const v = parseInt(range.value, 10);
      media.setPeerVolume(playerId, v);
      label.textContent = v >= 0 ? `+${v}%` : `${v}%`;
    };
    wrap.append(range, label);
    return wrap;
  }

  function renderPlayerTile(p: LobbyPlayer): HTMLDivElement {
    const tile = el<HTMLDivElement>("div", "p-avatar-tile");
    tile.style.boxShadow = `0 0 0 2px ${p.color}`;
    const liveStream = p.id === state.selfId
      ? (webcam?.isLocalEnabled() ? webcam.getLocalStream() : null)
      : (remoteStreams.get(p.id) ?? null);
    if (liveStream) {
      const v = el<HTMLVideoElement>("video", "p-avatar-img");
      v.autoplay = true; v.muted = true; v.playsInline = true;
      v.srcObject = liveStream;
      v.play().catch(() => { /* autoplay-muted */ });
      tile.appendChild(v);
    } else if (p.avatar) {
      const img = el<HTMLImageElement>("img", "p-avatar-img");
      img.src = p.avatar;
      tile.appendChild(img);
    } else {
      tile.style.background = p.color;
    }
    return tile;
  }

  function renderPlayers(): void {
    playersList.replaceChildren();
    for (const p of state.players.values()) {
      const li = el<HTMLLIElement>("li", "player-row");
      const name = el<HTMLSpanElement>("span", "p-name", p.name);
      if (p.id === state.selfId) name.textContent += "  (you)";
      const speaker = el<HTMLSpanElement>("span", "p-speaker");
      if (media.isSpeaking(p.id, state.selfId)) {
        speaker.appendChild(icon(Volume2, 16));
      }
      const tag = el<HTMLSpanElement>("span", "p-tag");
      if (p.id === state.adminId) tag.textContent = "ADMIN";
      li.append(renderPlayerTile(p), name, speaker);
      if (p.id !== state.selfId) li.appendChild(buildVolumeSlider(p.id));
      li.appendChild(tag);
      playersList.appendChild(li);
    }
    countSpan.textContent = `${state.players.size}/${state.maxPlayers}`;
    const isAdmin = state.selfId === state.adminId;
    startBtn.disabled = !isAdmin;
    settingsBtn.style.display = isAdmin ? "" : "none";
    adminNote.textContent = isAdmin
      ? "you're the admin — start when ready"
      : `waiting for ${state.players.get(state.adminId ?? "")?.name ?? "admin"} to start…`;
  }

  function appendChatLine(m: ChatMessage): void {
    const line = el<HTMLDivElement>("div", "chat-line");
    const author = el<HTMLSpanElement>(
      "span", "chat-author", state.players.get(m.author)?.name ?? m.author.slice(0, 6),
    );
    const text = el<HTMLSpanElement>("span", "chat-text", m.text);
    line.append(author, text);
    chatLog.appendChild(line);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  for (const m of state.chat) appendChatLine(m);
  renderPlayers();

  chatForm.onsubmit = (e) => {
    e.preventDefault();
    const t = chatInput.value.trim();
    if (!t) return;
    client.send({ type: "chat_send", text: t });
    chatInput.value = "";
  };
  startBtn.onclick = () => { if (!startBtn.disabled) client.send({ type: "start_game" }); };
  leaveBtn.onclick = () => {
    sessionStorage.removeItem("bbb_lobby_resume");
    client.close();
    window.location.reload();
  };

  client.onPacket((pkt) => handleLobbyPacket(pkt, state, webcam, remoteStreams, {
    renderPlayers, refreshAdmin: adminPanel.refresh, appendChatLine,
  }));

  return { dismount: () => { media.dispose(); root.remove(); } };
}
