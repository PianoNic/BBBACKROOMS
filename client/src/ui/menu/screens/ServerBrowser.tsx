import { useEffect, useState } from "preact/hooks";
import { Button } from "../components/controls";
import { Heading, Panel, Scroll } from "../components/layout";
import { createLobbyOpen, navigate } from "../routes";
import { pickLobby } from "../state/titleFlow";
import { CreateLobbyDialog } from "./CreateLobbyDialog";
import { ProfilePanel } from "./ProfilePanel";

const API = import.meta.env.VITE_SERVER_URL ?? "";

export type LobbyInfo = {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  hasPassword: boolean;
  status?: "waiting" | "running" | "ended";
};

function LobbyRow(props: { lobby: LobbyInfo; locked: boolean }) {
  const { lobby, locked } = props;
  const tag = lobby.status === "running"
    ? "IN GAME"
    : lobby.status === "ended" ? "ENDED" : `${lobby.players}/${lobby.maxPlayers}`;
  return (
    <li>
      <button
        type="button"
        class={locked ? "lobby-row locked" : "lobby-row"}
        disabled={locked}
        title={locked ? "Game in progress — cannot join" : undefined}
        onClick={() => {
          if (locked) return;
          if (lobby.hasPassword) {
            const pwd = prompt(`Password for "${lobby.name}":`);
            if (pwd == null) return;
            pickLobby(lobby.id, pwd);
          } else {
            pickLobby(lobby.id);
          }
        }}
      >
        <span class="lobby-name">{`${lobby.hasPassword ? "🔒 " : ""}${lobby.name}`}</span>
        <span class="lobby-dots" aria-hidden="true" />
        <span class="lobby-count">{tag}</span>
      </button>
    </li>
  );
}

export function ServerBrowser() {
  const [lobbies, setLobbies] = useState<LobbyInfo[] | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = async () => {
    setFailed(false);
    setLobbies(null);
    try {
      const res = await fetch(`${API}/lobbies`);
      setLobbies((await res.json()) as LobbyInfo[]);
    } catch {
      setFailed(true);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const joinable = (lobbies ?? []).filter((l) => (l.status ?? "waiting") === "waiting");
  const inProgress = (lobbies ?? []).filter((l) => l.status === "running" || l.status === "ended");

  return (
    <div class="server-layout">
      <Panel class="server-panel">
        <Heading>SERVERS</Heading>
        <Button
          variant="primary"
          wide
          class="create-lobby"
          onClick={() => { createLobbyOpen.value = true; }}
        >
          + CREATE NEW LOBBY
        </Button>
        <div class="list-header">
          <span>Active lobbies</span>
          <button type="button" class="icon-btn" title="Refresh" onClick={() => void refresh()}>↻</button>
        </div>
        <Scroll class="lobby-scroll">
          <ul class="lobby-list">
            {failed ? <li class="empty">could not reach server</li> : null}
            {!failed && lobbies === null ? <li class="empty">loading…</li> : null}
            {!failed && lobbies !== null && lobbies.length === 0
              ? <li class="empty">no active lobbies — create one</li>
              : null}
            {joinable.map((l) => <LobbyRow key={l.id} lobby={l} locked={false} />)}
            {inProgress.length ? <li class="list-section">IN PROGRESS</li> : null}
            {inProgress.map((l) => <LobbyRow key={l.id} lobby={l} locked />)}
          </ul>
        </Scroll>
        <Button variant="back" class="screen-back" onClick={() => navigate("title", "back")}>
          ← BACK
        </Button>
      </Panel>
      <ProfilePanel />
      {createLobbyOpen.value ? <CreateLobbyDialog /> : null}
    </div>
  );
}
