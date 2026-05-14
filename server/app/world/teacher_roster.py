"""Static teacher data: the full roster + how many spawn per game.

Pulled out of `teachers.py` so the AI loop module stays a tight, readable
core. Every other module that needs roster info imports it from here."""
from __future__ import annotations


# Each entry: (image filename, display name, subject, ability id).
# Ability ids are referenced by the per-teacher behaviour code; keep them stable.
TEACHER_ROSTER: list[tuple[str, str, str, str]] = [
    # Sport — three of them now throw equipment at students.
    ("Andre-Keller.jpg",        "André Keller",        "Sport",                 "basketball_throw"),
    ("Dillier_Jiaryu.jpg",      "Jirayu Dillier",      "Sport",                 "dodgeball_throw"),
    ("Ralph-Hunziker.jpg",      "Ralph Hunziker",      "Sport",                 "shotput_throw"),
    ("Wojcech-Kozlowski.jpg",   "Wojciech Kozlowski",  "Sport",                 "endurance"),
    # ICT
    ("Birgit-Rieder.jpg",       "Birgit Rieder",       "ICT-Berufe",            "relock_laptop"),
    ("Colic_Nicola.jpg",        "Nicola Colic",        "ICT-Berufe",            "minimap_xray"),
    ("Daniel-Huber.jpg",        "Daniel Huber",        "ICT-Berufe",            "kill_flashlight"),
    ("Stefan-Faehndrich.jpg",   "Stefan Fähndrich",    "ICT-Berufe",            "fake_ping"),
    ("Peter-Schmucki-2.jpg",    "Peter Schmucki",      "ICT-Berufe",            "vent_lockout"),
    ("Schaub_Oliver.jpg",       "Oliver Schaub",       "ICT-Berufe",            "short_teleport"),
    ("Roger-Stellrecht.jpg",    "Roger Stellrecht",    "ICT-Berufe",            "corrupt_tasks"),
    ("Michael-Schneider.jpg",   "Michael Schneider",   "ICT-Berufe",            "silent_steps"),
    ("Tuth_Fabrice.jpg",        "Fabrice Thut",        "ICT-Berufe",            "lights_off"),
    # Berufsmaturität — themed by real subject
    ("Arifaj-Arta.jpg",         "Arta Arifaj",         "Geschichte",            "time_warp"),
    ("Bonaparte_Sylvie.jpg",    "Sylvie Bonaparte",    "Wirtschaft & Recht",    "fine_slow"),
    ("Karl-Sollberger.jpg",     "Karl Sollberger",     "Wirtschaft & Recht",    "lawsuit_stun"),
    ("Gartner_Bettina.jpg",     "Bettina Gartner",     "Mathematik",            "math_popup"),
    ("Mueller_Nicola_klein.jpg","Nicolas Müller",      "Mathematik",            "equation_aura"),
    ("Stefano-La-Rosa.jpg",     "Stefano La Rosa",     "Mathematik",            "geometry_walls"),
    ("Martina-Gersbach.jpg",    "Martina Gersbach",    "Deutsch",               "grammar_blur"),
    ("Marina-Visekruna.jpg",    "Marina Visekruna",    "Französisch",           "french_ui"),
    ("Andreas-Schneider.jpg",   "Andreas Schneider",   "Chemie",                "potion_throw"),
    ("Reto-Hochstrasser.jpg",   "Reto Hochstrasser",   "Geografie",             "room_teleport"),
    # Standalone subjects
    ("Erich-Brugger.jpg",       "Erich Brugger",       "Englisch",              "taunt_shout"),
    ("Felix-Buchenberger.jpg",  "Felix Buchenberger",  "Physik",                "gravity_flip"),
]

# How many teachers spawn per game (sampled from the roster).
TEACHERS_PER_GAME = 3
