/** Moodle test page — one multiple-choice question, answer it right to
 *  clear the laptop. Styled like a real Moodle quiz attempt: breadcrumbs,
 *  question card with number + points header and radio-style options. */
import type { LaptopApp } from "../app";
import type { GambleResultPkt, LaptopChallenge } from "../../../net/protocol";
import { el } from "../../dom";
import { type SendFn } from "../layout/shared";
import { createChallenge } from "../layout/challenge";
import { buildMoodleNav } from "./nav";
import { buildMoodleTask } from "./task";
import { mountWithLogin } from "./login";

const LETTERS = ["a.", "b.", "c.", "d."];

export class MoodleQuizApp implements LaptopApp {
  readonly kind = "moodle_quiz" as const;
  readonly el: HTMLDivElement;
  private readonly run = createChallenge();

  constructor(challenge: LaptopChallenge, send: SendFn) {
    this.el = el<HTMLDivElement>("div", "moodle-app");
    mountWithLogin(this.el, () => this.build(challenge, send));
  }

  private build(challenge: LaptopChallenge, send: SendFn): void {
    this.el.appendChild(buildMoodleNav("calendar"));

    const course = challenge.course ?? { name: "Kurs", code: "M000" };
    const title = challenge.quizTitle ?? "Abschlusstest";
    const question = challenge.question ?? "";
    const options = challenge.options ?? [];
    this.el.appendChild(buildMoodleTask("Beantworte die Testfrage richtig."));

    const main = el<HTMLDivElement>("div", "moodle-main");

    const crumbs = el<HTMLDivElement>("div", "moodle-crumbs");
    crumbs.appendChild(el("span", undefined, course.code));
    crumbs.appendChild(el("span", "crumb-sep", "›"));
    crumbs.appendChild(el("span", undefined, "Tests"));
    crumbs.appendChild(el("span", "crumb-sep", "›"));
    crumbs.appendChild(el("span", undefined, title));
    main.appendChild(crumbs);

    main.appendChild(el("h1", "moodle-h1", title));

    const quiz = el<HTMLDivElement>("div", "m-quiz");

    const info = el<HTMLDivElement>("div", "m-quiz-info");
    info.appendChild(el("div", "m-quiz-info-line", "Frage 1"));
    info.appendChild(el("div", "m-quiz-info-line", "Noch nicht beantwortet"));
    info.appendChild(el("div", "m-quiz-info-line", "Erreichbare Punkte: 1"));
    quiz.appendChild(info);

    const card = el<HTMLDivElement>("div", "m-quiz-card");
    card.appendChild(el("div", "m-quiz-question", question));
    const list = el<HTMLDivElement>("div", "m-quiz-options");
    options.forEach((opt, i) => {
      const row = el<HTMLDivElement>("div", "m-quiz-option");
      row.appendChild(el("span", "m-quiz-radio"));
      row.appendChild(el("span", "m-quiz-letter", LETTERS[i] ?? `${i + 1}.`));
      row.appendChild(el("span", "m-quiz-text", opt));
      row.onclick = () => {
        if (this.run.isLocked()) return;
        send(opt);
      };
      this.run.register(opt, row);
      list.appendChild(row);
    });
    card.appendChild(list);
    quiz.appendChild(card);
    main.appendChild(quiz);

    main.appendChild(this.run.status);
    this.el.appendChild(main);
  }

  applyResult(pkt: GambleResultPkt): void {
    this.run.apply(pkt, "Richtig! Test bestanden.", "Falsche Antwort.");
  }
}
