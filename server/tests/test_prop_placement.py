"""Prop footprints must not intersect (issue #66).

The occupancy grid already prevents two props reserving the same sub-cells.
What kept going wrong was geometry disagreeing with those reservations — a
prop drawn a quarter-turn off the axes it booked, or positioned somewhere
other than the slot it took. `is_free` then says yes and the meshes clip.

Reuses the detector from `tools/analyze_layout.py` so the diagnostic tool and
the test can never drift apart.
"""
from __future__ import annotations

import pytest

from app.world.generator import _LAYOUT_BUILDERS, generate
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
    from app.schemas.world import Prop
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
