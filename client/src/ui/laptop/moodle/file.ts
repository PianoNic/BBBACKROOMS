/** Moodle inside-course material listing — player picks the right file. */
import type { LaptopApp } from "../app";
import type { GambleResultPkt, LaptopChallenge } from "../../../net/protocol";
import { el } from "../../dom";
import { fileSwatch, type SendFn } from "../layout/shared";
import { createChallenge } from "../layout/challenge";
import { buildMoodleNav } from "./nav";
import { buildMoodleTask } from "./task";

function sizeFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return `${50 + (Math.abs(h) % 950)} KB`;
}

export class MoodleFileApp implements LaptopApp {
  readonly kind = "moodle_file" as const;
  readonly el: HTMLDivElement;
  private readonly run = createChallenge();

  constructor(challenge: LaptopChallenge, send: SendFn) {
    this.el = el<HTMLDivElement>("div", "moodle-app");
    this.el.appendChild(buildMoodleNav("courses"));

    const course = challenge.course ?? { name: "Kurs", code: "M000" };
    const files = challenge.files ?? [];
    const hint = challenge.hint ?? "";

    this.el.appendChild(buildMoodleTask(`Öffne die Datei: ${hint}`));

    const main = el<HTMLDivElement>("div", "moodle-main");

    const crumbs = el<HTMLDivElement>("div", "moodle-crumbs");
    crumbs.appendChild(el("span", undefined, "Meine Kurse"));
    crumbs.appendChild(el("span", "crumb-sep", "›"));
    crumbs.appendChild(el("span", undefined, course.code));
    main.appendChild(crumbs);

    main.appendChild(el("h2", "moodle-h2", `${course.name} (${course.code})`));
    main.appendChild(el("p", "moodle-meta", "Materialien · Aufgaben · Foren"));

    const section = el<HTMLDivElement>("div", "moodle-section");
    section.appendChild(el("div", "moodle-section-title", "Unterrichtsmaterial"));
    const list = el<HTMLDivElement>("div", "moodle-resource-list");
    for (const f of files) {
      const row = el<HTMLDivElement>("div", "resource-row");
      const sw = fileSwatch(f);
      const badge = el<HTMLSpanElement>("span", "file-badge moodle-file-badge");
      badge.textContent = sw.label;
      badge.style.background = sw.color;
      row.appendChild(badge);
      row.appendChild(el("span", "resource-name", f));
      row.appendChild(el("span", "resource-meta", "Datei · " + sizeFor(f)));
      row.onclick = () => {
        if (this.run.isLocked()) return;
        send(f);
      };
      this.run.register(f, row);
      list.appendChild(row);
    }
    section.appendChild(list);
    main.appendChild(section);
    main.appendChild(this.run.status);
    this.el.appendChild(main);
  }

  applyResult(pkt: GambleResultPkt): void {
    this.run.apply(pkt, "Datei geöffnet.", "Falsche Datei.");
  }
}
