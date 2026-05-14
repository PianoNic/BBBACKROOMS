"""Per-laptop challenge state for Teams/Moodle mini-games.

Each "challenge" game (as opposed to the random-luck casino games) needs
deterministic state baked in at world init: which option is correct, what
distractors to show. This module generates that state once per laptop and
verifies player submissions against it.

Data is pure Python dicts so it can be JSON-serialised into the
`gamble_state` packet without conversion. Keep the schemas stable — the
client reads them by key.
"""
from __future__ import annotations

import random

# Fake course catalogue (BBB Baden style: Mxxx codes).
COURSES: list[tuple[str, str]] = [
    ("Programmieren", "M165"),
    ("Datenbanken", "M162"),
    ("Netzwerke", "M114"),
    ("Webdesign", "M150"),
    ("IT-Security", "M183"),
    ("Algorithmen", "M120"),
    ("Betriebssysteme", "M117"),
    ("Projekte", "M306"),
    ("Multimedia", "M226"),
    ("Mathematik", "BMS-MA"),
    ("Deutsch", "BMS-D"),
    ("Englisch", "BMS-E"),
]

CHANNELS: list[str] = [
    "BM23f - Allgemein", "M165 - Programmieren", "M162 - Datenbanken",
    "M114 - Netzwerke", "M150 - Webdesign", "Klassenrat BM23",
    "Projektgruppe Alpha", "Lehrpersonen BBB",
]

TEACHER_NAMES: list[str] = [
    "Luca Jeanneret", "Roman Winsky", "Sarah Müller", "Tobias Berger",
    "Anna Hofer", "Markus Iten",
]

FILE_NAMES: list[str] = [
    "uebung_1.pdf", "uebung_2.pdf", "loesung.pdf", "skript.pdf",
    "praesentation.pptx", "hausaufgaben.docx", "projektplan.xlsx",
    "richtlinien.pdf", "abschluss.pdf", "kapitel_3.pdf",
    "kapitel_4.pdf", "zusammenfassung.md",
]

# Single-correct-answer DM scenarios. The teacher message is the question,
# `correct` is the only winning reply; distractors come from `wrong`.
DM_SCENARIOS: list[dict] = [
    {
        "question": "Hast du die Hausaufgabe vom Montag schon abgegeben?",
        "correct": "Ja, gestern Abend hochgeladen.",
        "wrong": ["Welche Hausaufgabe?", "Ich war krank.", "Mach ich später."],
    },
    {
        "question": "Wann ist die nächste Prüfung?",
        "correct": "Nächsten Freitag um 08:15.",
        "wrong": ["Keine Ahnung.", "Glaub Montag.", "Steht im Moodle nicht."],
    },
    {
        "question": "Kannst du das Protokoll bitte fertig machen?",
        "correct": "Klar, schicke es heute Abend.",
        "wrong": ["Welches Protokoll?", "Hab keine Zeit.", "Macht doch wer anders."],
    },
    {
        "question": "Bist du morgen im Unterricht?",
        "correct": "Ja, bin da.",
        "wrong": ["Wieso fragen Sie?", "Eher nicht.", "Vielleicht."],
    },
]


def make_challenge(game: str, rng: random.Random) -> dict:
    """Roll the random state for one laptop. Empty dict for casino games."""
    if game == "teams_call":
        return _teams_call(rng)
    if game == "teams_dm":
        return _teams_dm(rng)
    if game == "teams_file":
        return _teams_file(rng)
    if game == "moodle_course":
        return _moodle_course(rng)
    if game == "moodle_file":
        return _moodle_file(rng)
    return {}


def is_correct(game: str, challenge: dict, choice: str | None) -> bool:
    if not challenge or choice is None:
        return False
    return choice == challenge.get("correct")


# --- per-game generators --------------------------------------------------

def _teams_call(rng: random.Random) -> dict:
    picks = rng.sample(CHANNELS, k=4)
    rng.shuffle(picks)
    target = rng.choice(picks)
    # The "live" channel is rendered with a pulsing red dot in the client; the
    # player has to find it among the static channels and click "Beitreten".
    return {
        "channels": picks,
        "correct": target,
        "host": rng.choice(TEACHER_NAMES),
    }


def _teams_dm(rng: random.Random) -> dict:
    scenario = rng.choice(DM_SCENARIOS)
    options = [scenario["correct"], *rng.sample(scenario["wrong"], k=3)]
    rng.shuffle(options)
    return {
        "from": rng.choice(TEACHER_NAMES),
        "question": scenario["question"],
        "options": options,
        "correct": scenario["correct"],
    }


def _teams_file(rng: random.Random) -> dict:
    channel = rng.choice(CHANNELS)
    files = rng.sample(FILE_NAMES, k=5)
    target = rng.choice(files)
    # Hint shown to the player: the file the teacher "asked for".
    return {
        "channel": channel,
        "files": files,
        "correct": target,
        "hint": target,
    }


def _moodle_course(rng: random.Random) -> dict:
    picks = rng.sample(COURSES, k=5)
    target = rng.choice(picks)
    return {
        "courses": [{"name": c[0], "code": c[1]} for c in picks],
        "correct": target[1],
        "hint": target[0],  # player sees: "Find course: Programmieren"
    }


def _moodle_file(rng: random.Random) -> dict:
    course = rng.choice(COURSES)
    files = rng.sample(FILE_NAMES, k=6)
    target = rng.choice(files)
    return {
        "course": {"name": course[0], "code": course[1]},
        "files": files,
        "correct": target,
        "hint": target,
    }
