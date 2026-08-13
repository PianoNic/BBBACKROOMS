"""Worldgen invariants (issue #50).

These are property tests rather than golden-output tests: worldgen is random
by design, so pinning exact cell arrays would break on every tuning change
while catching nothing that matters. What matters is that whatever comes out
is *playable* — connected, in bounds, and reproducible from its seed.
"""
from __future__ import annotations

import pytest

from app.world.constants import CELL_SIZE, MAP_SIZES
from app.world.generator import _LAYOUT_BUILDERS, generate

from .worldgen_helpers import cell_of, is_walkable, nearest_walkable, reachable_from

STYLES = sorted(_LAYOUT_BUILDERS)
# A handful of arbitrary but fixed seeds. Fixed so a failure is reproducible;
# several so we are not proving a property about one lucky map.
SEEDS = [1, 7, 12345, 99999]


@pytest.fixture(scope="module")
def world_medium():
    """One representative world, built once — worldgen is not cheap."""
    return generate(seed=4242, width=60, height=60, objective_count=6)


class TestDeterminism:
    """Admins can pin `map_seed` in lobby settings, so identical seed must
    mean identical map — otherwise that setting is a lie."""

    @pytest.mark.parametrize("seed", SEEDS)
    def test_same_seed_gives_an_identical_grid(self, seed):
        a, _ = generate(seed=seed, width=40, height=40, objective_count=4)
        b, _ = generate(seed=seed, width=40, height=40, objective_count=4)
        assert a.grid.cells == b.grid.cells
        assert (a.spawn.x, a.spawn.z) == (b.spawn.x, b.spawn.z)

    def test_same_seed_gives_identical_props_and_objectives(self):
        a, _ = generate(seed=2024, width=40, height=40, objective_count=5)
        b, _ = generate(seed=2024, width=40, height=40, objective_count=5)
        assert [(p.type, p.x, p.z) for p in a.props] == [
            (p.type, p.x, p.z) for p in b.props
        ]
        # Objective ids are random per generation, so compare the shape.
        assert [(o.text, o.kind, len(o.spots)) for o in a.objectives] == [
            (o.text, o.kind, len(o.spots)) for o in b.objectives
        ]

    def test_different_seeds_give_different_maps(self):
        a, _ = generate(seed=1, width=40, height=40, objective_count=4)
        b, _ = generate(seed=2, width=40, height=40, objective_count=4)
        assert a.grid.cells != b.grid.cells


class TestGridInvariants:
    @pytest.mark.parametrize("size", sorted(MAP_SIZES.values()))
    def test_grid_matches_requested_size(self, size):
        world, _ = generate(seed=11, width=size, height=size, objective_count=4)
        assert world.grid.width == size
        assert world.grid.height == size
        assert len(world.grid.cells) == size * size
        assert world.grid.cellSize == CELL_SIZE

    @pytest.mark.parametrize("style", STYLES)
    def test_spawn_is_walkable(self, style):
        world, _ = generate(
            seed=5, width=40, height=40, objective_count=4, style=style,
        )
        cx, cz = cell_of(world.spawn.x, world.spawn.z)
        assert is_walkable(world.grid.cells, 40, 40, cx, cz), (
            f"{style}: players spawn inside a wall"
        )

    def test_generator_rejects_an_unknown_style(self):
        with pytest.raises(KeyError):
            generate(seed=1, width=40, height=40, style="does-not-exist")


