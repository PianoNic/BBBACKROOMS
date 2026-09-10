"""Prop footprints must not intersect (issue #66).

The occupancy grid already prevents two props reserving the same sub-cells.
What kept going wrong was geometry disagreeing with those reservations — a
prop drawn a quarter-turn off the axes it booked, or positioned somewhere
other than the slot it took. `is_free` then says yes and the meshes clip.

Reuses the detector from `tools/analyze_layout.py` so the diagnostic tool and
the test can never drift apart.
"""
from __future__ import annotations

import random

import pytest

from app.domain.world.generator import _LAYOUT_BUILDERS, generate
from app.domain.world.layout import Rect, Room
from app.domain.world.prop_specs import get as get_spec
from app.domain.world.room_grid import RoomGrid
from app.domain.world.room_patterns import _place_back_centred, place_paired
from tools.analyze_layout import _overlaps

STYLES = sorted(_LAYOUT_BUILDERS)


@pytest.mark.parametrize("style", STYLES)
@pytest.mark.parametrize("seed", [1, 7, 12345])
def test_no_prop_footprints_intersect(style, seed):
    world, _ = generate(
        seed=seed, width=60, height=60, objective_count=6, style=style,
    )
    found = _overlaps(world.props)
    assert not found, (
        f"{style}/seed={seed}: {sum(found.values())} overlapping pairs "
        f"out of {len(world.props)} props — {found.most_common(5)}"
    )


@pytest.mark.parametrize("size", [40, 120])
def test_no_overlaps_at_other_map_sizes(size):
    world, _ = generate(seed=3, width=size, height=size, objective_count=6)
    found = _overlaps(world.props)
    assert not found, f"size {size}: {found.most_common(5)}"


def test_the_detector_ignores_legitimate_stacking():
    """A microwave is supposed to sit inside its counter's footprint — if the
    detector flagged that, the tests above would pass for the wrong reason."""
    from app.application.dtos.world import Prop
    from tools.analyze_layout import _stacking_pair

    assert _stacking_pair("microwave", "counter")
    assert not _stacking_pair("gym_mat", "gym_mat")

    stacked = [
        Prop(type="counter", x=10.0, z=10.0, yaw=0.0),
        Prop(type="microwave", x=10.0, z=10.0, yaw=0.0),
    ]
    assert not _overlaps(stacked)

    collided = [
        Prop(type="gym_mat", x=10.0, z=10.0, yaw=0.0),
        Prop(type="gym_mat", x=10.2, z=10.0, yaw=0.0),
    ]
    assert _overlaps(collided)


def _teacher_room_grid(width_cells: int, depth_cells: int) -> RoomGrid:
    room = Room(
        rect=Rect(x=0, y=0, w=width_cells, h=depth_cells),
        archetype="teacher_room", front_dir="S",
    )
    return RoomGrid(room)


def test_place_paired_puts_chair_behind_desk():
    """No chair in front of its desk (issue #144): the chair must always
    land between the desk and the back wall, never toward the door."""
    desk_spec = get_spec("desk")
    chair_spec = get_spec("chair")

    grid = _teacher_room_grid(4, 6)
    primary, partner = place_paired(
        grid, "desk", desk_spec, "chair", chair_spec, random.Random(424242),
    )
    assert primary is not None
    assert partner is not None
    desk_res = next(r for r in grid.reservations if r[0] == "desk")
    chair_res = next(r for r in grid.reservations if r[0] == "chair")
    assert chair_res[2] > desk_res[2]


def test_place_paired_returns_no_chair_when_the_desk_leaves_no_room_behind():
    """When the space behind the desk isn't free, `place_paired` must
    leave the chair out entirely rather than falling back to a slot in
    front of the desk (the old behaviour that caused issue #144)."""
    desk_spec = get_spec("desk")
    chair_spec = get_spec("chair")
    _, chair_out = chair_spec.footprint

    scout = _teacher_room_grid(4, 6)
    _place_back_centred(scout, "desk", desk_spec)
    _, _, pd, _, psd, _ = scout.reservations[-1]
    behind_d = pd + psd

    blocked = _teacher_room_grid(4, 6)
    for d in range(behind_d, behind_d + chair_out):
        if 0 <= d < blocked.d_cells:
            blocked.mark("floor", 0, d, blocked.w_cells, 1)

    primary, partner = place_paired(
        blocked, "desk", desk_spec, "chair", chair_spec, random.Random(1),
    )
    assert primary is not None
    assert partner is None
    assert not any(r[0] == "chair" for r in blocked.reservations)
