/** Moodle "Startseite" dashboard — player must open the course matching
 *  the hint. Mirrors moodle.backrooms-baden.ch: centered greeting + course search,
 *  "Last Visited" / "All Courses" headers and a card grid with banner,
 *  course-id badge and a red "Go to Course" button. */
import type { LaptopChallenge } from "../../../net/protocol";
import { Icon } from "../../Icon";
import { Search } from "../../icons";
import { useChallenge } from "../layout/useChallenge";
import { MoodleTask } from "./task";
import { MoodleNav } from "./nav";
import { MoodleLoginGate } from "./login";
import { sendLaptopChoice } from "../state";

/** Stable hash for banner hues and fake course-id badges. */
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function MoodleCourseApp(props: { challenge: LaptopChallenge }) {
  const hint = props.challenge.hint ?? "";
  const courses = props.challenge.courses ?? [];
  const run = useChallenge(sendLaptopChoice, "Kurs geöffnet.", "Das ist nicht der gesuchte Kurs.");

  return (
    <div class="moodle-app">
    <MoodleLoginGate>
      <MoodleNav active="home" />
      <MoodleTask text={`Öffne den Kurs: ${hint}`} />
      <div class="moodle-main">
        <div class="moodle-greet">
          <h1 class="moodle-h1">Hallo, Hans Ueli!</h1>
          <span class="moodle-wave">👋</span>
        </div>
        <div class="moodle-search-row">
          <input class="moodle-search-input" type="text" placeholder="Kurse suchen" readOnly />
          <button class="moodle-search-btn" type="button">
            <Icon node={Search} size={18} strokeWidth={2} />
          </button>
        </div>
        <h2 class="moodle-h2 moodle-h2-section">Last Visited</h2>
        <h2 class="moodle-h2 moodle-h2-section">All Courses</h2>
        <div class="course-grid">
          {courses.map((c) => {
            const hue = hash(c.code) % 360;
            return (
              <div
                class={"course-card " + run.outcomeClassFor(c.code)}
                onClick={() => run.choose(c.code)}
                key={c.code}
              >
                <div
                  class="course-banner"
                  style={{
                    background:
                      `linear-gradient(135deg, hsl(${hue} 45% 62%), hsl(${(hue + 50) % 360} 50% 40%))`,
                  }}
                />
                <div class="course-body">
                  <span class="course-id-badge">{String(500 + (hash(c.code) % 700))}</span>
                  <div class="coursename">{`${c.code} – ${c.name}`}</div>
                  <button class="course-go">Go to Course</button>
                </div>
              </div>
            );
          })}
        </div>
        <div class={"challenge-status" + (run.outcome ? " " + run.outcome : "")}>
          {run.status}
        </div>
      </div>
    </MoodleLoginGate>
    </div>
  );
}
