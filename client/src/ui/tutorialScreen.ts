/** "How to play" text screen reached from the title menu. Mostly text;
 *  also renders a small showcase of the in-game items rotating in 3D so
 *  players know what to look for. */
import * as THREE from "three";
import { el } from "./dom";
import { buildItemModel } from "../gameplay/itemModels";
import { buildPickupModel } from "../gameplay/pickups";
import { buildChairMesh } from "../gameplay/chairs";
import { createItemViewer } from "./itemViewer";
import type { ItemType, PickupKind } from "../net/protocol";

type Section = { title: string; bullets: string[] };

const SECTIONS: Section[] = [
  {
    title: "Setup",
    bullets: [
      "Bis zu 100 Spieler werden in der BBB Baden eingesperrt.",
      "Lehrer patrouillieren die Schule und versuchen euch zu erwischen.",
      "Jeder Lehrer hat eine eigene Fähigkeit (Bälle werfen, Bussen verteilen, Boden vereisen, ...).",
    ],
  },
  {
    title: "Tasks",
    bullets: [
      "Die offenen Aufgaben siehst du oben links in der HUD. Sobald ALLE Aufgaben erledigt sind, öffnet sich der Extraction-Schacht in der Aula.",
      "Find-Tasks: Findet das gesuchte Objekt an einem Pult in einem bestimmten Raum und nehmt es mit (E).",
      "Interakt-Tasks brauchen ein passendes Quest-Item (auch an Pulten zu finden):",
      "  • Schwamm → Whiteboards abwischen",
      "  • Auge → Gemälde inspizieren",
      "  • Giesskanne → Pflanzen giessen",
      "  • Plakate → an Pinnwänden aufhängen",
      "  • Schlüssel → Sicherungskasten öffnen und Hebel umlegen",
      "  • Festplatte → Server-Racks tauschen",
      "Laptop-Tasks: Setzt euch an einen Laptop und löst die Mini-App: Casino-Spiel, Teams-Aufgabe oder Moodle-Suche.",
      "Sicherungskasten: mit E die Klappe öffnen, dann jeden Hebel mit E umlegen — der letzte Hebel schliesst die Aufgabe ab.",
      "Türen + Klokabinen lassen sich mit E öffnen/schliessen (für taktisches Verstecken).",
    ],
  },
  {
    title: "Extraction",
    bullets: [
      "Wenn alle Tasks fertig sind, lauft zur Aula und steht in den Schacht (das leuchtende Gitter im Boden).",
      "Jeder muss einzeln extrahieren. Tote Mitspieler können zwischendurch wiederbelebt werden (siehe Medkit).",
      "Wenn alle lebenden Spieler extrahiert sind: Sieg.",
      "Tot? Du wechselst automatisch in den Spectator-Modus. Linksklick wechselt zwischen den noch lebenden Mitspielern, bis dich jemand wiederbelebt.",
    ],
  },
  {
    title: "Items",
    bullets: [
      "Es gibt zwei Item-Quellen: Schliessfächer (Power-Ups) und Pulte (Quest-Items + Sammelobjekte).",
      "Medkit (Schliessfach): wiederbelebt einen liegenden Mitspieler (E gedrückt halten neben der Leiche).",
      "Trank (Schliessfach): drücke Q um ihn zu trinken — du wirst 8 Sekunden lang ~1.5x schneller.",
      "Kompass (Schliessfach): zeigt dir mit einem Pfeil oben den Weg zur nächsten Aufgabe.",
      "Ortungsgerät (Schliessfach): blendet auf der Minimap alle offenen Tasks (gelb) und Items (cyan) als Punkte ein.",
      "Wärmebild-Brille (Schliessfach): mit F aktivieren — siehst alle Lehrer 3 Sekunden lang als rote Outline durch Wände. 30 Sekunden Cooldown.",
      "GPS Tracker (Schliessfach): zeigt alle Lehrer permanent als rote Punkte auf der Minimap — kein Cooldown, instant aktiv.",
      "Stuhl (steht auf dem Boden): mit E aufheben, dann mit Linksklick werfen — trifft er einen Lehrer, ist dieser ~3 Sekunden gestunt. Mit G ablegen ohne zu werfen.",
      "Quest-Items (Pulte): Schwamm, Auge, Giesskanne, Plakate, Schlüssel, Festplatte — gehören zu einer Interakt-Task. Trägt man das passende Item, leuchtet der Aufgabenort.",
    ],
  },
  {
    title: "Controls",
    bullets: [
      "WASD - Bewegung, Shift - Sprint, Space - Springen, C - Ducken.",
      "Maus - Umsehen. Alternativ Pfeiltasten (↑↓←→) zum Drehen der Kamera, wie in Roblox.",
      "E - Interagieren / Aufheben / Wiederbeleben (halten).",
      "Q - Trank trinken (Speed-Boost).",
      "F - Wärmebild-Brille aktivieren (3s Reveal, 30s Cooldown).",
      "Linksklick mit Stuhl in der Hand - Stuhl werfen. Linksklick im Spectator-Modus - nächsten Mitspieler beobachten.",
      "G - Stuhl ablegen (ohne zu werfen).",
      "V (gedrückt halten) - Push-to-Talk Mikrofon (wenn so eingestellt).",
      "X - Ping: markiert die Stelle, die du anschaust, für dein ganzes Team.",
      "Escape - Pause-Menü (Optionen, Einstellungen, zurück zum Titel).",
    ],
  },
  {
    title: "Tips",
    bullets: [
      "Umsehen geht mit der Maus ODER den Pfeiltasten (↑↓←→) — wie in Roblox. In den Einstellungen kannst du die Pfeiltasten-Geschwindigkeit anpassen.",
      "Bleibt zusammen - Wiederbeleben ist viel zuverlässiger als alleine zu spielen.",
      "Hört euch im Proximity-Chat: Lehrer-Schritte sind hörbar bevor ihr sie seht.",
      "Lehrer HÖREN euch: Sprinten, Stühle werfen, Schliessfächer, Türen und eure Stimme locken Lehrer in der Nähe an. Schleichen und flüstern!",
      "Schliessfächer liegen verstreut in der Schule und können Items enthalten.",
      "Versteck dich in Schränken (E)! Lehrer verlieren dich — aber nicht, wenn sie dich reinklettern sehen. Rein- und rausklettern macht Lärm.",
      "Casino-Laptops sind 100% Glück, Teams/Moodle-Laptops sind 100% Logik - tauscht Plätze wenn ihr feststeckt.",
    ],
  },
];

