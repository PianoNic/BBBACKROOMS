"""Chair throwing and projectile stepping (issues #38, #46)."""
from __future__ import annotations

import pytest

from app.services import chairs as chairs_svc
from app.domain.world.teachers import TeacherState

from .conftest import add_chair, add_player, make_lobby

TEACHER_TICK_DT = 1.0 / 8   # the rate tick_projectiles is actually driven at


def add_teacher(lobby, tid: str, x: float, z: float) -> TeacherState:
    t = TeacherState.__new__(TeacherState)
    t.id, t.x, t.z, t.stun_until = tid, x, z, 0.0
    lobby.teachers.append(t)
    return t


class TestThrowGuards:
    """#38 — a hidden player cannot launch a chair."""

    async def test_throw_rejected_while_hidden(self):
        lobby = make_lobby()
        me = add_player(lobby, "me", x=0.0, z=0.0)
        add_chair(lobby, "c1", 0.0, 0.0, held_by="me")
        me.hidden_in = "h1"

        await chairs_svc.handle_throw(lobby, me, 1.0, 0.0)

        # A modified client must not be able to bypass the UI guard.
        assert lobby.chair_projectiles == []
        assert lobby.chairs["c1"].held_by == "me"

    async def test_normal_throw_still_works(self):
        lobby = make_lobby()
        me = add_player(lobby, "me", x=0.0, z=0.0)
        add_chair(lobby, "c1", 0.0, 0.0, held_by="me")

        await chairs_svc.handle_throw(lobby, me, 1.0, 0.0)

        assert len(lobby.chair_projectiles) == 1
        assert lobby.chairs["c1"].held_by is None


class TestProjectileSweep:
    """#46 — the chair must not tunnel through a target between ticks.

    A whole tick advances the chair THROW_SPEED / 8 = 1.75 m, twice the
    teacher hit radius, so sampling only the step's end point let throws pass
    straight through. Sub-stepping keeps consecutive samples overlapping.
    """

    async def _throw_past_teacher(self, offset: float, lead: float) -> bool:
        """Throw along +Z from `lead` metres back, `offset` metres to the side.
        Returns whether the teacher at (20, 20) was stunned."""
        lobby = make_lobby()
        me = add_player(lobby, "me", x=20.0 + offset, z=20.0 - lead)
        add_chair(lobby, "c1", me.x, me.z, held_by="me")
        teacher = add_teacher(lobby, "t1", 20.0, 20.0)

        await chairs_svc.handle_throw(lobby, me, 0.0, 1.0)
        for _ in range(20):
            await chairs_svc.tick_projectiles(lobby, TEACHER_TICK_DT)
            if teacher.stun_until > 0.0:
                return True
            if not lobby.chair_projectiles:
                return False
        return False

    # Perpendicular offsets from dead-centre out to just inside the hit radius.
    @pytest.mark.parametrize(
        "offset", [0.0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.8],
    )
    # Varying the launch distance varies the sub-tick phase, which is what
    # decided hit-or-miss before: a throw can start anywhere within a tick.
    @pytest.mark.parametrize("lead", [3.0, 3.39, 3.78, 4.17, 4.43])
    async def test_every_pass_inside_the_hit_radius_connects(self, offset, lead):
        assert offset < chairs_svc.TEACHER_HIT_RADIUS   # guard the parametrization
        assert await self._throw_past_teacher(offset, lead), (
            f"chair passed through the teacher at offset={offset} lead={lead}"
        )

    async def test_clean_miss_outside_the_hit_radius(self):
        # Sub-stepping must not silently widen the hitbox.
        assert not await self._throw_past_teacher(1.6, 3.5)

    async def test_chair_stops_at_a_wall(self):
        lobby = make_lobby()
        me = add_player(lobby, "me", x=20.0, z=20.0)
        add_chair(lobby, "c1", 20.0, 20.0, held_by="me")
        # CELL_SIZE is 2.0, so this blocks the cell the chair flies into.
        lobby.world.grid.block(10, 12)

        await chairs_svc.handle_throw(lobby, me, 0.0, 1.0)
        for _ in range(20):
            await chairs_svc.tick_projectiles(lobby, TEACHER_TICK_DT)
            if not lobby.chair_projectiles:
                break

        chair = lobby.chairs["c1"]
        assert lobby.chair_projectiles == []
        # It must land on the near side of the wall, not inside or past it.
        assert chair.z < 24.0
