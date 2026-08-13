"""Teacher spawn placement (issue #50)."""
from __future__ import annotations

import random

from app.world.constants import CELL_SIZE
from app.world.generator import generate
from app.world.teacher_roster import TEACHER_ROSTER, TEACHERS_PER_GAME
from app.world.teacher_spawn import spawn_teachers

from .worldgen_helpers import cell_of, is_walkable, reachable_from

SIZE = 40


def a_world():
    return generate(seed=101, width=SIZE, height=SIZE, objective_count=4)


def spawn(world, layout, selected=None, seed=3):
    return spawn_teachers(
        world.grid.cells,
        rng=random.Random(seed),
        selected_images=selected,
        width=SIZE, height=SIZE,
        avoid_x=world.spawn.x, avoid_z=world.spawn.z,
        atrium=layout.atrium,
    )


class TestPlacement:
    def test_spawns_the_expected_number_of_teachers(self):
        world, layout = a_world()
        assert len(spawn(world, layout)) == TEACHERS_PER_GAME

    def test_every_teacher_lands_on_a_walkable_cell(self):
        world, layout = a_world()
        cells = world.grid.cells
        for t in spawn(world, layout):
            cx, cz = cell_of(t.x, t.z)
            assert is_walkable(cells, SIZE, SIZE, cx, cz), (
                f"teacher {t.name} spawned inside a wall at ({cx}, {cz})"
            )

    def test_every_teacher_can_reach_the_players(self):
        """A teacher sealed in a side pocket is a teacher that never hunts."""
        world, layout = a_world()
        cells = world.grid.cells
        reach = reachable_from(cells, SIZE, SIZE, cell_of(world.spawn.x, world.spawn.z))
        for t in spawn(world, layout):
            assert cell_of(t.x, t.z) in reach, f"{t.name} cannot reach the spawn area"

    def test_teachers_start_away_from_the_player_spawn(self):
        world, layout = a_world()
        for t in spawn(world, layout):
            dist = ((t.x - world.spawn.x) ** 2 + (t.z - world.spawn.z) ** 2) ** 0.5
            # Placement maximises quadrant distance; a teacher on top of the
            # spawn would kill players during the start-grace reveal.
            assert dist > 4 * CELL_SIZE, f"{t.name} spawned {dist:.1f}m from players"

    def test_teachers_start_unstunned_and_parked_on_their_own_position(self):
        world, layout = a_world()
        for t in spawn(world, layout):
            assert t.stun_until == 0.0
            assert (t.tx, t.tz) == (t.x, t.z)


class TestRoster:
    def test_ids_are_unique(self):
        world, layout = a_world()
        ids = [t.id for t in spawn(world, layout)]
        assert len(ids) == len(set(ids))

    def test_selected_images_are_respected(self):
        world, layout = a_world()
        picked = [TEACHER_ROSTER[0][0], TEACHER_ROSTER[1][0]]
        for t in spawn(world, layout, selected=picked):
            assert t.image in picked

    def test_a_single_selected_teacher_fills_every_slot(self):
        """Fewer picks than slots is allowed — the pool is sampled with
        replacement so the same teacher can appear more than once."""
        world, layout = a_world()
        only = [TEACHER_ROSTER[2][0]]
        teachers = spawn(world, layout, selected=only)
        assert len(teachers) == TEACHERS_PER_GAME
        assert {t.image for t in teachers} == {only[0]}

    def test_an_unknown_selection_falls_back_to_the_full_roster(self):
        world, layout = a_world()
        teachers = spawn(world, layout, selected=["not-a-teacher.jpg"])
        assert len(teachers) == TEACHERS_PER_GAME
        known = {r[0] for r in TEACHER_ROSTER}
        assert all(t.image in known for t in teachers)

    def test_every_teacher_has_an_ability(self):
        world, layout = a_world()
        for t in spawn(world, layout):
            assert t.ability
