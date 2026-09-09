from dataclasses import dataclass

from mediatorx import IQuery, IQueryHandler

from app.application.dtos.teacher_roster_entry_dto import TeacherRosterEntryDto


@dataclass
class GetTeacherRosterQuery(IQuery[list[TeacherRosterEntryDto]]):
    pass


class GetTeacherRosterHandler(IQueryHandler[GetTeacherRosterQuery, list[TeacherRosterEntryDto]]):
    def __init__(self, roster: list[tuple[str, str, str, str]]) -> None:
        self._roster = roster

    async def handle(self, query: GetTeacherRosterQuery) -> list[TeacherRosterEntryDto]:
        return [
            TeacherRosterEntryDto(image=img, name=name, subject=subj, ability=ab)
            for (img, name, subj, ab) in self._roster
        ]
