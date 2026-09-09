from __future__ import annotations

from dataclasses import dataclass, field

from app.domain.lobbies.player_channel import IPlayerChannel


@dataclass
class PlayerConn:
    """A connected player. Holds the live WebSocket and their world state."""
    id: str
    name: str
    color: str
    channel: IPlayerChannel
    # False until this conn has been sent its own `lobby_state`. Broadcasts
    # skip it in the meantime: the conn is registered in `lobby.conns` before
    # that first send is awaited, so without this gate another player joining
    # concurrently can land a `lobby_player_join` ahead of it — and the client
    # drops everything received before `lobby_state` (net/client.ts).
    ready: bool = False
    # Linked account (OAuth login) or None for guests. Set at connect time from
    # a verified WS ticket; drives whether round rewards are persisted.
    account_id: int | None = None
    # Cosmetics cache, seeded at connect (account rows, or free defaults for
    # guests). `equipped_cosmetics` is {category: cosmetic_id}.
    owned_cosmetics: set[str] = field(default_factory=set)
    equipped_cosmetics: dict[str, str] = field(default_factory=dict)
    x: float = 0.0
    z: float = 0.0
    yaw: float = 0.0
    avatar: str | None = None
    # Debuff timestamps (monotonic seconds); deltas pushed to the client.
    slow_until: float = 0.0
    slow_factor: float = 1.0
    stun_until: float = 0.0
    medkits: int = 0
    potions: int = 0
    compasses: int = 0
    trackers: int = 0
    goggles: int = 0
    gps: int = 0
    # Thermal goggles: reveal teacher outlines until `goggles_until`; can
    # only retrigger after `goggles_cooldown_until` (both monotonic).
    goggles_until: float = 0.0
    goggles_cooldown_until: float = 0.0
    # Ping rate limit (monotonic seconds of the last accepted ping).
    last_ping_t: float = 0.0
    # Noise system: previous move sample (for sprint-speed inference) and
    # rate-limit stamps for sprint/voice noise emission.
    last_move_x: float = 0.0
    last_move_z: float = 0.0
    last_move_t: float = 0.0
    last_noise_t: float = 0.0
    last_voice_noise_t: float = 0.0
    # Hideout (closet) the player is currently hiding in, or None.
    hidden_in: str | None = None
    # Set when a move packet changes the pose; the teacher tick drains this
    # into one batched `players_state` snapshot instead of relaying every
    # move packet to every other player.
    pose_dirty: bool = False
    # Last player_status payload pushed to this conn, so unchanged status
    # (the common case — all timers zero) costs nothing.
    last_status: tuple[int, float, int, int, float] | None = None
    haste_until: float = 0.0
    haste_factor: float = 1.0
    # Per-round scoreboard counters (zeroed on back-to-lobby). death_t /
    # extracted_t are monotonic stamps used to derive survival time.
    tasks_done: int = 0
    teachers_stunned: int = 0
    revives_done: int = 0
    items_collected: int = 0
    death_t: float = 0.0
    extracted_t: float = 0.0