class TestConnectivity:
    """An objective the players cannot walk to soft-locks the whole round —
    extraction only opens once every objective is done."""

    @pytest.mark.parametrize("style", STYLES)
    @pytest.mark.parametrize("seed", SEEDS)
    def test_every_objective_spot_is_reachable_from_spawn(self, style, seed):
        size = 40
        world, _ = generate(
            seed=seed, width=size, height=size, objective_count=6, style=style,
        )
        cells = world.grid.cells
        reach = reachable_from(cells, size, size, cell_of(world.spawn.x, world.spawn.z))

        unreachable = []
        for obj in world.objectives:
            for spot in obj.spots:
                cx, cz = cell_of(spot.x, spot.z)
                # Spots sit against props/walls; standing next to one is enough.
                stand = nearest_walkable(cells, size, size, cx, cz)
                if stand is None or stand not in reach:
                    unreachable.append((obj.text, cx, cz))
        assert not unreachable, (
            f"{style}/seed={seed}: unreachable objective spots: {unreachable[:3]}"
        )

    @pytest.mark.parametrize("style", STYLES)
    def test_extraction_zone_is_reachable(self, style):
        size = 40
        world, _ = generate(
            seed=8, width=size, height=size, objective_count=4, style=style,
        )
        cells = world.grid.cells
        reach = reachable_from(cells, size, size, cell_of(world.spawn.x, world.spawn.z))
        cx, cz = cell_of(world.extraction.x, world.extraction.z)
        assert (cx, cz) in reach, f"{style}: nobody can reach extraction"

    @pytest.mark.parametrize("style", STYLES)
    @pytest.mark.parametrize("seed", SEEDS)
    def test_the_walkable_area_is_one_connected_region(self, style, seed):
        """Every walkable cell must be reachable from spawn.

        Isolated pockets are where props and spots go to die — and issue #51
        was exactly this: the hallway layout sealed ~72% of the map behind
        doors that opened onto dead space.
        """
        size = 40
        world, _ = generate(
            seed=seed, width=size, height=size, objective_count=6, style=style,
        )
        cells = world.grid.cells
        walkable = {
            (x, z)
            for z in range(size)
            for x in range(size)
            if is_walkable(cells, size, size, x, z)
        }
        reach = reachable_from(cells, size, size, cell_of(world.spawn.x, world.spawn.z))
        orphans = walkable - reach
        assert not orphans, (
            f"{style}/seed={seed}: {len(orphans)} of {len(walkable)} walkable "
            f"cells are cut off from spawn, e.g. {sorted(orphans)[:5]}"
        )


class TestObjectives:
    @pytest.mark.parametrize("count", [2, 4, 6, 9])
    def test_objective_count_is_honoured(self, count):
        """`objective_count` bounds the *non-casino* objectives. The casino
        laptop quest is always appended on top and scales with the laptops
        the generator placed, independent of the admin slider."""
        world, _ = generate(seed=33, width=60, height=60, objective_count=count)
        non_casino = [o for o in world.objectives if o.kind != "casino"]
        # Pools cap at their natural size, so fewer is fine — more is not.
        assert 0 < len(non_casino) <= count
        assert len([o for o in world.objectives if o.kind == "casino"]) <= 1

    def test_every_objective_has_spots_and_text(self, world_medium):
        world, _ = world_medium
        for obj in world.objectives:
            assert obj.spots, f"objective {obj.text!r} has no spots"
            assert obj.text.strip()
            assert not obj.done
            assert "{n}" not in obj.text, "unformatted quest template leaked out"

    def test_objective_ids_are_unique(self, world_medium):
        world, _ = world_medium
        ids = [o.id for o in world.objectives]
        assert len(ids) == len(set(ids))

    def test_coop_objectives_require_more_than_one_player(self, world_medium):
        world, _ = world_medium
        for obj in world.objectives:
            assert obj.min_players >= 1
            if obj.min_players > 1:
                # Co-op spots are walk-in markers, not press-E prompts.
                assert obj.kind != "casino"


class TestProps:
    def test_props_are_inside_the_map(self, world_medium):
        world, _ = world_medium
        size = world.grid.width
        limit = size * CELL_SIZE
        for p in world.props:
            assert 0.0 <= p.x <= limit, f"{p.type} outside the map on x"
            assert 0.0 <= p.z <= limit, f"{p.type} outside the map on z"

    def test_lights_are_inside_the_map(self, world_medium):
        world, _ = world_medium
        limit = world.grid.width * CELL_SIZE
        for light in world.lights:
            assert 0.0 <= light.x <= limit
            assert 0.0 <= light.z <= limit

    def test_the_world_is_furnished(self, world_medium):
        """Guards against a decorate() regression quietly emptying the school."""
        world, _ = world_medium
        assert len(world.props) > 20
        assert len(world.lights) > 5
