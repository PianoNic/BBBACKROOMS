from fastapi import APIRouter, Depends
from mediatorx import Mediator

from app.application.dtos.announcement_dto import AnnouncementDto
from app.application.queries.get_announcements_query import GetAnnouncementsQuery
from app.presentation.controller import controller
from app.presentation.dependencies import get_mediator

router = APIRouter(tags=["announcements"])


@controller(router)
class AnnouncementsController:
    mediator: Mediator = Depends(get_mediator)

    @router.get("/announcements", response_model=list[AnnouncementDto])
    async def get_announcements(self) -> list[AnnouncementDto]:
        return await self.mediator.send(GetAnnouncementsQuery())
