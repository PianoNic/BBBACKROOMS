"""Orchestrate worldgen: layout -> decorate -> WorldInit."""
from __future__ import annotations

import random

from app.schemas.world import ExtractionZone, Grid, RosterEntry, Spawn, WorldInit
from app.world.constants import CELL_SIZE, DEFAULT_MAP_CELLS
from app.world.decorate import decorate
from app.world.layout import Layout, build_layout
from app.world.layout_bsp import build_layout as build_layout_bsp
from app.world.layout_hallway import build_layout as build_layout_hallway
from app.world.layout_tentacle import build_layout as build_layout_tentacle
from app.world.quests import build_objectives
from app.world.teachers import TEACHER_ROSTER

_LAYOUT_BUILDERS = {
    "baseline": build_layout,
    "hallway": build_layout_hallway,
    "bsp": build_layout_bsp,
    "tentacle": build_layout_tentacle,
}


def generate(
    seed: int | None = None,
    width: int = DEFAULT_MAP_CELLS,
    height: int = DEFAULT_MAP_CELLS,
    objective_count: int = 6,
    style: str = "baseline",
) -> tuple[WorldInit, Layout]:
    rng = random.Random(seed)
    layout = _LAYOUT_BUILDERS[style](rng, width, height)
    lights, props = decorate(layout, rng)
    objectives = build_objectives(layout, props, rng, objective_count)

    hub = layout.atrium or layout.hallways[0]
    cx = (hub.x + hub.w / 2) * CELL_SIZE
    cz = (hub.y + hub.h / 2) * CELL_SIZE
    spawn = Spawn(x=cx, z=cz, yaw=0.0)
    extraction = ExtractionZone(x=cx, z=cz, radius=min(hub.w, hub.h) * CELL_SIZE * 0.3)

    world = WorldInit(
        grid=Grid(width=width, height=height, cellSize=CELL_SIZE, cells=layout.cells),
        spawn=spawn,
        lights=lights,
        props=props,
        objectives=objectives,
        extraction=extraction,
        roster=[
            RosterEntry(image=img, name=name, subject=subject, ability=ability)
            for (img, name, subject, ability) in TEACHER_ROSTER
        ],
    )
    return world, layout
