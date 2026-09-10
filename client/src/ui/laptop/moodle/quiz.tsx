/** Moodle test page — one multiple-choice question, answer it right to
 *  clear the laptop. Styled like a real Moodle quiz attempt: breadcrumbs,
 *  question card with number + points header and radio-style options. */
import type { LaptopChallenge } from "../../../net/protocol";
import { useChallenge } from "../layout/useChallenge";
import { MoodleNav } from "./nav";
import { MoodleTask } from "./task";
import { MoodleLoginGate } from "./login";
import { sendLaptopChoice } from "../state";

const LETTERS = ["a.", "b.", "c.", "d."];

export function MoodleQuizApp(props: { challenge: LaptopChallenge }) {
  const course = props.challenge.course ?? { name: "Kurs", code: "M000" };
  const title = props.challenge.quizTitle ?? "Abschlusstest";
  const question = props.challenge.question ?? "";
  const options = props.challenge.options ?? [];
  const run = useChallenge(sendLaptopChoice, "Richtig! Test bestanden.", "Falsche Antwort.");

  return (
    <div class="moodle-app">
    <MoodleLoginGate>
      <MoodleNav active="calendar" />
      <MoodleTask text="Beantworte die Testfrage richtig." />
      <div class="moodle-main">
        <div class="moodle-crumbs">
          <span>{course.code}</span>
          <span class="crumb-sep">›</span>
          <span>Tests</span>
          <span class="crumb-sep">›</span>
          <span>{title}</span>
        </div>
        <h1 class="moodle-h1">{title}</h1>
        <div class="m-quiz">
          <div class="m-quiz-info">
            <div class="m-quiz-info-line">Frage 1</div>
            <div class="m-quiz-info-line">Noch nicht beantwortet</div>
            <div class="m-quiz-info-line">Erreichbare Punkte: 1</div>
          </div>
          <div class="m-quiz-card">
            <div class="m-quiz-question">{question}</div>
            <div class="m-quiz-options">
              {options.map((opt, i) => (
                <div
                  class={"m-quiz-option " + run.outcomeClassFor(opt)}
                  onClick={() => run.choose(opt)}
                  key={opt}
                >
                  <span class="m-quiz-radio" />
                  <span class="m-quiz-letter">{LETTERS[i] ?? `${i + 1}.`}</span>
                  <span class="m-quiz-text">{opt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div class={"challenge-status" + (run.outcome ? " " + run.outcome : "")}>
          {run.status}
        </div>
      </div>
    </MoodleLoginGate>
    </div>
  );
}
