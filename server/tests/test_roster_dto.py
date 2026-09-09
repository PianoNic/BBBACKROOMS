from __future__ import annotations

from app.world.teacher_roster import TEACHER_ROSTER, roster_dto


def test_roster_dto_matches_roster_length():
    assert len(roster_dto()) == len(TEACHER_ROSTER)


def test_roster_dto_entry_keys():
    for entry in roster_dto():
        assert set(entry.keys()) == {"image", "name", "subject", "ability"}


def test_roster_dto_first_entry_matches_roster_tuple():
    img, name, subj, ab = TEACHER_ROSTER[0]
    assert roster_dto()[0] == {"image": img, "name": name, "subject": subj, "ability": ab}
