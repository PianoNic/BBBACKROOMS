"""Pure domain entities for a lobby. No I/O, no services."""
from __future__ import annotations

from dataclasses import dataclass, field

from app.application.dtos.world import WorldInit
from app.domain.lobbies.chair import Chair
from app.domain.lobbies.chair_projectile import ChairProjectile
from app.domain.lobbies.chat_message import ChatMessage
from app.domain.lobbies.door import Door
from app.domain.lobbies.hideout import Hideout
from app.domain.lobbies.laptop import Laptop
from app.domain.lobbies.locker import Locker
from app.domain.lobbies.pickup import Pickup
from app.domain.lobbies.player_conn import PlayerConn
from app.domain.lobbies.revive import Revive
from app.domain.world.layout import Rect
from app.domain.world.teachers import TeacherState


GAMES = (
    "slots", "dice", "coinflip",
    "teams_call", "teams_dm", "teams_file",
    "moodle_course", "moodle_file", "moodle_quiz",
    "rpg_battle",
)


@dataclass
class Lobby:
    id: str
    name: str
    status: str = "waiting"  # "waiting" | "running" | "ended"
    max_players: int = 8
    password: str | None = None
    admin_id: str | None = None
    # If None: pick teachers randomly from the full roster.
    # If a list: sample (with replacement) from these image filenames each game
    # — picking the same one repeatedly is allowed and intentional.
    selected_teacher_images: list[str] | None = None
    pack_id: str | None = None
    pack_hash: str | None = None
    # Cells per side of the square map grid. Admin-tunable in the lobby room.
    map_size: int = 60
    # Admin-supplied worldgen seed. None = pick a fresh random one each
    # round (the default — most lobbies want a different map every time).
    map_seed: int | None = None
    # The seed actually used for the last started round (so the lobby UI
    # can echo it back; admins like to know what was rolled).
    last_seed: int | None = None
    # How many objectives the admin wants per round (clamped to the
    # generator's pool, see quests.build_objectives).
    objective_count: int = 6
    # True once a round has been started in this lobby. Prevents the
    # "empty + waiting → delete" cleanup from wiping a parked lobby
    # during the brief moment when everyone reloads after Back-to-Lobby.
    had_game: bool = False
    chat: list[ChatMessage] = field(default_factory=list)
    world: WorldInit | None = None
    conns: dict[str, PlayerConn] = field(default_factory=dict)
    phase: str = "tasks"
    extracted: set[str] = field(default_factory=set)
    laptops: dict[str, Laptop] = field(default_factory=dict)
    chairs: dict[str, Chair] = field(default_factory=dict)
    chair_projectiles: list[ChairProjectile] = field(default_factory=list)
    teachers: list[TeacherState] = field(default_factory=list)
    hallway_rects: list[Rect] = field(default_factory=list)
    # Queued noise events (x, z, hearing radius) — drained every teacher tick.
    noise_events: list[tuple[float, float, float]] = field(default_factory=list)
    # World coords of every doorway (cell centers in metres). Teachers stay
    # outside a small radius around these points so they don't camp entrances.
    doors: list[tuple[float, float]] = field(default_factory=list)
    dead: set[str] = field(default_factory=set)
    # World-level debuffs from teacher abilities.
    extraction_locked_until: float = 0.0
    # Players are invulnerable and ability events are paused until this time
    # (monotonic clock). Used to cover the start-of-game slot-machine reveal.
    grace_until: float = 0.0
    # Round timing (monotonic) for the end-of-round scoreboard. round_ended_at
    # is stamped once when the win/lose scoreboard is first built.
    round_started_at: float = 0.0
    round_ended_at: float = 0.0
    # Per-conn reward blocks (xp/coins/level) computed at round end, cached so
    # a reconnecting player still sees their level-up screen. rewards_applied
    # guards against awarding twice (and, later, double account writes).
    round_rewards: dict[str, dict] = field(default_factory=dict)
    rewards_applied: bool = False
    # Active slow puddles: list of (x, z, radius, until, factor).
    potion_puddles: list[tuple[float, float, float, float, float]] = field(default_factory=list)
    pickups: dict[str, Pickup] = field(default_factory=dict)
    lockers: dict[str, Locker] = field(default_factory=dict)
    hideouts: dict[str, Hideout] = field(default_factory=dict)
    doors_state: dict[str, Door] = field(default_factory=dict)
    # Position recorded at death so corpses are interactable for revive.
    corpses: dict[str, tuple[float, float]] = field(default_factory=dict)
    # Active revive channels keyed by reviver id.
    revives: dict[str, Revive] = field(default_factory=dict)
