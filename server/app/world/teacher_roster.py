"""Static teacher data: the full roster + how many spawn per game.

Pulled out of `teachers.py` so the AI loop module stays a tight, readable
core. Every other module that needs roster info imports it from here."""
from __future__ import annotations


# Each entry: (image filename, display name, subject, ability id).
# Ability ids are referenced by the per-teacher behaviour code; keep them stable.
# Teachers are grouped by subject; within a group they appear roughly in the
# order they were added.
TEACHER_ROSTER: list[tuple[str, str, str, str]] = [
    # =========================================================================
    # Sport — throw equipment / endurance.
    # =========================================================================
    ("[removed].jpg",          "[removed]",         "Sport", "basketball_throw"),
    ("[removed].jpg",        "[removed]",       "Sport", "dodgeball_throw"),
    ("[removed].jpg",        "[removed]",       "Sport", "shotput_throw"),
    ("[removed].jpg",     "[removed]",   "Sport", "endurance"),
    ("[removed].jpg",   "[removed]",  "Sport", "basketball_throw"),
    ("[removed].jpg",    "[removed]",   "Sport", "dodgeball_throw"),
    ("[removed].jpg",          "[removed]",     "Sport", "shotput_throw"),
    ("[removed].jpg",             "[removed]",            "Sport", "endurance"),
    ("[removed].jpg",          "[removed]",         "Sport", "basketball_throw"),
    ("[removed].jpg",            "[removed]",           "Sport", "dodgeball_throw"),
    ("[removed].jpg",    "[removed]",    "Sport", "shotput_throw"),

    # =========================================================================
    # ICT-Berufe — tech / network / power chaos.
    # =========================================================================
    ("[removed].jpg",         "[removed]",        "ICT-Berufe", "relock_laptop"),
    ("[removed].jpg",          "[removed]",         "ICT-Berufe", "minimap_xray"),
    ("[removed].jpg",          "[removed]",         "ICT-Berufe", "kill_flashlight"),
    ("[removed].jpg",     "[removed]",     "ICT-Berufe", "fake_ping"),
    ("[removed].jpg",      "[removed]",       "ICT-Berufe", "vent_lockout"),
    ("[removed].jpg",         "[removed]",        "ICT-Berufe", "short_teleport"),
    ("[removed].jpg",      "[removed]",     "ICT-Berufe", "corrupt_tasks"),
    ("[removed].jpg",     "[removed]",    "ICT-Berufe", "silent_steps"),
    ("[removed].jpg",          "[removed]",         "ICT-Berufe", "lights_off"),
    ("[removed].jpg",      "[removed]",     "ICT-Berufe", "relock_laptop"),
    ("[removed].jpg",        "[removed]",       "ICT-Berufe", "minimap_xray"),
    ("[removed].jpg",       "[removed]",      "ICT-Berufe", "kill_flashlight"),
    ("[removed].jpg",    "[removed]",   "ICT-Berufe", "fake_ping"),
    ("[removed].jpg",           "[removed]",          "ICT-Berufe", "vent_lockout"),
    ("[removed].jpg",            "[removed]",           "ICT-Berufe", "short_teleport"),
    ("[removed].jpg",         "[removed]",         "ICT-Berufe", "corrupt_tasks"),
    ("[removed].jpg",           "[removed]",          "ICT-Berufe", "silent_steps"),
    ("[removed].jpg",    "[removed]",   "ICT-Berufe", "lights_off"),
    ("[removed].jpg",      "[removed]",       "ICT-Berufe", "relock_laptop"),
    ("[removed].jpg",      "[removed]",     "ICT-Berufe", "minimap_xray"),
    ("[removed].jpg", "[removed]",      "ICT-Berufe", "kill_flashlight"),
    ("[removed].jpg",        "[removed]",       "ICT-Berufe", "fake_ping"),
    ("[removed].jpg", "[removed]",  "ICT-Berufe", "vent_lockout"),
    ("[removed].jpg",       "[removed]",      "ICT-Berufe", "short_teleport"),
    ("[removed].jpg",         "[removed]",        "ICT-Berufe", "corrupt_tasks"),
    ("[removed].jpg",   "[removed]",  "ICT-Berufe", "silent_steps"),
    ("[removed].jpg",         "[removed]",        "ICT-Berufe", "lights_off"),
    ("[removed].jpg",             "[removed]",        "ICT-Berufe", "relock_laptop"),

    # =========================================================================
    # Berufsmaturität — subject-themed mental tricks.
    # =========================================================================
    ("[removed].jpg",           "[removed]",          "Geschichte",         "time_warp"),
    ("[removed].jpg",      "[removed]",     "Wirtschaft & Recht", "fine_slow"),
    ("[removed].jpg",       "[removed]",      "Wirtschaft & Recht", "lawsuit_stun"),
    ("[removed].jpg",       "[removed]",      "Mathematik",         "math_popup"),
    ("[removed].jpg",  "[removed]",       "Mathematik",         "equation_aura"),
    ("[removed].jpg",       "[removed]",      "Mathematik",         "geometry_walls"),
    ("[removed].jpg",      "[removed]",     "Deutsch",            "grammar_blur"),
    ("[removed].jpg",      "[removed]",     "Französisch",        "french_ui"),
    ("[removed].jpg",     "[removed]",    "Chemie",             "potion_throw"),
    ("[removed].jpg",     "[removed]",    "Geografie",          "room_teleport"),
    ("[removed].jpg",        "[removed]",       "Berufsmaturität",    "time_warp"),
    ("[removed].jpg",            "[removed]",           "Berufsmaturität",    "math_popup"),
    ("[removed].jpg",         "[removed]",        "Berufsmaturität",    "equation_aura"),
    ("[removed].jpg",          "[removed]",         "Berufsmaturität",    "geometry_walls"),
    ("[removed].jpg", "[removed]", "Berufsmaturität",    "grammar_blur"),
    ("[removed].jpg",       "[removed]",      "Berufsmaturität",    "french_ui"),
    ("[removed].jpg", "[removed]",       "Berufsmaturität",    "math_popup"),
    ("[removed].jpg",            "[removed]",           "Berufsmaturität",    "fine_slow"),
    ("[removed].jpg", "[removed]", "Berufsmaturität", "lawsuit_stun"),

    # =========================================================================
    # Englisch / Physik — standalone subjects.
    # =========================================================================
    ("[removed].jpg",         "[removed]",        "Englisch", "taunt_shout"),
    ("[removed].jpg",          "[removed]",          "Englisch", "taunt_shout"),
    ("[removed].jpg",    "[removed]",   "Physik",   "gravity_flip"),

    # =========================================================================
    # Allgemeinbildung — mixed bag of taunts, blackouts, illusions.
    # =========================================================================
    ("[removed].jpg",     "[removed]",    "Allgemeinbildung", "taunt_shout"),
    ("[removed].jpg",     "[removed]",    "Allgemeinbildung", "gravity_flip"),
    ("[removed].jpg",         "[removed]",        "Allgemeinbildung", "fake_ping"),
    ("[removed].jpg",         "[removed]",        "Allgemeinbildung", "corrupt_tasks"),
    ("[removed].jpg",    "[removed]",         "Allgemeinbildung", "silent_steps"),
    ("[removed].jpg",          "[removed]",         "Allgemeinbildung", "lights_off"),
    ("[removed].jpg",           "[removed]",          "Allgemeinbildung", "kill_flashlight"),
    ("[removed].jpg",         "[removed]",        "Allgemeinbildung", "math_popup"),
    ("[removed].jpg",         "[removed]",        "Allgemeinbildung", "taunt_shout"),
    ("[removed].jpg",           "[removed]",          "Allgemeinbildung", "gravity_flip"),
    ("[removed].jpg",        "[removed]",       "Allgemeinbildung", "fake_ping"),
    ("[removed].jpg",           "[removed]",          "Allgemeinbildung", "silent_steps"),
    ("[removed].jpg",            "[removed]",           "Allgemeinbildung", "kill_flashlight"),
    ("[removed].jpg",     "[removed]",    "Allgemeinbildung", "math_popup"),
    ("[removed].jpg", "[removed]",      "Allgemeinbildung", "taunt_shout"),
    ("[removed].jpg",       "[removed]",     "Allgemeinbildung", "gravity_flip"),
    ("[removed].jpg",   "[removed]",     "Allgemeinbildung", "fake_ping"),
    ("[removed].jpg", "[removed]",          "Allgemeinbildung", "corrupt_tasks"),
    ("[removed].jpg",           "[removed]", "Allgemeinbildung", "silent_steps"),
    ("[removed].jpg",          "[removed]",          "Allgemeinbildung", "kill_flashlight"),

    # =========================================================================
    # Coiffeur / Kosmetik — scissors and makeup blur.
    # =========================================================================
    ("[removed].jpg",     "[removed]",    "Coiffeur",  "scissor_throw"),
    ("[removed].jpg",  "[removed]",       "Coiffeur",  "scissor_throw"),
    ("[removed].jpg",         "[removed]",        "Coiffeur",  "makeup_blur"),
    ("[removed].jpg", "[removed]",       "Kosmetik",  "makeup_blur"),
    ("[removed].jpg",       "[removed]",      "Kosmetik",  "makeup_blur"),

    # =========================================================================
    # Köch / Restaurantfach — plates, hot soup, kitchen chaos.
    # =========================================================================
    ("[removed].jpg",        "[removed]",       "Koch",           "soup_splash"),
    ("[removed].jpg",         "[removed]",        "Koch",           "soup_splash"),
    ("[removed].jpg",    "[removed]",   "Koch",           "plate_smash"),
    ("[removed].jpg",           "[removed]",          "Restaurantfach", "plate_smash"),
    ("[removed].jpg",           "[removed]",          "Restaurantfach", "plate_smash"),

    # =========================================================================
    # Automobil — wrenches and oil slicks.
    # =========================================================================
    ("[removed].jpg",        "[removed]",       "Automobil", "wrench_throw"),
    ("[removed].jpg",    "[removed]",   "Automobil", "wrench_throw"),
    ("[removed].jpg",           "[removed]",          "Automobil", "oil_slick"),
    ("[removed].jpg",       "[removed]",        "Automobil", "wrench_throw"),
    ("[removed].jpg",        "[removed]",       "Automobil", "oil_slick"),
    ("[removed].jpg",                "[removed]",     "Automobil", "wrench_throw"),
    ("[removed].jpg",          "[removed]",         "Automobil", "oil_slick"),

    # =========================================================================
    # Polymechanik / Automatik / Elektronik / MEM — wrenches, circuit overloads, gear jams.
    # =========================================================================
    ("[removed].jpg",         "[removed]",        "Polymechanik",             "wrench_throw"),
    ("[removed].jpg",     "[removed]",    "Anlagen- und Apparatebau", "wrench_throw"),
    ("[removed].jpg",   "[removed]",         "Polymechanik",             "gear_jam"),
    ("[removed].jpg",       "[removed]",      "Polymechanik",             "wrench_throw"),
    ("[removed].jpg",   "[removed]",   "Automatik",                "circuit_overload"),
    ("[removed].jpg",              "[removed]",             "Automatik",                "circuit_overload"),
    ("[removed].jpg",    "[removed]",   "Automatik",                "gear_jam"),
    ("[removed].jpg",    "[removed]",   "Automatik",                "circuit_overload"),
    ("[removed].jpg",            "[removed]",            "Automatik",                "gear_jam"),
    ("[removed].jpg",         "[removed]",          "Automatik",                "circuit_overload"),
    ("[removed].jpg", "[removed]",  "Automatik",                "gear_jam"),
    ("[removed].jpg",         "[removed]",        "Polymechanik",             "wrench_throw"),
    ("[removed].jpg",           "[removed]",          "Automatik",                "circuit_overload"),
    ("[removed].jpg",           "[removed]",          "Automatik",                "gear_jam"),
    ("[removed].jpg", "[removed]", "Polymechanik",            "wrench_throw"),
    ("[removed].jpg",           "[removed]",          "Automatik",                "circuit_overload"),
    ("[removed].jpg",          "[removed]",         "Automatik",                "gear_jam"),
    ("[removed].jpg",         "[removed]",        "Polymechanik",             "wrench_throw"),
    ("[removed].jpg",          "[removed]",         "Automatik",                "circuit_overload"),
    ("[removed].jpg",         "[removed]",          "Elektronik",               "circuit_overload"),
    ("[removed].jpg",         "[removed]",        "MEM-Berufe",               "gear_jam"),
    ("[removed].jpg",           "[removed]",          "MEM-Berufe",               "wrench_throw"),

    # =========================================================================
    # Strassentransport — truck horns.
    # =========================================================================
    ("[removed].jpg",          "[removed]",         "Strassentransport", "truck_horn"),
    ("[removed].jpg",       "[removed]",        "Strassentransport", "truck_horn"),
]

# How many teachers spawn per game (sampled from the roster).
TEACHERS_PER_GAME = 3
