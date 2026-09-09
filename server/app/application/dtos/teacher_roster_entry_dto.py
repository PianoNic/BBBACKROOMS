from pydantic import BaseModel


class TeacherRosterEntryDto(BaseModel):
    image: str
    name: str
    subject: str
    ability: str
