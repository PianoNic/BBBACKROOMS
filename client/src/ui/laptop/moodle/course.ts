/** Moodle "Startseite" dashboard — player must open the course matching
 *  the hint. Mirrors moodle.bbbaden.ch: centered greeting + course search,
 *  "Last Visited" / "All Courses" headers and a card grid with banner,
 *  course-id badge and a red "Go to Course" button. */
import type { LaptopApp } from "../app";
import type { GambleResultPkt, LaptopChallenge } from "../../../net/protocol";
import { el } from "../../dom";
import { icon, Search } from "../../icons";
import { type SendFn } from "../layout/shared";
import { createChallenge } from "../layout/challenge";
import { buildMoodleTask } from "./task";
import { buildMoodleNav } from "./nav";
import { mountWithLogin } from "./login";

/** Stable hash for banner hues and fake course-id badges. */
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export class MoodleCourseApp implements LaptopApp {
  readonly kind = "moodle_course" as const;
  readonly el: HTMLDivElement;
  private readonly run = createChallenge();

  constructor(challenge: LaptopChallenge, send: SendFn) {
    this.el = el<HTMLDivElement>("div", "moodle-app");
    mountWithLogin(this.el, () => this.build(challenge, send));
  }

  private build(challenge: LaptopChallenge, send: SendFn): void {
    this.el.appendChild(buildMoodleNav("home"));

    const hint = challenge.hint ?? "";
    const courses = challenge.courses ?? [];
    this.el.appendChild(buildMoodleTask(`Öffne den Kurs: ${hint}`));

    const main = el<HTMLDivElement>("div", "moodle-main");

    const greet = el<HTMLDivElement>("div", "moodle-greet");
    greet.appendChild(el("h1", "moodle-h1", "Hallo, Niclas Dario Rafael Erismann!"));
    greet.appendChild(el("span", "moodle-wave", "👋"));
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

    main.appendChild(el("h2", "moodle-h2 moodle-h2-section", "Last Visited"));
    main.appendChild(el("h2", "moodle-h2 moodle-h2-section", "All Courses"));

    const grid = el<HTMLDivElement>("div", "course-grid");
    for (const c of courses) {
      const card = el<HTMLDivElement>("div", "course-card");

      const banner = el<HTMLDivElement>("div", "course-banner");
      const hue = hash(c.code) % 360;
      banner.style.background =
        `linear-gradient(135deg, hsl(${hue} 45% 62%), hsl(${(hue + 50) % 360} 50% 40%))`;
      card.appendChild(banner);

      const body = el<HTMLDivElement>("div", "course-body");
      body.appendChild(el(
        "span", "course-id-badge", String(500 + (hash(c.code) % 700)),
      ));
      body.appendChild(el("div", "coursename", `${c.code} – ${c.name}`));
      body.appendChild(el("button", "course-go", "Go to Course"));
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
