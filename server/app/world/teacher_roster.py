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
    ("001-Yasmin-Caduff.jpg",        "Yasmin Caduff",        "Sport", "basketball_throw"),
    ("002-Matteo-Rohrer.jpg",        "Matteo Rohrer",        "Sport", "dodgeball_throw"),
    ("003-Ladina-Wettstein.jpg",     "Ladina Wettstein",     "Sport", "shotput_throw"),
    ("004-Ueli-Ottiger.jpg",         "Ueli Ottiger",         "Sport", "endurance"),
    ("005-Nadja-Fassler.jpg",        "Nadja Fässler",        "Sport", "basketball_throw"),
    ("006-Jonas-Inderbitzin.jpg",    "Jonas Inderbitzin",    "Sport", "dodgeball_throw"),
    ("007-Oskar-Amstutz.jpg",        "Oskar Amstutz",        "Sport", "shotput_throw"),
    ("008-Ylenia-Marti.jpg",         "Ylenia Marti",         "Sport", "endurance"),
    ("009-Kaspar-Kessler.jpg",       "Kaspar Kessler",       "Sport", "basketball_throw"),
    ("010-Georg-Gschwend.jpg",       "Georg Gschwend",       "Sport", "dodgeball_throw"),
    ("011-Zita-Raber.jpg",           "Zita Räber",           "Sport", "shotput_throw"),
    # =========================================================================
    # ICT-Berufe — tech / network / power chaos.
    # =========================================================================
    ("012-Wendelin-Gantenbein.jpg",  "Wendelin Gantenbein",  "ICT-Berufe", "relock_laptop"),
    ("013-Klara-Krummenacher.jpg",   "Klara Krummenacher",   "ICT-Berufe", "minimap_xray"),
    ("014-Doris-Bahler.jpg",         "Doris Bähler",         "ICT-Berufe", "kill_flashlight"),
    ("015-Anouk-Lustenberger.jpg",   "Anouk Lustenberger",   "ICT-Berufe", "fake_ping"),
    ("016-Bianca-Erni.jpg",          "Bianca Erni",          "ICT-Berufe", "vent_lockout"),
    ("017-Cora-Kohler.jpg",          "Cora Kohler",          "ICT-Berufe", "short_teleport"),
    ("018-Paula-Wuest.jpg",          "Paula Wüest",          "ICT-Berufe", "corrupt_tasks"),
    ("019-Tessa-Casanova.jpg",       "Tessa Casanova",       "ICT-Berufe", "silent_steps"),
    ("020-Tilda-Christen.jpg",       "Tilda Christen",       "ICT-Berufe", "lights_off"),
    ("021-Wilfried-Odermatt.jpg",    "Wilfried Odermatt",    "ICT-Berufe", "relock_laptop"),
    ("022-Hugo-Oberholzer.jpg",      "Hugo Oberholzer",      "ICT-Berufe", "minimap_xray"),
    ("023-Juna-Trachsel.jpg",        "Juna Trachsel",        "ICT-Berufe", "kill_flashlight"),
    ("024-Sami-Jung.jpg",            "Sämi Jung",            "ICT-Berufe", "fake_ping"),
    ("025-Selma-Wirz.jpg",           "Selma Wirz",           "ICT-Berufe", "vent_lockout"),
    ("026-Vito-Gruter.jpg",          "Vito Grüter",          "ICT-Berufe", "short_teleport"),
    ("027-Heidi-Tschudi.jpg",        "Heidi Tschudi",        "ICT-Berufe", "corrupt_tasks"),
    ("028-Valentin-Eugster.jpg",     "Valentin Eugster",     "ICT-Berufe", "silent_steps"),
    ("029-Jakob-Gubler.jpg",         "Jakob Gubler",         "ICT-Berufe", "lights_off"),
    ("030-Elias-Vonlanthen.jpg",     "Elias Vonlanthen",     "ICT-Berufe", "relock_laptop"),
    ("031-Gian-Pfister.jpg",         "Gian Pfister",         "ICT-Berufe", "minimap_xray"),
    ("032-Karin-Zbinden.jpg",        "Karin Zbinden",        "ICT-Berufe", "kill_flashlight"),
    ("033-Zacharias-Meili.jpg",      "Zacharias Meili",      "ICT-Berufe", "fake_ping"),
    ("034-Basil-Hasler.jpg",         "Basil Hasler",         "ICT-Berufe", "vent_lockout"),
    ("035-Levin-Ulrich.jpg",         "Levin Ulrich",         "ICT-Berufe", "short_teleport"),
    ("036-Nora-Ochsner.jpg",         "Nora Ochsner",         "ICT-Berufe", "corrupt_tasks"),
    ("037-Yara-Kunz.jpg",            "Yara Kunz",            "ICT-Berufe", "silent_steps"),
    ("038-Tobias-Thalmann.jpg",      "Tobias Thalmann",      "ICT-Berufe", "lights_off"),
    ("039-Yannik-Dorig.jpg",         "Yannik Dörig",         "ICT-Berufe", "relock_laptop"),
    # =========================================================================
    # Berufsmaturität — subject-themed mental tricks.
    # =========================================================================
    ("040-Irma-Leuenberger.jpg",     "Irma Leuenberger",     "Geschichte", "time_warp"),
    ("041-Ivo-Peyer.jpg",            "Ivo Peyer",            "Wirtschaft & Recht", "fine_slow"),
    ("042-Jules-Scheidegger.jpg",    "Jules Scheidegger",    "Wirtschaft & Recht", "lawsuit_stun"),
    ("043-Xenia-Blaser.jpg",         "Xenia Blaser",         "Mathematik", "math_popup"),
    ("044-Curdin-Fankhauser.jpg",    "Curdin Fankhauser",    "Mathematik", "equation_aura"),
    ("045-Sina-Wyss.jpg",            "Sina Wyss",            "Mathematik", "geometry_walls"),
    ("046-Celine-Portmann.jpg",      "Céline Portmann",      "Deutsch", "grammar_blur"),
    ("047-Wilma-Aebi.jpg",           "Wilma Aebi",           "Französisch", "french_ui"),
    ("048-Ronja-Eichenberger.jpg",   "Ronja Eichenberger",   "Chemie", "potion_throw"),
    ("049-Dunja-Frischknecht.jpg",   "Dunja Frischknecht",   "Geografie", "room_teleport"),
    ("050-Thea-Vetterli.jpg",        "Thea Vetterli",        "Berufsmaturität", "time_warp"),
    ("051-Livia-Lotscher.jpg",       "Livia Lötscher",       "Berufsmaturität", "math_popup"),
    ("052-Vera-Zehnder.jpg",         "Vera Zehnder",         "Berufsmaturität", "equation_aura"),
    ("053-Orell-Elmiger.jpg",        "Orell Elmiger",        "Berufsmaturität", "geometry_walls"),
    ("054-Uma-Rieser.jpg",           "Uma Rieser",           "Berufsmaturität", "grammar_blur"),
    ("055-Frida-Zgraggen.jpg",       "Frida Zgraggen",       "Berufsmaturität", "french_ui"),
    ("056-Samuel-Zimmerli.jpg",      "Samuel Zimmerli",      "Berufsmaturität", "math_popup"),
    ("057-Odile-Sigrist.jpg",        "Odile Sigrist",        "Berufsmaturität", "fine_slow"),
    ("058-Corsin-Gasser.jpg",        "Corsin Gasser",        "Berufsmaturität", "lawsuit_stun"),
    # =========================================================================
    # Englisch / Physik — standalone subjects.
    # =========================================================================
    ("059-Moritz-Jaggi.jpg",         "Moritz Jäggi",         "Englisch", "taunt_shout"),
    ("060-Elsa-Isler.jpg",           "Elsa Isler",           "Englisch", "taunt_shout"),
    ("061-Pepe-Zaugg.jpg",           "Pepe Zaugg",           "Physik", "gravity_flip"),
    # =========================================================================
    # Allgemeinbildung — mixed bag of taunts, blackouts, illusions.
    # =========================================================================
    ("062-Emil-Kalin.jpg",           "Emil Kälin",           "Allgemeinbildung", "taunt_shout"),
    ("063-Enzo-Hauser.jpg",          "Enzo Hauser",          "Allgemeinbildung", "gravity_flip"),
    ("064-Romy-Siegrist.jpg",        "Romy Siegrist",        "Allgemeinbildung", "fake_ping"),
    ("065-Ilja-Inglin.jpg",          "Ilja Inglin",          "Allgemeinbildung", "corrupt_tasks"),
    ("066-Pia-Hanni.jpg",            "Pia Hänni",            "Allgemeinbildung", "silent_steps"),
    ("067-Timon-Niederberger.jpg",   "Timon Niederberger",   "Allgemeinbildung", "lights_off"),
    ("068-Greta-Buhlmann.jpg",       "Greta Bühlmann",       "Allgemeinbildung", "kill_flashlight"),
    ("069-Wanda-Vogeli.jpg",         "Wanda Vögeli",         "Allgemeinbildung", "math_popup"),
    ("070-Claudio-Furrer.jpg",       "Claudio Furrer",       "Allgemeinbildung", "taunt_shout"),
    ("071-Zeno-Schwyter.jpg",        "Zeno Schwyter",        "Allgemeinbildung", "gravity_flip"),
    ("072-Yves-Lendi.jpg",           "Yves Lendi",           "Allgemeinbildung", "fake_ping"),
    ("073-Gioia-Jud.jpg",            "Gioia Jud",            "Allgemeinbildung", "silent_steps"),
    ("074-Noel-Joller.jpg",          "Noel Joller",          "Allgemeinbildung", "kill_flashlight"),
    ("075-Gregor-Unternahrer.jpg",   "Gregor Unternährer",   "Allgemeinbildung", "math_popup"),
    ("076-Mira-Pfyffer.jpg",         "Mira Pfyffer",         "Allgemeinbildung", "taunt_shout"),
    ("077-Nino-Jenni.jpg",           "Nino Jenni",           "Allgemeinbildung", "gravity_flip"),
    ("078-Kilian-Jost.jpg",          "Kilian Jost",          "Allgemeinbildung", "fake_ping"),
    ("079-Elin-Mosimann.jpg",        "Elin Mosimann",        "Allgemeinbildung", "corrupt_tasks"),
    ("080-Pius-Truniger.jpg",        "Pius Truniger",        "Allgemeinbildung", "silent_steps"),
    ("081-Delia-Fuhrer.jpg",         "Delia Fuhrer",         "Allgemeinbildung", "kill_flashlight"),
    # =========================================================================
    # Coiffeur / Kosmetik — scissors and makeup blur.
    # =========================================================================
    ("082-Fabia-Vollenweider.jpg",   "Fabia Vollenweider",   "Coiffeur", "scissor_throw"),
    ("083-Ottilie-Iten.jpg",         "Ottilie Iten",         "Coiffeur", "scissor_throw"),
    ("084-Beat-Dietrich.jpg",        "Beat Dietrich",        "Coiffeur", "makeup_blur"),
    ("085-Alma-Hodel.jpg",           "Alma Hodel",           "Kosmetik", "makeup_blur"),
    ("086-Ursina-Zumstein.jpg",      "Ursina Zumstein",      "Kosmetik", "makeup_blur"),
    # =========================================================================
    # Köch / Restaurantfach — plates, hot soup, kitchen chaos.
    # =========================================================================
    ("087-Britta-Camenzind.jpg",     "Britta Camenzind",     "Koch", "soup_splash"),
    ("088-Fynn-Hurlimann.jpg",       "Fynn Hürlimann",       "Koch", "soup_splash"),
    ("089-Marek-Imhof.jpg",          "Marek Imhof",          "Koch", "plate_smash"),
    ("090-Ida-Bosshard.jpg",         "Ida Bosshard",         "Restaurantfach", "plate_smash"),
    ("091-Vinzenz-Gmur.jpg",         "Vinzenz Gmür",         "Restaurantfach", "plate_smash"),
    # =========================================================================
    # Automobil — wrenches and oil slicks.
    # =========================================================================
    ("092-Jann-Urech.jpg",           "Jann Urech",           "Automobil", "wrench_throw"),
    ("093-Bruno-Battig.jpg",         "Bruno Bättig",         "Automobil", "wrench_throw"),
    ("094-Cyrill-Ineichen.jpg",      "Cyrill Ineichen",      "Automobil", "oil_slick"),
    ("095-Hedi-Egli.jpg",            "Hedi Egli",            "Automobil", "wrench_throw"),
    ("096-Quirin-Nyffeler.jpg",      "Quirin Nyffeler",      "Automobil", "oil_slick"),
    ("097-Zora-Bircher.jpg",         "Zora Bircher",         "Automobil", "wrench_throw"),
    ("098-Zoe-Dolder.jpg",           "Zoe Dolder",           "Automobil", "oil_slick"),
    # =========================================================================
    # Polymechanik / Automatik / Elektronik / MEM — wrenches, circuit overloads, gear jams.
    # =========================================================================
    ("099-Amira-Notter.jpg",         "Amira Notter",         "Polymechanik", "wrench_throw"),
    ("100-Ines-Stalder.jpg",         "Ines Stalder",         "Anlagen- und Apparatebau", "wrench_throw"),
    ("101-Silvan-Rothlisberger.jpg", "Silvan Röthlisberger", "Polymechanik", "gear_jam"),
    ("102-Viola-Naf.jpg",            "Viola Näf",            "Polymechanik", "wrench_throw"),
    ("103-Maja-Bissig.jpg",          "Maja Bissig",          "Automatik", "circuit_overload"),
    ("104-Lia-Ambuhl.jpg",           "Lia Ambühl",           "Automatik", "circuit_overload"),
    ("105-Lorenz-Dettwiler.jpg",     "Lorenz Dettwiler",     "Automatik", "gear_jam"),
    ("106-Nils-Hofstetter.jpg",      "Nils Hofstetter",      "Automatik", "circuit_overload"),
    ("107-Fiona-Vieli.jpg",          "Fiona Vieli",          "Automatik", "gear_jam"),
    ("108-Olaf-Hotz.jpg",            "Olaf Hotz",            "Automatik", "circuit_overload"),
    ("109-Flurin-Kampf.jpg",         "Flurin Kämpf",         "Automatik", "gear_jam"),
    ("110-Helen-Ehrbar.jpg",         "Helen Ehrbar",         "Polymechanik", "wrench_throw"),
    ("111-Dominik-Riedo.jpg",        "Dominik Riedo",        "Automatik", "circuit_overload"),
    ("112-Hannes-Umbricht.jpg",      "Hannes Umbricht",      "Automatik", "gear_jam"),
    ("113-Yasmin-Dubach.jpg",        "Yasmin Dubach",        "Polymechanik", "wrench_throw"),
    ("114-Matteo-Knusel.jpg",        "Matteo Knüsel",        "Automatik", "circuit_overload"),
    ("115-Ladina-Achermann.jpg",     "Ladina Achermann",     "Automatik", "gear_jam"),
    ("116-Ueli-Cavelti.jpg",         "Ueli Cavelti",         "Polymechanik", "wrench_throw"),
    ("117-Nadja-Wicki.jpg",          "Nadja Wicki",          "Automatik", "circuit_overload"),
    ("118-Jonas-Oehler.jpg",         "Jonas Oehler",         "Elektronik", "circuit_overload"),
    ("119-Oskar-Muff.jpg",           "Oskar Muff",           "MEM-Berufe", "gear_jam"),
    ("120-Ylenia-Stockli.jpg",       "Ylenia Stöckli",       "MEM-Berufe", "wrench_throw"),
    # =========================================================================
    # Strassentransport — truck horns.
    # =========================================================================
    ("121-Kaspar-Mettler.jpg",       "Kaspar Mettler",       "Strassentransport", "truck_horn"),
    ("122-Georg-Luscher.jpg",        "Georg Lüscher",        "Strassentransport", "truck_horn"),
]

# How many teachers spawn per game (sampled from the roster).
TEACHERS_PER_GAME = 3
