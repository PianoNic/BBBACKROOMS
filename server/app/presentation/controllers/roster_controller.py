from fastapi import APIRouter, Depends
from mediatorx import Mediator

from app.application.dtos.teacher_roster_entry_dto import TeacherRosterEntryDto
from app.application.queries.get_teacher_roster_query import GetTeacherRosterQuery
from app.presentation.controller import controller
from app.presentation.dependencies import get_mediator

router = APIRouter(tags=["roster"])


@controller(router)
class RosterController:
    mediator: Mediator = Depends(get_mediator)

    @router.get("/roster", response_model=list[TeacherRosterEntryDto])
    async def get_roster(self) -> list[TeacherRosterEntryDto]:
        return await self.mediator.send(GetTeacherRosterQuery())