type Showcase =
  | { kind: "pickup"; type: PickupKind; label: string; sub: string }
  | { kind: "item"; type: ItemType; label: string; sub: string }
  | { kind: "chair"; label: string; sub: string };

const SHOWCASE: Showcase[] = [
  { kind: "pickup", type: "medkit",  label: "Medkit",  sub: "revives a teammate" },
  { kind: "pickup", type: "potion",  label: "Potion",  sub: "drink (Q) for speed" },
  { kind: "pickup", type: "compass", label: "Compass", sub: "points to next task" },
  { kind: "pickup", type: "tracker", label: "Tracker", sub: "items + tasks on map" },
  { kind: "pickup", type: "goggles", label: "Goggles", sub: "[F] see-through reveal" },
  { kind: "pickup", type: "gps",     label: "GPS",     sub: "teachers on map" },
  { kind: "chair",                   label: "Chair",   sub: "pickup + throw to stun" },
  { kind: "item", type: "notebook",   label: "Notebook",   sub: "desk pickup" },
  { kind: "item", type: "calculator", label: "Calculator", sub: "desk pickup" },
  { kind: "item", type: "textbook",   label: "Textbook",   sub: "desk pickup" },
  { kind: "item", type: "key",        label: "Key",        sub: "desk pickup" },
  { kind: "item", type: "envelope",   label: "Envelope",   sub: "desk pickup" },
];

function buildShowcase(): { row: HTMLElement; dispose: () => void } {
  const grid = el<HTMLDivElement>("div", "tut-showcase");
  const viewers: Array<{ dispose: () => void }> = [];
  for (const item of SHOWCASE) {
    const tile = el<HTMLDivElement>("div", "tut-item");
    const model: THREE.Group = item.kind === "pickup"
      ? buildPickupModel(item.type)
      : item.kind === "chair"
        ? buildChairMesh()
        : buildItemModel(item.type);
    const viewer = createItemViewer(model);
    viewers.push(viewer);
    tile.appendChild(viewer.canvas);
    tile.appendChild(el("div", "tut-item-name", item.label));
    tile.appendChild(el("div", "tut-item-sub", item.sub));
    grid.appendChild(tile);
  }
  return { row: grid, dispose: () => viewers.forEach((v) => v.dispose()) };
}

export function buildTutorialScreen(
  root: HTMLElement, onBack: () => void,
): void {
  const panel = el<HTMLDivElement>("div", "panel panel-brackets tutorial-panel");
  panel.appendChild(el("h2", undefined, "HOW TO PLAY"));

  const body = el<HTMLDivElement>("div", "tutorial-body");
  for (const sec of SECTIONS) {
    const block = el<HTMLDivElement>("div", "tut-section");
    block.appendChild(el("h3", "tut-title", sec.title));
    const ul = el<HTMLUListElement>("ul", "tut-list");
    for (const b of sec.bullets) ul.appendChild(el("li", undefined, b));
    block.appendChild(ul);
    body.appendChild(block);
  }

  const showcaseBlock = el<HTMLDivElement>("div", "tut-section");
  showcaseBlock.appendChild(el("h3", "tut-title", "Items & Pickups"));
  const showcase = buildShowcase();
  showcaseBlock.appendChild(showcase.row);
  body.appendChild(showcaseBlock);

  panel.appendChild(body);

  const back = el<HTMLButtonElement>("button", "menu-btn back", "← BACK");
  back.onclick = () => { showcase.dispose(); onBack(); };
  panel.appendChild(back);

  root.appendChild(panel);
}
