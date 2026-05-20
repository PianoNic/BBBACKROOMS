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
    ("Andre-Keller.jpg",          "André Keller",         "Sport", "basketball_throw"),
    ("Dillier_Jiaryu.jpg",        "Jirayu Dillier",       "Sport", "dodgeball_throw"),
    ("Ralph-Hunziker.jpg",        "Ralph Hunziker",       "Sport", "shotput_throw"),
    ("Wojcech-Kozlowski.jpg",     "Wojciech Kozlowski",   "Sport", "endurance"),
    ("Christensen_Michael.jpg",   "Michael Christensen",  "Sport", "basketball_throw"),
    ("Antonino-Giangreco.jpg",    "Antonino Giangreco",   "Sport", "dodgeball_throw"),
    ("Frei_Mirijam.jpg",          "Mirijam Lavorato",     "Sport", "shotput_throw"),
    ("Moor_Andy.jpg",             "Andy Moor",            "Sport", "endurance"),
    ("Stebler-Nina.jpg",          "Nina Stebler",         "Sport", "basketball_throw"),
    ("Rene-Suter.jpg",            "René Suter",           "Sport", "dodgeball_throw"),
    ("Isabelle_Wuethrich.jpg",    "Isabelle Wüthrich",    "Sport", "shotput_throw"),

    # =========================================================================
    # ICT-Berufe — tech / network / power chaos.
    # =========================================================================
    ("Birgit-Rieder.jpg",         "Birgit Rieder",        "ICT-Berufe", "relock_laptop"),
    ("Colic_Nicola.jpg",          "Nicola Colic",         "ICT-Berufe", "minimap_xray"),
    ("Daniel-Huber.jpg",          "Daniel Huber",         "ICT-Berufe", "kill_flashlight"),
    ("Stefan-Faehndrich.jpg",     "Stefan Fähndrich",     "ICT-Berufe", "fake_ping"),
    ("Peter-Schmucki-2.jpg",      "Peter Schmucki",       "ICT-Berufe", "vent_lockout"),
    ("Schaub_Oliver.jpg",         "Oliver Schaub",        "ICT-Berufe", "short_teleport"),
    ("Roger-Stellrecht.jpg",      "Roger Stellrecht",     "ICT-Berufe", "corrupt_tasks"),
    ("Michael-Schneider.jpg",     "Michael Schneider",    "ICT-Berufe", "silent_steps"),
    ("Tuth_Fabrice.jpg",          "Fabrice Thut",         "ICT-Berufe", "lights_off"),
    ("Manuel-Bachofner.jpg",      "Manuel Bachofner",     "ICT-Berufe", "relock_laptop"),
    ("Brenner_Thomas.jpg",        "Thomas Brenner",       "ICT-Berufe", "minimap_xray"),
    ("Sascha-Fiechter.jpg",       "Sascha Fiechter",      "ICT-Berufe", "kill_flashlight"),
    ("Horoschutin_Eugene.jpg",    "Eugene Horoschutin",   "ICT-Berufe", "fake_ping"),
    ("Lauk_Daniel.jpg",           "Daniel Lauk",          "ICT-Berufe", "vent_lockout"),
    ("Lars-Meyer.jpg",            "Lars Meyer",           "ICT-Berufe", "short_teleport"),
    ("Erich-Mueller.jpg",         "Erich Müller",         "ICT-Berufe", "corrupt_tasks"),
    ("Nuno-Piller.jpg",           "Nuno Piller",          "ICT-Berufe", "silent_steps"),
    ("Rapisarda_Rossella.jpg",    "Rossella Rapisarda",   "ICT-Berufe", "lights_off"),
    ("Marius_Schibli-2.jpg",      "Marius Schibli",       "ICT-Berufe", "relock_laptop"),
    ("Schlatter_Michel.jpg",      "Michel Schlatter",     "ICT-Berufe", "minimap_xray"),
    ("Adrian-Schmid_467-x-700.jpg", "Adrian Schmid",      "ICT-Berufe", "kill_flashlight"),
    ("Senn_Annamaria.jpg",        "Annamaria Senn",       "ICT-Berufe", "fake_ping"),
    ("Benedikt-Sutter-Bonaparte.jpg", "Benedikt Sutter",  "ICT-Berufe", "vent_lockout"),
    ("Ueltschi_Stefan.jpg",       "Stefan Ueltschi",      "ICT-Berufe", "short_teleport"),
    ("Rene-Weidmann.jpg",         "René Weidmann",        "ICT-Berufe", "corrupt_tasks"),
    ("Christian-Witschard.jpg",   "Christian Witschard",  "ICT-Berufe", "silent_steps"),
    ("Zarubica_Sara.jpg",         "Sara Zarubica",        "ICT-Berufe", "lights_off"),
    ("02_Lorena.jpg",             "Lorena Zovkic",        "ICT-Berufe", "relock_laptop"),

    # =========================================================================
    # Berufsmaturität — subject-themed mental tricks.
    # =========================================================================
    ("Arifaj-Arta.jpg",           "Arta Arifaj",          "Geschichte",         "time_warp"),
    ("Bonaparte_Sylvie.jpg",      "Sylvie Bonaparte",     "Wirtschaft & Recht", "fine_slow"),
    ("Karl-Sollberger.jpg",       "Karl Sollberger",      "Wirtschaft & Recht", "lawsuit_stun"),
    ("Gartner_Bettina.jpg",       "Bettina Gartner",      "Mathematik",         "math_popup"),
    ("Mueller_Nicola_klein.jpg",  "Nicolas Müller",       "Mathematik",         "equation_aura"),
    ("Stefano-La-Rosa.jpg",       "Stefano La Rosa",      "Mathematik",         "geometry_walls"),
    ("Martina-Gersbach.jpg",      "Martina Gersbach",     "Deutsch",            "grammar_blur"),
    ("Marina-Visekruna.jpg",      "Marina Visekruna",     "Französisch",        "french_ui"),
    ("Andreas-Schneider.jpg",     "Andreas Schneider",    "Chemie",             "potion_throw"),
    ("Reto-Hochstrasser.jpg",     "Reto Hochstrasser",    "Geografie",          "room_teleport"),
    ("Bucefari_Luana.jpg",        "Luana Bucefari",       "Berufsmaturität",    "time_warp"),
    ("Lea-Felder.jpg",            "Lea Felder",           "Berufsmaturität",    "math_popup"),
    ("Marianne-Frey.jpg",         "Marianne Frey",        "Berufsmaturität",    "equation_aura"),
    ("Gisin-Daniel.jpg",          "Daniel Gisin",         "Berufsmaturität",    "geometry_walls"),
    ("Schuhmacher-Stephanie.jpg", "Stephanie Schumacher", "Berufsmaturität",    "grammar_blur"),
    ("Jasmin-Studerus.jpg",       "Jasmin Studerus",      "Berufsmaturität",    "french_ui"),
    ("Tanner_Pascal-768x1075.jpg", "Pascal Tanner",       "Berufsmaturität",    "math_popup"),
    ("Sacha-Wolf.jpg",            "Sacha Wolf",           "Berufsmaturität",    "fine_slow"),
    ("Zurkinden-Alexander_Klein-1.jpg", "Alexander Zurkinden", "Berufsmaturität", "lawsuit_stun"),

    # =========================================================================
    # Englisch / Physik — standalone subjects.
    # =========================================================================
    ("Erich-Brugger.jpg",         "Erich Brugger",        "Englisch", "taunt_shout"),
    ("Mueller_Inga.jpg",          "Inga Müller",          "Englisch", "taunt_shout"),
    ("Felix-Buchenberger.jpg",    "Felix Buchenberger",   "Physik",   "gravity_flip"),

    # =========================================================================
    # Allgemeinbildung — mixed bag of taunts, blackouts, illusions.
    # =========================================================================
    ("Jacqueline-Amsler.jpg",     "Jacqueline Amsler",    "Allgemeinbildung", "taunt_shout"),
    ("Gerda-Baumgartner.jpg",     "Gerda Baumgartner",    "Allgemeinbildung", "gravity_flip"),
    ("Carla_Bonetti.jpg",         "Carla Bonetti",        "Allgemeinbildung", "fake_ping"),
    ("Boqaj_Barbara.jpg",         "Barbara Boqaj",        "Allgemeinbildung", "corrupt_tasks"),
    ("Brand_Stefan_klein.jpg",    "Stefan Brand",         "Allgemeinbildung", "silent_steps"),
    ("Alain-Burger.jpg",          "Alain Burger",         "Allgemeinbildung", "lights_off"),
    ("Sascha-Deon.jpg",           "Sascha Deon",          "Allgemeinbildung", "kill_flashlight"),
    ("Dragaj_Donika.jpg",         "Donika Dragaj",        "Allgemeinbildung", "math_popup"),
    ("Gatta_Adriana.jpg",         "Adriana Gatta",        "Allgemeinbildung", "taunt_shout"),
    ("Andrea-Graf.jpg",           "Andrea Graf",          "Allgemeinbildung", "gravity_flip"),
    ("Herger_Antonia.jpg",        "Antonia Herger",       "Allgemeinbildung", "fake_ping"),
    ("Laube-Rahel.jpg",           "Rahel Laube",          "Allgemeinbildung", "silent_steps"),
    ("Lier-David.jpg",            "David Lier",           "Allgemeinbildung", "kill_flashlight"),
    ("Carole-Nievergelt.jpg",     "Carole Nievergelt",    "Allgemeinbildung", "math_popup"),
    ("Rexha_Charlotte_klein.jpg", "Charlotte Rexha",      "Allgemeinbildung", "taunt_shout"),
    ("Schmidt_Michael.jpg",       "Matthias Schmidt",     "Allgemeinbildung", "gravity_flip"),
    ("Leonie_von_Kaenel-2.jpg",   "Leonie von Känel",     "Allgemeinbildung", "fake_ping"),
    ("Tanja-Weber_467-x-700.jpg", "Tanja Weber",          "Allgemeinbildung", "corrupt_tasks"),
    ("Larisa_Wick.jpg",           "Larisa Wick-Nussbaum", "Allgemeinbildung", "silent_steps"),
    ("Daniel-Wuest.jpg",          "Daniel Wüst",          "Allgemeinbildung", "kill_flashlight"),

    # =========================================================================
    # Coiffeur / Kosmetik — scissors and makeup blur.
    # =========================================================================
    ("Fabienne-Affolter.jpg",     "Fabienne Affolter",    "Coiffeur",  "scissor_throw"),
    ("Krieg_Michaela_klein.jpg",  "Michaela Weber",       "Coiffeur",  "scissor_throw"),
    ("Widmer_Andrea.jpg",         "Andrea Widmer",        "Coiffeur",  "makeup_blur"),
    ("Guebeli_Kerstin_klein.jpg", "Kerstin Gübeli",       "Kosmetik",  "makeup_blur"),
    ("Manuela-Zerbini.jpg",       "Manuela Zerbini",      "Kosmetik",  "makeup_blur"),

    # =========================================================================
    # Köch / Restaurantfach — plates, hot soup, kitchen chaos.
    # =========================================================================
    ("Thomas_Brunner.jpg",        "Thomas Brunner",       "Koch",           "soup_splash"),
    ("Kuster_Thomas.jpg",         "Thomas Kuster",        "Koch",           "soup_splash"),
    ("Schuhmacher_Werner.jpg",    "Werner Schuhmacher",   "Koch",           "plate_smash"),
    ("Priska-Grob.jpg",           "Priska Grob",          "Restaurantfach", "plate_smash"),
    ("Barbara-Ott.jpg",           "Barbara Ott",          "Restaurantfach", "plate_smash"),

    # =========================================================================
    # Automobil — wrenches and oil slicks.
    # =========================================================================
    ("Thomas-Fischer.jpg",        "Thomas Fischer",       "Automobil", "wrench_throw"),
    ("Matthias-Grossmann.jpg",    "Matthias Grossmann",   "Automobil", "wrench_throw"),
    ("Lea-Hagmann.jpg",           "Lea Hagmann",          "Automobil", "oil_slick"),
    ("Kasper_Markus-1.jpg",       "Markus Kasper",        "Automobil", "wrench_throw"),
    ("Pasqualino-Meo.jpg",        "Pasqualino Meo",       "Automobil", "oil_slick"),
    ("Monsch.jpg",                "Hanspeter Monsch",     "Automobil", "wrench_throw"),
    ("Schniepp-Kim.jpg",          "Kim Schniepp",         "Automobil", "oil_slick"),

    # =========================================================================
    # Polymechanik / Automatik / Elektronik / MEM — wrenches, circuit overloads, gear jams.
    # =========================================================================
    ("Roland-Bacher.jpg",         "Roland Bacher",        "Polymechanik",             "wrench_throw"),
    ("Gilbert-Bernoulli.jpg",     "Gilbert Bernoulli",    "Anlagen- und Apparatebau", "wrench_throw"),
    ("Brunner-Juerg_klein.jpg",   "Jürg Brunner",         "Polymechanik",             "gear_jam"),
    ("Markus-Buntschu.jpg",       "Markus Buntschu",      "Polymechanik",             "wrench_throw"),
    ("Daniel-Fueglistaler.jpg",   "Daniel Füglistaler",   "Automatik",                "circuit_overload"),
    ("Graf_Urs.jpg",              "Urs Graf",             "Automatik",                "circuit_overload"),
    ("Markus-Hacksteiner.jpg",    "Markus Hacksteiner",   "Automatik",                "gear_jam"),
    ("Michel_Heimgartner.jpg",    "Michel Heimgartner",   "Automatik",                "circuit_overload"),
    ("Reto-Kaegi.jpg",            "Reto Kägi",            "Automatik",                "gear_jam"),
    ("Lanz_Jeremy-2.jpg",         "Jeremy Lanz",          "Automatik",                "circuit_overload"),
    ("Leutwyler_Christian-1.jpg", "Christian Leutwyler",  "Automatik",                "gear_jam"),
    ("Marcel-Livers.jpg",         "Marcel Livers",        "Polymechanik",             "wrench_throw"),
    ("Dario-Meier.jpg",           "Dario Meier",          "Automatik",                "circuit_overload"),
    ("Roman-Moser.jpg",           "Roman Moser",          "Automatik",                "gear_jam"),
    ("Hansruedi-Nietlisbach.jpg", "Hansruedi Nietlisbach", "Polymechanik",            "wrench_throw"),
    ("Luca-Piller.jpg",           "Luca Piller",          "Automatik",                "circuit_overload"),
    ("Schmid_Aaron.jpg",          "Aaron Schmid",         "Automatik",                "gear_jam"),
    ("Walker_Thomas.jpg",         "Thomas Walker",        "Polymechanik",             "wrench_throw"),
    ("Wolf_Michael.jpg",          "Michael Wolf",         "Automatik",                "circuit_overload"),
    ("Rolf_Basler-2.jpg",         "Rolf Basler",          "Elektronik",               "circuit_overload"),
    ("Probst-Marius.jpg",         "Marius Probst",        "MEM-Berufe",               "gear_jam"),
    ("Usul_Muarem.jpg",           "Muarem Usul",          "MEM-Berufe",               "wrench_throw"),

    # =========================================================================
    # Strassentransport — truck horns.
    # =========================================================================
    ("Remo-Borioli.jpg",          "Remo Borioli",         "Strassentransport", "truck_horn"),
    ("Gerold-Roeoesli.jpg",       "Gerold Röösli",        "Strassentransport", "truck_horn"),
]

# How many teachers spawn per game (sampled from the roster).
TEACHERS_PER_GAME = 3
