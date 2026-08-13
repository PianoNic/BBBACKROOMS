"""Per-lobby objective generation: find items, wipe whiteboards, inspect paintings."""
from __future__ import annotations

import random
import secrets

from app.schemas.world import ItemType, Objective, Prop, Spot
from app.world._quest_items import FALLBACK, ITEMS_BY_ARCHETYPE
from app.world.constants import CELL_SIZE
from app.world.geom import wall_forward
from app.world.layout import Layout

FIND_COUNT = 4

# Per-prop interact-objective config. Each tuple defines a possible quest:
# (prop_type, required_item, template, target_count).
INTERACT_QUESTS: list[tuple[str, ItemType | None, str, int]] = [
    ("whiteboard",      "sponge",       "Wipe {n} whiteboards",              3),
    ("painting",        "eye",          "Inspect {n} paintings",             3),
    ("plant",           "watering_can", "Water {n} plants",                  3),
    ("bulletin_board",  "papers",       "Pin posters on {n} bulletin boards", 2),
    ("fuse_box",        "key",          "Reset {n} fuse boxes",              2),
    ("server_rack",     "hdd",          "Swap HDD in {n} server racks",      4),
    ("aquarium",        None,           "Feed the fish in {n} aquariums",    2),
    ("skeleton",        "eye",          "Inspect {n} anatomy skeletons",     2),
    ("piano",           None,           "Play {n} pianos",                   1),
    ("coffee_machine",  None,           "Brew coffee at {n} machines",       2),
    ("sink",            None,           "Wash your hands at {n} sinks",      3),
    ("printer",         "papers",       "Refill paper in {n} printers",      1),
    ("water_dispenser", None,           "Refill bottles at {n} dispensers",  2),
    ("trophy_case",     "eye",          "Polish {n} trophy cases",           1),
]

# Teamwork quests: the spot only completes while `min_players` living
# players stand inside its radius together (the server clamps the
# requirement to the active player count, so small lobbies stay winnable).
# No item → the client renders the "look here" arrow marker.
COOP_QUESTS: list[tuple[str, str, int, int]] = [
    ("cafeteria_table",  "Flip {n} cafeteria tables — 2 players together",  2, 2),
    ("sofa",             "Move {n} heavy sofas — 2 players together",       2, 2),
    ("vending_machine",  "Tilt {n} vending machines — 2 players together",  2, 2),
    ("bookshelf",        "Search {n} tall bookshelves — 2 players together", 2, 2),
    ("fridge",           "Push {n} fridges aside — 2 players together",     2, 2),
    ("gym_mat",          "Stack {n} gym mats — 2 players together",         2, 2),
]

# Used instead of the {n} template when a quest ends up with a single spot
# (world had fewer matching props than the quest wanted).
SINGULAR_TEXTS: dict[str, str] = {
    "whiteboard": "Wipe the whiteboard",
    "painting": "Inspect the painting",
    "plant": "Water the plant",
    "bulletin_board": "Pin a poster on the bulletin board",
    "fuse_box": "Reset the fuse box",
    "server_rack": "Swap HDD in the server rack",
    "aquarium": "Feed the fish in the aquarium",
    "skeleton": "Inspect the anatomy skeleton",
    "piano": "Play the piano",
    "coffee_machine": "Brew a coffee",
    "sink": "Wash your hands at the sink",
    "printer": "Refill paper in the printer",
    "water_dispenser": "Refill your bottle at the dispenser",
    "trophy_case": "Polish the trophy case",
    "cafeteria_table": "Flip the cafeteria table — 2 players together",
    "sofa": "Move the heavy sofa — 2 players together",
    "vending_machine": "Tilt the vending machine — 2 players together",
    "bookshelf": "Search the tall bookshelf — 2 players together",
    "fridge": "Push the fridge aside — 2 players together",
    "gym_mat": "Carry the gym mat — 2 players together",
}


def _spot(x: float, z: float, yaw: float = 0.0) -> Spot:
    return Spot(x=x, z=z, yaw=yaw, done=False)


