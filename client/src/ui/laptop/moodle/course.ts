/** Moodle "Meine Kurse" view — player must pick the course matching the
 *  hint name. */
import type { LaptopApp } from "../app";
import type { GambleResultPkt, LaptopChallenge } from "../../../net/protocol";
import { el } from "../../dom";
import { icon, Search } from "../../icons";
import { type SendFn } from "../layout/shared";
import { createChallenge } from "../layout/challenge";
import { buildMoodleTask } from "./task";
import { buildMoodleNav } from "./nav";

export class MoodleCourseApp implements LaptopApp {
  readonly kind = "moodle_course" as const;
  readonly el: HTMLDivElement;
  private readonly run = createChallenge();

  constructor(challenge: LaptopChallenge, send: SendFn) {
    this.el = el<HTMLDivElement>("div", "moodle-app");
    this.el.appendChild(buildMoodleNav("home"));

    const hint = challenge.hint ?? "";
    const courses = challenge.courses ?? [];

    this.el.appendChild(buildMoodleTask(`Öffne den Kurs: ${hint}`));

    const main = el<HTMLDivElement>("div", "moodle-main");

    const greet = el<HTMLDivElement>("div", "moodle-greet");
    greet.appendChild(el("h1", "moodle-h1", "Hallo, Niclas Dario Rafael Erismann!"));
    const wave = el<HTMLSpanElement>("span", "moodle-wave", "👋");
    greet.appendChild(wave);
    main.appendChild(greet);

    const searchRow = el<HTMLDivElement>("div", "moodle-search-row");
    const searchInput = el<HTMLInputElement>("input", "moodle-search-input");
    searchInput.type = "text";
    searchInput.placeholder = "Kurse suchen";
    searchInput.readOnly = true;
    searchRow.appendChild(searchInput);
    const searchBtn = el<HTMLButtonElement>("button", "moodle-search-btn");
    searchBtn.type = "button";
    searchBtn.appendChild(icon(Search, 18, 2));
    searchRow.appendChild(searchBtn);
    main.appendChild(searchRow);

    main.appendChild(el("h2", "moodle-h2", "Meine Kurse"));

    const grid = el<HTMLDivElement>("div", "course-grid");
    for (const c of courses) {
      const card = el<HTMLDivElement>("div", "course-card");
      const body = el<HTMLDivElement>("div", "course-body");
      body.appendChild(el("div", "coursename", c.code));
      body.appendChild(el("div", "course-summary", c.name));
      card.appendChild(body);
      card.onclick = () => {
        if (this.run.isLocked()) return;
        send(c.code);
      };
      this.run.register(c.code, card);
      grid.appendChild(card);
    }
    main.appendChild(grid);
    main.appendChild(this.run.status);
    this.el.appendChild(main);
  }

  applyResult(pkt: GambleResultPkt): void {
    this.run.apply(pkt, "Kurs geöffnet.", "Das ist nicht der gesuchte Kurs.");
  }
}
