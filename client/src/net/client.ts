import type { ClientPacket, LobbyStatePkt, ServerPacket, WorldInit } from "./protocol";

const HTTP_BASE = import.meta.env.VITE_SERVER_URL ?? "";
const WS_ORIGIN = HTTP_BASE
  ? HTTP_BASE.replace(/^http/, "ws")
  : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
const BASE_URL = `${WS_ORIGIN}/ws`;

export type NetClient = {
  send: (pkt: ClientPacket) => void;
  onPacket: (handler: (pkt: ServerPacket) => void) => void;
  close: () => void;
};

export type LobbyConnection = {
  client: NetClient;
  lobby: LobbyStatePkt;
  waitForWorld(): Promise<WorldInit>;
};

/** Connect to a lobby. Returns immediately with the lobby room state.
    Call `waitForWorld()` after the admin starts to get the world_init. */
export async function connect(lobbyId: string, password?: string): Promise<LobbyConnection> {
  const url = password ? `${BASE_URL}/${lobbyId}?pwd=${encodeURIComponent(password)}` : `${BASE_URL}/${lobbyId}`;
  const ws = new WebSocket(url);

  let activeHandler: ((pkt: ServerPacket) => void) | null = null;
  const queued: ServerPacket[] = [];

  const lobby: LobbyStatePkt = await new Promise((resolve, reject) => {
    ws.addEventListener("error", () => reject(new Error("websocket error")));
    ws.addEventListener("close", (e) => {
      if (e.code === 4401) reject(new Error("wrong password"));
      else if (e.code === 4403) reject(new Error("lobby is full"));
      else if (e.code === 4423) reject(new Error("game already running"));
      else if (e.code === 4404) reject(new Error("lobby not found"));
    });
    const onFirst = (ev: MessageEvent) => {
      const pkt = JSON.parse(ev.data) as ServerPacket;
      if (pkt.type === "lobby_state") {
        ws.removeEventListener("message", onFirst);
        ws.addEventListener("message", (e) => {
          const p = JSON.parse(e.data) as ServerPacket;
          if (activeHandler) activeHandler(p);
          else queued.push(p);
        });
        resolve(pkt);
      }
    };
    ws.addEventListener("message", onFirst);
  });

  const client: NetClient = {
    send: (pkt) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(pkt)); },
    onPacket: (h) => {
      activeHandler = h;
      while (queued.length) { const p = queued.shift()!; h(p); }
    },
    close: () => ws.close(),
  };

  const waitForWorld = (): Promise<WorldInit> => new Promise((resolve) => {
    const prev = activeHandler;
    client.onPacket((pkt) => {
      if (pkt.type === "world_init") {
        client.onPacket(prev ?? (() => undefined));
        resolve(pkt);
      } else if (prev) {
        prev(pkt);
      }
    });
  });

  return { client, lobby, waitForWorld };
}
