/** Moodle inside-course view — player picks the right file. Mirrors
 *  moodle.bbbaden.ch: course-index sidebar on the left, big course title,
 *  tab row, "Alles einklappen" and collapsible section cards whose rows
 *  carry an outlined doc icon plus the file-type suffix. */
import type { LaptopApp } from "../app";
import type { GambleResultPkt, LaptopChallenge } from "../../../net/protocol";
import { el } from "../../dom";
import { icon, ChevronDown, X } from "../../icons";
import { fileSwatch, type SendFn } from "../layout/shared";
import { createChallenge } from "../layout/challenge";
import { buildMoodleNav } from "./nav";
import { buildMoodleTask } from "./task";
import { mountWithLogin } from "./login";

const TABS = [
  "Kurs", "Teilnehmer/innen", "Bewertungen", "Kompetenzen", "Mehr",
];

function docIcon(name: string): HTMLSpanElement {
  const sw = fileSwatch(name);
  const box = el<HTMLSpanElement>("span", "m-doc-icon");
  box.style.color = sw.color;
  box.style.borderColor = sw.color;
  // Real-Moodle style icon caption: PPT / DOC / PDF, not the Office "P"/"W".
  box.textContent = (name.split(".").pop() ?? "").slice(0, 3).toUpperCase();
  return box;
}

function extSuffix(name: string): string {
  return (name.split(".").pop() ?? "").toUpperCase();
}

function sectionHead(title: string): HTMLDivElement {
  const head = el<HTMLDivElement>("div", "m-sec-head");
  const chevron = el<HTMLSpanElement>("span", "m-sec-chevron");
  chevron.appendChild(icon(ChevronDown, 16, 2.5));
  head.appendChild(chevron);
  head.appendChild(el("span", "m-sec-title", title));
  return head;
}

export class MoodleFileApp implements LaptopApp {
  readonly kind = "moodle_file" as const;
  readonly el: HTMLDivElement;
  private readonly run = createChallenge();

  constructor(challenge: LaptopChallenge, send: SendFn) {
    this.el = el<HTMLDivElement>("div", "moodle-app");
    mountWithLogin(this.el, () => this.build(challenge, send));
  }

  private build(challenge: LaptopChallenge, send: SendFn): void {
    this.el.appendChild(buildMoodleNav("calendar"));

    const course = challenge.course ?? { name: "Kurs", code: "M000" };
    const files = challenge.files ?? [];
    const hint = challenge.hint ?? "";
    this.el.appendChild(buildMoodleTask(`Öffne die Datei: ${hint}`));

    const body = el<HTMLDivElement>("div", "moodle-course-body");
    body.appendChild(this.buildSidebar(files));

    const main = el<HTMLDivElement>("div", "moodle-main moodle-course-main");
    main.appendChild(el("h1", "moodle-h1", course.name));

    const tabs = el<HTMLDivElement>("div", "moodle-tabs");
    for (const t of TABS) {
      const tab = el<HTMLSpanElement>(
        "span", "moodle-tab" + (t === "Kurs" ? " active" : ""), t,
      );
      if (t === "Mehr") tab.appendChild(icon(ChevronDown, 14));
      tabs.appendChild(tab);
    }
    main.appendChild(tabs);

    // Collapsed "Allgemeines" card + the expanded material section.
    const general = el<HTMLDivElement>("div", "m-section-card");
    const generalHead = sectionHead("Allgemeines");
    generalHead.appendChild(el("span", "m-collapse-all", "Alles einklappen"));
    general.appendChild(generalHead);
    main.appendChild(general);

    const materials = el<HTMLDivElement>("div", "m-section-card");
    materials.appendChild(sectionHead("Unterrichtsmaterial"));
    const list = el<HTMLDivElement>("div", "m-file-list");
    for (const f of files) {
      const row = el<HTMLDivElement>("div", "m-file-row");
      row.appendChild(docIcon(f));
      row.appendChild(el("span", "m-file-name", f));
      row.appendChild(el("span", "m-file-ext", extSuffix(f)));
      row.onclick = () => {
        if (this.run.isLocked()) return;
        send(f);
      };
      this.run.register(f, row);
      list.appendChild(row);
    }
    materials.appendChild(list);
    main.appendChild(materials);

    main.appendChild(this.run.status);
    body.appendChild(main);
    this.el.appendChild(body);
  }

  private buildSidebar(files: string[]): HTMLDivElement {
    const side = el<HTMLDivElement>("div", "moodle-sidebar");
    const head = el<HTMLDivElement>("div", "m-side-head");
    const close = el<HTMLSpanElement>("span", "m-side-btn");
    close.appendChild(icon(X, 16));
    head.appendChild(close);
    head.appendChild(el("span", "m-side-btn m-side-kebab", "⋮"));
    side.appendChild(head);

    for (const title of ["Allgemeines", "Unterrichtsmaterial"]) {
      const sec = el<HTMLDivElement>("div", "m-side-sec");
      const chevron = el<HTMLSpanElement>("span", "m-side-chevron");
      chevron.appendChild(icon(ChevronDown, 13, 2.5));
      sec.appendChild(chevron);
      sec.appendChild(el("span", "m-side-sec-title", title));
      side.appendChild(sec);
      if (title !== "Unterrichtsmaterial") continue;
      for (const f of files) side.appendChild(el("div", "m-side-item", f));
    }
    return side;
  }

  applyResult(pkt: GambleResultPkt): void {
    this.run.apply(pkt, "Datei geöffnet.", "Falsche Datei.");
  }
}
