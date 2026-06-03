"""Per-archetype "find this item" tables for the quest generator.
The narrative half — what's lost in a teacher room vs. a server room —
lives here so the quest engine stays focused on placement logic."""
from __future__ import annotations

from app.schemas.world import ItemType

ItemEntry = tuple[str, ItemType]

ITEMS_BY_ARCHETYPE: dict[str, list[ItemEntry]] = {
    "classroom": [
        ("lost notebook", "notebook"),
        ("stolen pencil case", "pencil_case"),
        ("missing exam papers", "papers"),
        ("broken calculator", "calculator"),
        ("graffitied textbook", "textbook"),
    ],
    "teacher_room": [
        ("secret memo", "papers"),
        ("Herr Walker's coffee mug", "mug"),
        ("the substitute schedule", "papers"),
        ("the master key", "key"),
        ("a confiscated phone", "phone"),
    ],
    "toilet": [
        ("blocked drain report", "papers"),
        ("missing toilet paper", "toilet_paper"),
        ("the cleaner's gloves", "gloves"),
    ],
    "gym": [
        ("a forgotten phone", "phone"),
        ("a coach's notebook", "notebook"),
        ("a sports textbook", "textbook"),
    ],
    "cafeteria": [
        ("a hijacked coffee mug", "mug"),
        ("an unread envelope", "envelope"),
        ("scattered exam papers", "papers"),
    ],
    "janitor_room": [
        ("the spare master key", "key"),
        ("a damp pair of gloves", "gloves"),
        ("a cleaning report", "papers"),
    ],
    "server_room": [
        ("the admin password note", "papers"),
        ("a stolen laptop charger", "phone"),
        ("the encryption key", "key"),
    ],
}

FALLBACK: list[ItemEntry] = [("a sealed envelope", "envelope")]
