from __future__ import annotations

from app.application.queries.get_teacher_roster_query import GetTeacherRosterHandler, GetTeacherRosterQuery
from app.domain.world.teacher_roster import TEACHER_ROSTER, roster_dto


def test_roster_dto_matches_roster_length():
    assert len(roster_dto()) == len(TEACHER_ROSTER)


def test_roster_dto_entry_keys():
    for entry in roster_dto():
        assert set(entry.keys()) == {"image", "name", "subject", "ability"}


def test_roster_dto_first_entry_matches_roster_tuple():
    img, name, subj, ab = TEACHER_ROSTER[0]
    assert roster_dto()[0] == {"image": img, "name": name, "subject": subj, "ability": ab}


async def test_get_teacher_roster_handler_returns_dtos_for_whole_roster():
    handler = GetTeacherRosterHandler(TEACHER_ROSTER)

    result = await handler.handle(GetTeacherRosterQuery())

    assert len(result) == len(TEACHER_ROSTER)
    img, name, subj, ab = TEACHER_ROSTER[0]
    assert result[0].image == img
    assert result[0].name == name
    assert result[0].subject == subj
    assert result[0].ability == ab


async def test_teacher_roster_entry_dto_emitted_keys_in_order():
    handler = GetTeacherRosterHandler(TEACHER_ROSTER)

    result = await handler.handle(GetTeacherRosterQuery())

    assert list(result[0].model_dump().keys()) == ["image", "name", "subject", "ability"]
