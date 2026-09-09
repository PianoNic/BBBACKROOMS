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
    ("001-Rosmarie-Egger.jpg",       "Rosmarie Egger",       "Sport", "basketball_throw"),
    ("002-Monika-Uehlinger.jpg",     "Monika Uehlinger",     "Sport", "dodgeball_throw"),
    ("003-Kurt-Jauch.jpg",           "Kurt Jauch",           "Sport", "shotput_throw"),
    ("004-Loredana-Furer.jpg",       "Loredana Furer",       "Sport", "endurance"),
    ("005-Alessia-Iseli.jpg",        "Alessia Iseli",        "Sport", "basketball_throw"),
    ("006-Placi-Dubs.jpg",           "Placi Dubs",           "Sport", "dodgeball_throw"),
    ("007-Patrick-Waelti.jpg",       "Patrick Wälti",        "Sport", "shotput_throw"),
    ("008-Dieter-Mueller.jpg",       "Dieter Müller",        "Sport", "endurance"),
    ("009-Dario-Bosshart.jpg",       "Dario Bosshart",       "Sport", "basketball_throw"),
    ("010-Fiorina-Zaeslin.jpg",      "Fiorina Zäslin",       "Sport", "dodgeball_throw"),
    ("011-Stefan-Junker.jpg",        "Stefan Junker",        "Sport", "shotput_throw"),
    # =========================================================================
    # ICT-Berufe — tech / network / power chaos.
    # =========================================================================
    ("012-Esther-Maeder.jpg",        "Esther Mäder",         "ICT-Berufe", "relock_laptop"),
    ("013-Thomas-Diethelm.jpg",      "Thomas Diethelm",      "ICT-Berufe", "minimap_xray"),
    ("014-Anita-Hanselmann.jpg",     "Anita Hanselmann",     "ICT-Berufe", "kill_flashlight"),
    ("015-Priska-Oesch.jpg",         "Priska Oesch",         "ICT-Berufe", "fake_ping"),
    ("016-Konrad-Ruesch.jpg",        "Konrad Ruesch",        "ICT-Berufe", "vent_lockout"),
    ("017-Katja-Naegeli.jpg",        "Katja Nägeli",         "ICT-Berufe", "short_teleport"),
    ("018-Norbert-Odiet.jpg",        "Norbert Odiet",        "ICT-Berufe", "corrupt_tasks"),
    ("019-Svenja-Sailer.jpg",        "Svenja Sailer",        "ICT-Berufe", "silent_steps"),
    ("020-Seraina-Peier.jpg",        "Seraina Peier",        "ICT-Berufe", "lights_off"),
    ("021-Milena-Keller.jpg",        "Milena Keller",        "ICT-Berufe", "relock_laptop"),
    ("022-Selina-Niederer.jpg",      "Selina Niederer",      "ICT-Berufe", "minimap_xray"),
    ("023-Fabienne-Waelti.jpg",      "Fabienne Wälti",       "ICT-Berufe", "kill_flashlight"),
    ("024-Meinrad-Fluri.jpg",        "Meinrad Fluri",        "ICT-Berufe", "fake_ping"),
    ("025-Domenic-Danioth.jpg",      "Domenic Danioth",      "ICT-Berufe", "vent_lockout"),
    ("026-Andres-Meienberg.jpg",     "Andres Meienberg",     "ICT-Berufe", "short_teleport"),
    ("027-Gieri-Zaeslin.jpg",        "Gieri Zäslin",         "ICT-Berufe", "corrupt_tasks"),
    ("028-Hildegard-Danioth.jpg",    "Hildegard Danioth",    "ICT-Berufe", "silent_steps"),
    ("029-Noemi-Kobel.jpg",          "Noemi Kobel",          "ICT-Berufe", "lights_off"),
    ("030-Larissa-Frischherz.jpg",   "Larissa Frischherz",   "ICT-Berufe", "relock_laptop"),
    ("031-Elio-Hafner.jpg",          "Elio Hafner",          "ICT-Berufe", "minimap_xray"),
    ("032-Enrico-Buehler.jpg",       "Enrico Bühler",        "ICT-Berufe", "kill_flashlight"),
    ("033-Rudolf-Baertschi.jpg",     "Rudolf Bärtschi",      "ICT-Berufe", "fake_ping"),
    ("034-Elsbeth-Vogel.jpg",        "Elsbeth Vogel",        "ICT-Berufe", "vent_lockout"),
    ("035-Luzi-Kluser.jpg",          "Luzi Kluser",          "ICT-Berufe", "short_teleport"),
    ("036-Bettina-Jenzer.jpg",       "Bettina Jenzer",       "ICT-Berufe", "corrupt_tasks"),
    ("037-Cornelia-Juchli.jpg",      "Cornelia Juchli",      "ICT-Berufe", "silent_steps"),
    ("038-Franziska-Meyer.jpg",      "Franziska Meyer",      "ICT-Berufe", "lights_off"),
    ("039-Adriana-Rickenbach.jpg",   "Adriana Rickenbach",   "ICT-Berufe", "relock_laptop"),
    # =========================================================================
    # Berufsmaturität — subject-themed mental tricks.
    # =========================================================================
    ("040-Daniela-Baumgartner.jpg",  "Daniela Baumgartner",  "Geschichte", "time_warp"),
    ("041-Roman-Schaub.jpg",         "Roman Schaub",         "Wirtschaft & Recht", "fine_slow"),
    ("042-Fridolin-Tanner.jpg",      "Fridolin Tanner",      "Wirtschaft & Recht", "lawsuit_stun"),
    ("043-Brigitta-Isenring.jpg",    "Brigitta Isenring",    "Mathematik", "math_popup"),
    ("044-Timo-Nussbaumer.jpg",      "Timo Nussbaumer",      "Mathematik", "equation_aura"),
    ("045-Not-Etter.jpg",            "Not Etter",            "Mathematik", "geometry_walls"),
    ("046-Petra-Huber.jpg",          "Petra Huber",          "Deutsch", "grammar_blur"),
    ("047-Janick-Maeder.jpg",        "Janick Mäder",         "Französisch", "french_ui"),
    ("048-Ivan-Frischherz.jpg",      "Ivan Frischherz",      "Chemie", "potion_throw"),
    ("049-Simone-Frei.jpg",          "Simone Frei",          "Geografie", "room_teleport"),
    ("050-Marlis-Wuethrich.jpg",     "Marlis Wüthrich",      "Berufsmaturität", "time_warp"),
    ("051-Michelle-Baechler.jpg",    "Michelle Bächler",     "Berufsmaturität", "math_popup"),
    ("052-Arno-Ebner.jpg",           "Arno Ebner",           "Berufsmaturität", "equation_aura"),
    ("053-Hansueli-Guggisberg.jpg",  "Hansueli Guggisberg",  "Berufsmaturität", "geometry_walls"),
    ("054-Ernst-Peier.jpg",          "Ernst Peier",          "Berufsmaturität", "grammar_blur"),
    ("055-Yanik-Vetsch.jpg",         "Yanik Vetsch",         "Berufsmaturität", "french_ui"),
    ("056-Delphine-Lehmann.jpg",     "Delphine Lehmann",     "Berufsmaturität", "math_popup"),
    ("057-Gertrud-Gerber.jpg",       "Gertrud Gerber",       "Berufsmaturität", "fine_slow"),
    ("058-Fabian-Wehrli.jpg",        "Fabian Wehrli",        "Berufsmaturität", "lawsuit_stun"),
    # =========================================================================
    # Englisch / Physik — standalone subjects.
    # =========================================================================
    ("059-Erika-Ziegler.jpg",        "Erika Ziegler",        "Englisch", "taunt_shout"),
    ("060-Reto-Teuscher.jpg",        "Reto Teuscher",        "Englisch", "taunt_shout"),
    ("061-Alfons-Wenger.jpg",        "Alfons Wenger",        "Physik", "gravity_flip"),
    # =========================================================================
    # Allgemeinbildung — mixed bag of taunts, blackouts, illusions.
    # =========================================================================
    ("062-Trudi-Meli.jpg",           "Trudi Meli",           "Allgemeinbildung", "taunt_shout"),
    ("063-Anton-Wirth.jpg",          "Anton Wirth",          "Allgemeinbildung", "gravity_flip"),
    ("064-Toni-Baer.jpg",            "Toni Baer",            "Allgemeinbildung", "fake_ping"),
    ("065-Cornel-Reber.jpg",         "Cornel Reber",         "Allgemeinbildung", "corrupt_tasks"),
    ("066-Nadine-Loosli.jpg",        "Nadine Loosli",        "Allgemeinbildung", "silent_steps"),
    ("067-Regula-Schaub.jpg",        "Regula Schaub",        "Allgemeinbildung", "lights_off"),
    ("068-Res-Vollmer.jpg",          "Res Vollmer",          "Allgemeinbildung", "kill_flashlight"),
    ("069-Manuela-Tobler.jpg",       "Manuela Tobler",       "Allgemeinbildung", "math_popup"),
    ("070-Aline-Salzmann.jpg",       "Aline Salzmann",       "Allgemeinbildung", "taunt_shout"),
    ("071-Erwin-Graber.jpg",         "Erwin Graber",         "Allgemeinbildung", "gravity_flip"),
    ("072-Marlon-Baumann.jpg",       "Marlon Baumann",       "Allgemeinbildung", "fake_ping"),
    ("073-Chantal-Zwicky.jpg",       "Chantal Zwicky",       "Allgemeinbildung", "silent_steps"),
    ("074-Walter-Portner.jpg",       "Walter Portner",       "Allgemeinbildung", "kill_flashlight"),
    ("075-Andrea-Ulmer.jpg",         "Andrea Ulmer",         "Allgemeinbildung", "math_popup"),
    ("076-Nicole-Volkart.jpg",       "Nicole Volkart",       "Allgemeinbildung", "taunt_shout"),
    ("077-Reinhard-Tobler.jpg",      "Reinhard Tobler",      "Allgemeinbildung", "gravity_flip"),
    ("078-Fritz-Hodler.jpg",         "Fritz Hodler",         "Allgemeinbildung", "fake_ping"),
    ("079-Benno-Salzmann.jpg",       "Benno Salzmann",       "Allgemeinbildung", "corrupt_tasks"),
    ("080-Hansjoerg-Oberli.jpg",     "Hansjoerg Oberli",     "Allgemeinbildung", "silent_steps"),
    ("081-Renata-Rueegg.jpg",        "Renata Rüegg",         "Allgemeinbildung", "kill_flashlight"),
    # =========================================================================
    # Coiffeur / Kosmetik — scissors and makeup blur.
    # =========================================================================
    ("082-Sibylle-Aeppli.jpg",       "Sibylle Äppli",        "Coiffeur", "scissor_throw"),
    ("083-Silvia-Zryd.jpg",          "Silvia Zryd",          "Coiffeur", "scissor_throw"),
    ("084-Gottfried-Vogel.jpg",      "Gottfried Vogel",      "Coiffeur", "makeup_blur"),
    ("085-Marianne-Lienhard.jpg",    "Marianne Lienhard",    "Kosmetik", "makeup_blur"),
    ("086-Melina-Utiger.jpg",        "Melina Utiger",        "Kosmetik", "makeup_blur"),
    # =========================================================================
    # Köch / Restaurantfach — plates, hot soup, kitchen chaos.
    # =========================================================================
    ("087-Andri-Steiner.jpg",        "Andri Steiner",        "Koch", "soup_splash"),
    ("088-Stefanie-Hodler.jpg",      "Stefanie Hodler",      "Koch", "soup_splash"),
    ("089-Verena-Pauli.jpg",         "Verena Pauli",         "Koch", "plate_smash"),
    ("090-Peter-Kaufmann.jpg",       "Peter Kaufmann",       "Restaurantfach", "plate_smash"),
    ("091-Sandra-Odiet.jpg",         "Sandra Odiet",         "Restaurantfach", "plate_smash"),
    # =========================================================================
    # Automobil — wrenches and oil slicks.
    # =========================================================================
    ("092-Annelies-Suter.jpg",       "Annelies Suter",       "Automobil", "wrench_throw"),
    ("093-Nathalie-Herzog.jpg",      "Nathalie Herzog",      "Automobil", "wrench_throw"),
    ("094-Nando-Uehlinger.jpg",      "Nando Uehlinger",      "Automobil", "oil_slick"),
    ("095-Colin-Haefliger.jpg",      "Colin Häfliger",       "Automobil", "wrench_throw"),
    ("096-Beda-Iseli.jpg",           "Beda Iseli",           "Automobil", "oil_slick"),
    ("097-Jost-Gerber.jpg",          "Jost Gerber",          "Automobil", "wrench_throw"),
    ("098-Jasmin-Wenger.jpg",        "Jasmin Wenger",        "Automobil", "oil_slick"),
    # =========================================================================
    # Polymechanik / Automatik / Elektronik / MEM — wrenches, circuit overloads, gear jams.
    # =========================================================================
    ("099-Yolanda-Gugger.jpg",       "Yolanda Gugger",       "Polymechanik", "wrench_throw"),
    ("100-Claudia-Winiger.jpg",      "Claudia Winiger",      "Anlagen- und Apparatebau", "wrench_throw"),
    ("101-Remo-Schaerer.jpg",        "Remo Schärer",         "Polymechanik", "gear_jam"),
    ("102-Corinne-Tanner.jpg",       "Corinne Tanner",       "Polymechanik", "wrench_throw"),
    ("103-Denise-Oberli.jpg",        "Denise Oberli",        "Automatik", "circuit_overload"),
    ("104-Erich-Rickenbach.jpg",     "Erich Rickenbach",     "Automatik", "circuit_overload"),
    ("105-Rahel-Feller.jpg",         "Rahel Feller",         "Automatik", "gear_jam"),
    ("106-Guido-Aemisegger.jpg",     "Guido Aemisegger",     "Automatik", "circuit_overload"),
    ("107-Blasius-Juchli.jpg",       "Blasius Juchli",       "Automatik", "gear_jam"),
    ("108-Werner-Ott.jpg",           "Werner Ott",           "Automatik", "circuit_overload"),
    ("109-Duri-Rytz.jpg",            "Duri Rytz",            "Automatik", "gear_jam"),
    ("110-Alois-Weber.jpg",          "Alois Weber",          "Polymechanik", "wrench_throw"),
    ("111-Marco-Trueb.jpg",          "Marco Trueb",          "Automatik", "circuit_overload"),
    ("112-Gerda-Schneider.jpg",      "Gerda Schneider",      "Automatik", "gear_jam"),
    ("113-Rebekka-Gasche.jpg",       "Rebekka Gasche",       "Polymechanik", "wrench_throw"),
    ("114-Petronella-Vaerst.jpg",    "Petronella Värst",     "Automatik", "circuit_overload"),
    ("115-Severin-Buchser.jpg",      "Severin Buchser",      "Automatik", "gear_jam"),
    ("116-Michael-Christinat.jpg",   "Michael Christinat",   "Polymechanik", "wrench_throw"),
    ("117-Urs-Lanz.jpg",             "Urs Lanz",             "Automatik", "circuit_overload"),
    ("118-Christoph-Kobel.jpg",      "Christoph Kobel",      "Elektronik", "circuit_overload"),
    ("119-Anja-Studer.jpg",          "Anja Studer",          "MEM-Berufe", "gear_jam"),
    ("120-Bernhard-Brunner.jpg",     "Bernhard Brunner",     "MEM-Berufe", "wrench_throw"),
    # =========================================================================
    # Strassentransport — truck horns.
    # =========================================================================
    ("121-Talina-Naef.jpg",          "Talina Naef",          "Strassentransport", "truck_horn"),
    ("122-Fedra-Steiner.jpg",        "Fedra Steiner",        "Strassentransport", "truck_horn"),
]

# How many teachers spawn per game (sampled from the roster).
TEACHERS_PER_GAME = 3


def roster_dto() -> list[dict]:
    return [
        {"image": img, "name": name, "subject": subj, "ability": ab}
        for (img, name, subj, ab) in TEACHER_ROSTER
    ]
