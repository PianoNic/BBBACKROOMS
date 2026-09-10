import { useEffect, useState } from "preact/hooks";
import type { ItemType, PickupKind } from "../../../net/protocol";
import { buildChairMesh } from "../../../gameplay/chairs";
import { buildItemModel } from "../../../gameplay/itemModels";
import { buildPickupModel } from "../../../gameplay/pickups";
import { createItemViewerPool, type ItemViewerPool } from "../../itemViewer";
import { Button } from "../components/controls";
import { Heading, Panel, Scroll } from "../components/layout";
import { Accordion } from "../components/Accordion";
import { DomNode } from "../components/DomNode";
import { useMediaQuery } from "../components/useMediaQuery";
import { navigate } from "../routes";

type Section = { title: string; bullets: string[] };

const SECTIONS: Section[] = [
  {
    title: "Setup",
    bullets: [
      "Bis zu 100 Spieler werden in einer Schule in Baden eingesperrt.",
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

type ShowcaseEntry =
  | { kind: "pickup"; type: PickupKind; label: string; sub: string }
  | { kind: "item"; type: ItemType; label: string; sub: string }
  | { kind: "chair"; label: string; sub: string };

const SHOWCASE: ShowcaseEntry[] = [
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

function buildShowcaseModel(entry: ShowcaseEntry) {
  if (entry.kind === "pickup") return buildPickupModel(entry.type);
  if (entry.kind === "chair") return buildChairMesh();
  return buildItemModel(entry.type);
}

function ShowcaseTile(props: { entry: ShowcaseEntry; pool: ItemViewerPool }) {
  const [viewer] = useState(() => {
    const v = props.pool.add(() => buildShowcaseModel(props.entry));
    v.canvas.style.width = "100%";
    v.canvas.style.height = "auto";
    v.canvas.style.aspectRatio = "1";
    return v;
  });

  useEffect(() => () => viewer.dispose(), [viewer]);

  return (
    <div class="tut-item">
      <DomNode node={viewer.canvas} class="tut-item-canvas" />
      <div class="tut-item-name">{props.entry.label}</div>
      <div class="tut-item-sub">{props.entry.sub}</div>
    </div>
  );
}

function TextSection(props: { section: Section; accordion: boolean; defaultOpen: boolean }) {
  const body = (
    <ul class="tut-list">
      {props.section.bullets.map((bullet, i) => <li key={i}>{bullet}</li>)}
    </ul>
  );
  if (props.accordion) {
    return (
      <Accordion title={props.section.title} collapsible defaultOpen={props.defaultOpen}>
        {body}
      </Accordion>
    );
  }
  return (
    <div class="tut-section">
      <h3 class="tut-title">{props.section.title}</h3>
      {body}
    </div>
  );
}

function ShowcaseSection(props: { accordion: boolean }) {
  const [pool] = useState(() => createItemViewerPool());
  useEffect(() => () => pool.dispose(), [pool]);

  const body = (
    <div class="tut-showcase">
      {SHOWCASE.map((entry) => <ShowcaseTile key={entry.label} entry={entry} pool={pool} />)}
    </div>
  );
  if (props.accordion) {
    return (
      <Accordion title="Items & Pickups" collapsible defaultOpen={false}>
        {body}
      </Accordion>
    );
  }
  return (
    <div class="tut-section">
      <h3 class="tut-title">Items & Pickups</h3>
      {body}
    </div>
  );
}

export function TutorialScreen() {
  const accordion = useMediaQuery("(max-width: 719.98px)");

  return (
    <Panel class="tutorial-panel">
      <Heading>HOW TO PLAY</Heading>
      <Scroll class="tutorial-body">
        <div class="tut-columns">
          {SECTIONS.map((section, i) => (
            <TextSection
              key={section.title}
              section={section}
              accordion={accordion}
              defaultOpen={i === 0}
            />
          ))}
          <ShowcaseSection accordion={accordion} />
        </div>
      </Scroll>
      <Button variant="back" class="screen-back" onClick={() => navigate("title", "back")}>
        ← BACK
      </Button>
    </Panel>
  );
}
