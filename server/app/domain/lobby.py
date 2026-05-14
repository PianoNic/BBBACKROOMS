"""Pure domain entities for a lobby. No I/O, no services."""
from __future__ import annotations

from dataclasses import dataclass, field

from fastapi import WebSocket

from app.schemas.world import WorldInit
from app.world.layout import Rect
from app.world.teachers import TeacherState


GAMES = (
    "slots", "dice", "coinflip",
    "teams_call", "teams_dm", "teams_file",
    "moodle_course", "moodle_file",
)


@dataclass
class Chair:
    id: str
    # Resting pose (where the chair sits when nobody is holding it).
    home_x: float
    home_z: float
    home_yaw: float
    # Current pose. Equals the home pose while idle; updated when dropped
    # at a new location.
    x: float
    z: float
    yaw: float
    held_by: str | None = None


@dataclass
class ChairProjectile:
    id: str            # unique flight id
    chair_id: str
    owner_id: str
    x: float
    z: float
    vx: float
    vz: float
    spawn_t: float     # monotonic seconds


@dataclass
class Laptop:
    id: str
    x: float
    z: float
    yaw: float
    game: str
    # For challenge games (teams_*, moodle_*) this holds the per-laptop random
    # state: the list of options shown to the player plus the correct answer.
    # Casino games (slots/dice/coinflip) leave this empty — they roll fresh
    # results each play.
    challenge: dict = field(default_factory=dict)


@dataclass
class Pickup:
    id: str
    kind: str  # "medkit" | "potion" | "compass" | "tracker" | "goggles" | "gps"
    x: float
    z: float


@dataclass
class Door:
    """Classroom doorway with a hinged, openable panel. Non-blocking —
    purely atmospheric + an interactable for players and teachers."""
    id: str
    x: float
    z: float
    yaw_closed: float
    is_open: bool = False
    # Per-door cooldown so teachers don't flap the same door every tick.
    teacher_cooldown_until: float = 0.0


@dataclass
class Locker:
    """A school locker. Items hide inside until a player opens it.

    `item` is the pickup kind stored inside, or None for an empty locker.
    Opening either auto-collects the item (if the player has inventory
    space) or drops it as a regular `Pickup` at the locker's position so
    a teammate can grab it later."""
    id: str
    x: float
    z: float
    yaw: float
    opened: bool = False
    item: str | None = None  # "medkit" | "potion" | "compass" | "tracker" | "goggles" | "gps" | None


@dataclass
class Revive:
    """In-flight revive channel. One per reviver — they cancel automatically
    if the reviver moves, dies, or aborts."""
    reviver_id: str
    target_id: str
    start_x: float
    start_z: float
    started_at: float
    completes_at: float


@dataclass
class PlayerConn:
    """A connected player. Holds the live WebSocket and their world state."""
    id: str
    name: str
    color: str
    ws: WebSocket
    x: float = 0.0
    z: float = 0.0
    yaw: float = 0.0
    avatar: str | None = None
    # Debuff timestamps (monotonic seconds). Server pushes the deltas to the
    # client; the client respects them so movement stays smooth.
    slow_until: float = 0.0
    slow_factor: float = 1.0
    stun_until: float = 0.0
    medkits: int = 0
    potions: int = 0
    compasses: int = 0
    trackers: int = 0
    goggles: int = 0
    gps: int = 0
    # Thermal goggles state: reveal teacher outlines for `goggles_until` and
    # cannot be triggered again until `goggles_cooldown_until` (both are
    # monotonic seconds).
    goggles_until: float = 0.0
    goggles_cooldown_until: float = 0.0
    haste_until: float = 0.0
    haste_factor: float = 1.0


@dataclass
class ChatMessage:
    id: str
    author: str
    text: str
    ts: float


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
    # World coords of every doorway (cell centers in metres). Teachers stay
    # outside a small radius around these points so they don't camp entrances.
    doors: list[tuple[float, float]] = field(default_factory=list)
    dead: set[str] = field(default_factory=set)
    # World-level debuffs from teacher abilities.
    extraction_locked_until: float = 0.0
    # Players are invulnerable and ability events are paused until this time
    # (monotonic clock). Used to cover the start-of-game slot-machine reveal.
    grace_until: float = 0.0
    # Active slow puddles: list of (x, z, radius, until, factor).
    potion_puddles: list[tuple[float, float, float, float, float]] = field(default_factory=list)
    pickups: dict[str, Pickup] = field(default_factory=dict)
    lockers: dict[str, Locker] = field(default_factory=dict)
    doors_state: dict[str, Door] = field(default_factory=dict)
    # Position recorded at death so corpses are interactable for revive.
    corpses: dict[str, tuple[float, float]] = field(default_factory=dict)
    # Active revive channels keyed by reviver id.
    revives: dict[str, Revive] = field(default_factory=dict)
