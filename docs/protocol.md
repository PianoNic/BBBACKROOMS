# Protocol

All gameplay packets are JSON over WebSocket. Source of truth:
- Server: [`server/app/schemas/packets.py`](../server/app/schemas/packets.py) (Pydantic, discriminated union on `type`).
- Client: [`client/src/net/protocol.ts`](../client/src/net/protocol.ts).

## REST
| Endpoint | Purpose |
| --- | --- |
| `GET /healthz` | Liveness — Docker healthcheck. |
| `GET /version` | Build version. |
| `GET /lobbies` | List of open lobbies (status `waiting`). |
| `POST /lobbies` | Create lobby `{ name, maxPlayers, password? }`. |
| `GET /turn-credentials` | Short-lived ICE servers for the WebRTC mesh. |

## WebSocket lifecycle
```
ws://host/ws/{lobbyId}?pwd={optional}
```
Close codes:
- `4404` — lobby does not exist.
- `4401` — wrong password.
- `4403` — lobby full.
- `4423` — lobby already running (status != `waiting`).

After `accept`:
1. Server assigns `pid` (6 hex), `color`, provisional name.
2. Server sends `lobby_room_state` to the new member.
3. Server broadcasts `lobby_player_join` to everyone else.

## Client → Server packets
All have `type: "<name>"`. Selection (full list in `packets.py`):

| `type` | Payload | Effect |
| --- | --- | --- |
| `set_name` | `name` (≤24) | Set profile name. |
| `set_avatar` | `avatar` (≤200 kB data URL) | Set avatar. |
| `start_game` | — | Admin-only: lobby → round. |
| `move` | `x, z, yaw` | Position update (server validates + broadcasts). |
| `interact` | — | E key on focused object. |
| `chair_pickup` | `chairId` | Pick up a chair. |
| `chair_throw` | `dirX, dirZ` | Throw the chair. |
| `chair_drop` | — | Drop the chair. |
| `pickup_collect` | `pickupId` | Collect a locker item. |
| `use_potion` | — | Drink the potion. |
| `use_goggles` | — | Activate thermal goggles. |
| `revive_start` / `revive_cancel` | `targetId` | Revive flow. |
| `locker_open` | `lockerId` | Open locker. |
| `door_toggle` | `doorId` | Toggle door. |
| `webcam_state` | … | Broadcast cam/mic on/off. |
| `gamble_open` / `gamble_play` | `laptopId, choice?` | Laptop mini-app. |
| `chat_send` | `text` (≤300) | Lobby chat. |
| `back_to_lobby` | — | Return after a round. |
| `lobby_settings` | … | Admin-only: tune lobby. |
| `webrtc_signal` | `to, kind, data` | Server relays offer/answer/ICE to a peer. |

## Server → Client packets
Main ones (see `services/broadcast.py` and the lobby/world services):

- `lobby_room_state` — full lobby snapshot on join.
- `lobby_player_join` / `player_leave` — peer updates.
- `lobby_admin_changed` — new admin after disconnect.
- `world_init` — grid, spawns, props, lights, tasks, extraction position, your player.
- Movement / state snapshots from the game tick (players, teachers, doors, pickups).
- `chat` — broadcast chat message.
- `webrtc_signal` — relayed peer signal.
- `revive_progress` — revive UI.
- `victory` / `defeat` / `back_to_lobby` — end of round.

## WebRTC signaling
The server inspects **nothing**. Contract:
```
client A → server: { type: "webrtc_signal", to: "<pidB>", kind: "offer"|"answer"|"ice", data: <opaque> }
server   → client B: { type: "webrtc_signal", from: "<pidA>", kind, data }
```
`data` is typically `{sdp, type}` or `{candidate, sdpMid, sdpMLineIndex}`. ICE servers come from `/turn-credentials`.