def _front_spot(p: Prop, dist: float = 0.9) -> Spot:
    """Spot offset `dist` into the room in front of a wall-mounted prop.

    Painting art renders on the prop's local -z face (placement code rotates
    yaw to point the picture into the room), so the spot offset has to flip
    for paintings. Whiteboards render on local +z and use the default sign.

    Floor props (plants) get a zero offset — the marker hovers directly
    above the prop. The UI anchor is set to the prop's own world position
    at display height so the [E] prompt overlays the prop itself."""
    # Floor/center props: the marker hovers on top of the prop itself,
    # not 0.9m off to one side along its (arbitrary) yaw.
    _FLOOR_ANCHOR_Y = {
        "plant": 1.4, "cafeteria_table": 1.3, "gym_mat": 0.8,
        "piano": 1.5, "skeleton": 1.9, "easel": 1.5,
    }
    if p.type in _FLOOR_ANCHOR_Y:
        return Spot(
            x=p.x, z=p.z, yaw=p.yaw, done=False,
            anchor_x=p.x, anchor_y=_FLOOR_ANCHOR_Y[p.type], anchor_z=p.z,
        )
    # Almost every wall-mounted prop has its visible front on local -Z
    # (the project's wall-prop convention — wall_yaw rotates local -Z
    # into the room). The "in front of prop" direction in world coords
    # is therefore rotate((0,0,-1), yaw) = (-sin yaw, -cos yaw).
    #
    # The lone exception in this set is `server_rack`: its builder flips
    # the front face to local +Z so racks face away from the wall behind
    # them, so for racks the spot goes the opposite way.
    # `wall_forward` returns the standard "into the room" offset (local -Z).
    # `server_rack` flips its front face to local +Z, so for racks we go
    # the opposite direction.
    fx, fz = wall_forward(p.yaw, 1.0)
    if p.type == "server_rack":
        fx, fz = -fx, -fz
    anchor_y = (
        1.95 if p.type == "bulletin_board"
        else 1.7 if p.type == "painting"
        else 1.4 if p.type == "fuse_box"
        else 1.2 if p.type in ("sink", "water_dispenser", "coffee_machine", "printer")
        else 1.5 if p.type in ("aquarium", "trophy_case")
        else 1.6
    )
    return Spot(
        x=p.x + fx * dist, z=p.z + fz * dist, yaw=p.yaw, done=False,
        anchor_x=p.x, anchor_y=anchor_y, anchor_z=p.z,
    )


def _find_objectives(
    layout: Layout, rng: random.Random, count: int = FIND_COUNT,
) -> list[Objective]:
    if not layout.rooms:
        return []
    rooms = list(layout.rooms)
    rng.shuffle(rooms)
    out: list[Objective] = []
    for room in rooms[:count]:
        candidates = ITEMS_BY_ARCHETYPE.get(room.archetype, FALLBACK)
        name, item_type = rng.choice(candidates)
        archetype = room.archetype.replace("_", " ")
        cx = (room.rect.x + room.rect.w / 2) * CELL_SIZE
        cz = (room.rect.y + room.rect.h / 2) * CELL_SIZE
        out.append(
            Objective(
                id=secrets.token_hex(3),
                text=f"Find {name} in a {archetype}",
                interact=False,
                item=item_type,
                spots=[_spot(cx, cz)],
            )
        )
    return out


def _interact_objective(
    props: list[Prop], prop_type: str, item: ItemType | None, text: str,
    count: int, rng: random.Random, min_players: int = 1,
) -> Objective | None:
    matching = [p for p in props if p.type == prop_type]
    if not matching:
        return None
    rng.shuffle(matching)
    chosen = matching[:count]
    # Mark whiteboards picked for this quest so the client only draws
    # scribbles on the ones that actually need wiping.
    if prop_type == "whiteboard":
        for p in chosen:
            p.variant = 1
    spots = [_front_spot(p) for p in chosen]
    if len(spots) == 1 and prop_type in SINGULAR_TEXTS:
        quest_text = SINGULAR_TEXTS[prop_type]
    else:
        quest_text = text.format(n=len(spots))
    return Objective(
        id=secrets.token_hex(3),
        text=quest_text,
        interact=True,
        item=item,
        spots=spots,
        radius=4.5,
        min_players=min_players,
    )


def _casino_objective(props: list[Prop]) -> Objective | None:
    laptops = [p for p in props if p.type == "laptop"]
    if not laptops:
        return None
    spots = [_spot(p.x, p.z) for p in laptops]
    return Objective(
        id=secrets.token_hex(3),
        text=f"Win at all {len(laptops)} casino laptops",
        kind="casino",
        interact=False,
        item=None,
        spots=spots,
        radius=4.0,
    )


def build_objectives(
    layout: Layout, props: list[Prop], rng: random.Random,
    objective_count: int = 6,
) -> list[Objective]:
    """Generate up to `objective_count` non-casino objectives. The casino
    laptop quest is always added on top (it scales with the laptops the
    generator placed, separate from the admin slider)."""
    # Split: a co-op share first (~a third, so at least 20% of the roster
    # is teamwork), then half-ish find, the rest solo interact. All pools
    # cap at their own natural size.
    coop_n = max(1, objective_count // 3)
    solo_n = max(1, objective_count - coop_n)
    find_n = max(1, solo_n // 2)
    interact_n = max(0, solo_n - find_n)

    objectives: list[Objective] = list(_find_objectives(layout, rng, find_n))
    interact_pool = list(INTERACT_QUESTS)
    rng.shuffle(interact_pool)
    added = 0
    for prop_type, item, template, count in interact_pool:
        if added >= interact_n:
            break
        obj = _interact_objective(props, prop_type, item, template, count, rng)
        if obj:
            objectives.append(obj)
            added += 1

    coop_pool = list(COOP_QUESTS)
    rng.shuffle(coop_pool)
    added = 0
    for prop_type, template, count, min_players in coop_pool:
        if added >= coop_n:
            break
        obj = _interact_objective(
            props, prop_type, None, template, count, rng, min_players=min_players,
        )
        if obj:
            objectives.append(obj)
            added += 1

    casino = _casino_objective(props)
    if casino:
        objectives.append(casino)
    return objectives
