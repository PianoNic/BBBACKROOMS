from typing import Literal

from pydantic import BaseModel

from app.schemas.prop_types import ItemType, PropType

__all__ = [
    "Spawn", "Grid", "Light", "PropType", "Prop", "ItemType", "Spot",
    "Objective", "ExtractionZone", "Teacher", "RosterEntry", "ChairInit",
    "PickupKind", "PickupInit", "LockerInit", "DoorInit", "WorldInit",
]


class Spawn(BaseModel):
    x: float
    z: float
    yaw: float = 0.0


class Grid(BaseModel):
    width: int
    height: int
    cellSize: float
    cells: list[int]


class Light(BaseModel):
    x: float
    z: float
    yaw: float = 0.0  # rotation of fixture around Y (e.g. align tube with hallway)


class Prop(BaseModel):
    type: PropType
    x: float
    z: float
    yaw: float = 0.0
    variant: int = 0  # used by props with multiple visual variants (e.g. paintings)


class Spot(BaseModel):
    x: float
    z: float
    yaw: float = 0.0  # forward direction of the prop this spot belongs to
    tag: str | None = None  # optional id (e.g. laptop id) for cross-referencing
    done: bool = False
    # Optional world-space anchor for UI prompts. Defaults to (x, eye-height, z)
    # on the client when missing. Wall-mounted props set this to the prop's
    # own position so the [E] label hovers on the painting/whiteboard.
    anchor_x: float | None = None
    anchor_y: float | None = None
    anchor_z: float | None = None


class Objective(BaseModel):
    id: str
    text: str
    kind: str = "find"  # "find" | "press_e" | "casino"
    interact: bool = False  # false=walk-in, true=press-E near each spot (ignored for "casino")
    item: ItemType | None = None
    spots: list[Spot]
    radius: float = 2.0
    done: bool = False


class ExtractionZone(BaseModel):
    x: float
    z: float
    radius: float


class Teacher(BaseModel):
    id: str
    image: str  # filename under /teachers/, e.g. "Erich-Brugger.jpg"
    name: str
    subject: str
    ability: str  # ability id, see app/world/teachers.py
    x: float
    z: float


class RosterEntry(BaseModel):
    """One entry in the full teacher roster — sent to the client so the
    start-of-game slot machine can spin through every possible teacher."""
    image: str
    name: str
    subject: str
    ability: str


class ChairInit(BaseModel):
    id: str
    x: float
    z: float
    yaw: float = 0.0
    heldBy: str | None = None


PickupKind = Literal["medkit", "potion", "compass"]


class PickupInit(BaseModel):
    id: str
    kind: PickupKind
    x: float
    z: float


class LockerInit(BaseModel):
    id: str
    x: float
    z: float
    yaw: float = 0.0
    opened: bool = False
    # Hidden from clients until the locker is opened — server omits this on
    # init so peeking at the packet doesn't reveal item locations.
    has_item: bool = False


class DoorInit(BaseModel):
    id: str
    x: float
    z: float
    # The closed-state yaw of the door's hinge group. Wall direction.
    yaw: float = 0.0
    isOpen: bool = False


class WorldInit(BaseModel):
    type: str = "world_init"
    grid: Grid
    spawn: Spawn
    lights: list[Light] = []
    props: list[Prop] = []
    objectives: list[Objective] = []
    extraction: ExtractionZone
    teachers: list[Teacher] = []
    roster: list[RosterEntry] = []
    chairs: list[ChairInit] = []
    pickups: list[PickupInit] = []
    lockers: list[LockerInit] = []
    doors: list[DoorInit] = []
