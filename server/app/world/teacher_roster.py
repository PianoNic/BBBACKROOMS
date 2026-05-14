"""Static teacher data: the full roster + how many spawn per game.

Pulled out of `teachers.py` so the AI loop module stays a tight, readable
core. Every other module that needs roster info imports it from here."""
from __future__ import annotations


# Each entry: (image filename, display name, subject, ability id).
# Ability ids are referenced by the per-teacher behaviour code; keep them stable.
TEACHER_ROSTER: list[tuple[str, str, str, str]] = [
    # Sport — three of them now throw equipment at students.
    ("[removed].jpg",        "[removed]",        "Sport",                 "basketball_throw"),
    ("[removed].jpg",      "[removed]",      "Sport",                 "dodgeball_throw"),
    ("[removed].jpg",      "[removed]",      "Sport",                 "shotput_throw"),
    ("[removed].jpg",   "[removed]",  "Sport",                 "endurance"),
    # ICT
    ("[removed].jpg",       "[removed]",       "ICT-Berufe",            "relock_laptop"),
    ("[removed].jpg",        "[removed]",        "ICT-Berufe",            "minimap_xray"),
    ("[removed].jpg",        "[removed]",        "ICT-Berufe",            "kill_flashlight"),
    ("[removed].jpg",   "[removed]",    "ICT-Berufe",            "fake_ping"),
    ("[removed].jpg",    "[removed]",      "ICT-Berufe",            "vent_lockout"),
    ("[removed].jpg",       "[removed]",       "ICT-Berufe",            "short_teleport"),
    ("[removed].jpg",    "[removed]",    "ICT-Berufe",            "corrupt_tasks"),
    ("[removed].jpg",   "[removed]",   "ICT-Berufe",            "silent_steps"),
    ("[removed].jpg",        "[removed]",        "ICT-Berufe",            "lights_off"),
    # Berufsmaturität — themed by real subject
    ("[removed].jpg",         "[removed]",         "Geschichte",            "time_warp"),
    ("[removed].jpg",    "[removed]",    "Wirtschaft & Recht",    "fine_slow"),
    ("[removed].jpg",     "[removed]",     "Wirtschaft & Recht",    "lawsuit_stun"),
    ("[removed].jpg",     "[removed]",     "Mathematik",            "math_popup"),
[removed]
    ("[removed].jpg",     "[removed]",     "Mathematik",            "geometry_walls"),
    ("[removed].jpg",    "[removed]",    "Deutsch",               "grammar_blur"),
    ("[removed].jpg",    "[removed]",    "Französisch",           "french_ui"),
    ("[removed].jpg",   "[removed]",   "Chemie",                "potion_throw"),
    ("[removed].jpg",   "[removed]",   "Geografie",             "room_teleport"),
    # Standalone subjects
    ("[removed].jpg",       "[removed]",       "Englisch",              "taunt_shout"),
    ("[removed].jpg",  "[removed]",  "Physik",                "gravity_flip"),
]

# How many teachers spawn per game (sampled from the roster).
TEACHERS_PER_GAME = 3
