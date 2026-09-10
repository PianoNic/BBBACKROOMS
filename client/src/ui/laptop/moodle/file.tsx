/** Moodle inside-course view — player picks the right file. Mirrors
 *  moodle.backrooms-baden.ch: course-index sidebar on the left, big course title,
 *  tab row, "Alles einklappen" and collapsible section cards whose rows
 *  carry an outlined doc icon plus the file-type suffix. */
import type { ComponentChildren } from "preact";
import type { LaptopChallenge } from "../../../net/protocol";
import { Icon } from "../../Icon";
import { ChevronDown, X } from "../../icons";
import { fileSwatch } from "../layout/shared";
import { useChallenge } from "../layout/useChallenge";
import { MoodleNav } from "./nav";
import { MoodleTask } from "./task";
import { MoodleLoginGate } from "./login";
import { sendLaptopChoice } from "../state";

const TABS = [
  "Kurs", "Teilnehmer/innen", "Bewertungen", "Kompetenzen", "Mehr",
];

function DocIcon(props: { name: string }) {
  const sw = fileSwatch(props.name);
  return (
    <span class="m-doc-icon" style={{ color: sw.color, borderColor: sw.color }}>
      {(props.name.split(".").pop() ?? "").slice(0, 3).toUpperCase()}
    </span>
  );
}

function extSuffix(name: string): string {
  return (name.split(".").pop() ?? "").toUpperCase();
}

function SectionHead(props: { title: string; children?: ComponentChildren }) {
  return (
    <div class="m-sec-head">
      <span class="m-sec-chevron"><Icon node={ChevronDown} size={16} strokeWidth={2.5} /></span>
      <span class="m-sec-title">{props.title}</span>
      {props.children}
    </div>
  );
}

function Sidebar(props: { files: string[] }) {
  return (
    <div class="moodle-sidebar">
      <div class="m-side-head">
        <span class="m-side-btn"><Icon node={X} size={16} /></span>
        <span class="m-side-btn m-side-kebab">⋮</span>
      </div>
      {["Allgemeines", "Unterrichtsmaterial"].map((title) => (
        <>
          <div class="m-side-sec" key={title}>
            <span class="m-side-chevron"><Icon node={ChevronDown} size={13} strokeWidth={2.5} /></span>
            <span class="m-side-sec-title">{title}</span>
          </div>
          {title === "Unterrichtsmaterial" ? props.files.map((f) => (
            <div class="m-side-item" key={f}>{f}</div>
          )) : null}
        </>
      ))}
    </div>
  );
}

export function MoodleFileApp(props: { challenge: LaptopChallenge }) {
  const course = props.challenge.course ?? { name: "Kurs", code: "M000" };
  const files = props.challenge.files ?? [];
  const hint = props.challenge.hint ?? "";
  const run = useChallenge(sendLaptopChoice, "Datei geöffnet.", "Falsche Datei.");

  return (
    <div class="moodle-app">
    <MoodleLoginGate>
      <MoodleNav active="calendar" />
      <MoodleTask text={`Öffne die Datei: ${hint}`} />
      <div class="moodle-course-body">
        <Sidebar files={files} />
        <div class="moodle-main moodle-course-main">
          <h1 class="moodle-h1">{course.name}</h1>
          <div class="moodle-tabs">
            {TABS.map((t) => (
              <span class={"moodle-tab" + (t === "Kurs" ? " active" : "")} key={t}>
                {t}
                {t === "Mehr" ? <Icon node={ChevronDown} size={14} /> : null}
              </span>
            ))}
          </div>
          <div class="m-section-card">
            <SectionHead title="Allgemeines">
              <span class="m-collapse-all">Alles einklappen</span>
            </SectionHead>
          </div>
          <div class="m-section-card">
            <SectionHead title="Unterrichtsmaterial" />
            <div class="m-file-list">
              {files.map((f) => (
                <div
                  class={"m-file-row " + run.outcomeClassFor(f)}
                  onClick={() => run.choose(f)}
                  key={f}
                >
                  <DocIcon name={f} />
                  <span class="m-file-name">{f}</span>
                  <span class="m-file-ext">{extSuffix(f)}</span>
                </div>
              ))}
            </div>
          </div>
          <div class={"challenge-status" + (run.outcome ? " " + run.outcome : "")}>
            {run.status}
          </div>
        </div>
      </div>
    </MoodleLoginGate>
    </div>
  );
}
