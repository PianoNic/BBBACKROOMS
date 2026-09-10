/** Teams private DM view — a teacher sent the player a message and the
 *  player must pick the correct reply from a list of suggestions. */
import type { LaptopChallenge } from "../../../net/protocol";
import { Avatar } from "../layout/Avatar";
import { useChallenge } from "../layout/useChallenge";
import { TeamsRail } from "./rail";
import { sendLaptopChoice } from "../state";
import { TaskBar } from "../layout/taskBar";

/** Random fake chat partners so the sidebar looks lived-in. The teacher
 *  DM at the top is the real challenge — these are pure decoration. */
const FAKE_DM_POOL = [
  "Mama", "David M.", "Selina F.", "Jonas R.", "Nina W.", "Tobias K.",
  "Mike T.", "Lukas B.", "Familie", "Lerngruppe", "Kim H.", "Yannick S.",
];

function pickFakeDms(seed: string): string[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const out: string[] = [];
  const used = new Set<number>();
  for (let i = 0; out.length < 4; i++) {
    const idx = Math.abs((h ^ (i * 2654435761)) >>> 0) % FAKE_DM_POOL.length;
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(FAKE_DM_POOL[idx]);
  }
  return out;
}

function DmRow(props: { name: string; preview: string; selected: boolean }) {
  return (
    <div class={"dm-row" + (props.selected ? " selected" : "")}>
      <Avatar name={props.name} size={32} />
      <div class="dm-text">
        <div class="dm-name">{props.name}</div>
        <div class="dm-preview">{props.preview}</div>
      </div>
    </div>
  );
}

export function TeamsDmApp(props: { challenge: LaptopChallenge }) {
  const from = props.challenge.from ?? "Lehrer";
  const question = props.challenge.question ?? "?";
  const options = props.challenge.options ?? [];
  const run = useChallenge(
    sendLaptopChoice,
    "Antwort akzeptiert.",
    "Das war nicht die richtige Antwort.",
  );

  return (
    <div class="teams-app">
      <TeamsRail active="chat" />
      <div class="teams-sidebar">
        <div class="sidebar-head">
          <span class="sidebar-title">Chat</span>
        </div>
        <DmRow name={from} preview={question} selected />
        {pickFakeDms(from + question).map((f) => (
          <DmRow name={f} preview="..." selected={false} key={f} />
        ))}
      </div>
      <div class="teams-main">
        <div class="chat-header">
          <Avatar name={from} size={32} />
          <div class="chat-header-text">
            <div class="chat-header-name">{from}</div>
            <div class="chat-header-sub">Lehrperson · zuletzt aktiv: jetzt</div>
          </div>
        </div>
        <TaskBar text={`${from} schreibt dir. Antworte korrekt um die Challenge zu schliessen.`} />
        <div class="chat-stream">
          <div class="msg incoming">
            <Avatar name={from} size={28} />
            <div class="bubble">
              <div class="bubble-author">{from}</div>
              <div class="bubble-text">{question}</div>
            </div>
          </div>
        </div>
        <div class="composer">
          <div class="composer-label">Antwort wählen</div>
          <div class="reply-row">
            {options.map((opt) => (
              <button
                class={"reply-btn " + run.outcomeClassFor(opt)}
                onClick={() => run.choose(opt)}
                key={opt}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div class={"challenge-status" + (run.outcome ? " " + run.outcome : "")}>
          {run.status}
        </div>
      </div>
    </div>
  );
}
