/** Moodle "Meine Kurse" view — player must pick the course matching the
 *  hint name. */
import type { LaptopApp } from "../app";
import type { GambleResultPkt, LaptopChallenge } from "../../../net/protocol";
import { el } from "../../dom";
import { type SendFn } from "../layout/shared";
import { createChallenge } from "../layout/challenge";
import { buildMoodleTask } from "./task";
import { buildMoodleNav } from "./nav";

const TILE_PALETTE = [
  "#c61824", "#ca3120", "#0d5ca1", "#357a32", "#008196",
  "#f0ad4e", "#495057", "#6a737b",
];

function imageBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return TILE_PALETTE[Math.abs(h) % TILE_PALETTE.length];
}

export class MoodleCourseApp implements LaptopApp {
  readonly kind = "moodle_course" as const;
  readonly el: HTMLDivElement;
  private readonly run = createChallenge();

  constructor(challenge: LaptopChallenge, send: SendFn) {
    this.el = el<HTMLDivElement>("div", "moodle-app");
    this.el.appendChild(buildMoodleNav("courses"));

    const hint = challenge.hint ?? "";
    const courses = challenge.courses ?? [];

    this.el.appendChild(buildMoodleTask(`Öffne den Kurs: ${hint}`));

    const main = el<HTMLDivElement>("div", "moodle-main");
    main.appendChild(el("h2", "moodle-h2", "Meine Kurse"));

    const grid = el<HTMLDivElement>("div", "course-grid");
    for (const c of courses) {
      const card = el<HTMLDivElement>("div", "course-card");
      const img = el<HTMLDivElement>("div", "course-image");
      img.style.background = imageBg(c.code);
      img.textContent = c.code;
      card.appendChild(img);
      const body = el<HTMLDivElement>("div", "course-body");
      body.appendChild(el("div", "coursename", c.name));
      body.appendChild(el("div", "course-code", c.code));
      body.appendChild(el(
        "div", "course-summary",
        "Berufsfachschule BBB Baden · Berufsmatura",
      ));
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
