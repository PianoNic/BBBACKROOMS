/** Teams private DM view — a teacher sent the player a message and the
 *  player must pick the correct reply from a list of suggestions. */
import type { LaptopApp } from "../app";
import type { GambleResultPkt, LaptopChallenge } from "../../../net/protocol";
import { el } from "../../dom";
import { avatarTile, type SendFn } from "../layout/shared";
import { buildTaskBar } from "../layout/taskBar";
import { createChallenge } from "../layout/challenge";
import { buildTeamsRail } from "./rail";

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

export class TeamsDmApp implements LaptopApp {
  readonly kind = "teams_dm" as const;
  readonly el: HTMLDivElement;
  private readonly run = createChallenge();

  constructor(challenge: LaptopChallenge, send: SendFn) {
    this.el = el<HTMLDivElement>("div", "teams-app");
    this.el.appendChild(buildTeamsRail("chat"));

    const from = challenge.from ?? "Lehrer";
    const question = challenge.question ?? "?";
    const options = challenge.options ?? [];

    const sidebar = el<HTMLDivElement>("div", "teams-sidebar");
    const head = el<HTMLDivElement>("div", "sidebar-head");
    head.appendChild(el("span", "sidebar-title", "Chat"));
    sidebar.appendChild(head);
    sidebar.appendChild(dmRow(from, question, true));
    for (const f of pickFakeDms(from + question)) {
      sidebar.appendChild(dmRow(f, "...", false));
    }
    this.el.appendChild(sidebar);

    const main = el<HTMLDivElement>("div", "teams-main");

    const headerBar = el<HTMLDivElement>("div", "chat-header");
    headerBar.appendChild(avatarTile(from, 32));
    const hWrap = el<HTMLDivElement>("div", "chat-header-text");
    hWrap.appendChild(el("div", "chat-header-name", from));
    hWrap.appendChild(el("div", "chat-header-sub", "Lehrperson · zuletzt aktiv: jetzt"));
    headerBar.appendChild(hWrap);
    main.appendChild(headerBar);

    main.appendChild(buildTaskBar(
      `${from} schreibt dir. Antworte korrekt um die Challenge zu schliessen.`,
    ));

    const stream = el<HTMLDivElement>("div", "chat-stream");
    const msg = el<HTMLDivElement>("div", "msg incoming");
    msg.appendChild(avatarTile(from, 28));
    const bubble = el<HTMLDivElement>("div", "bubble");
    bubble.appendChild(el("div", "bubble-author", from));
    bubble.appendChild(el("div", "bubble-text", question));
    msg.appendChild(bubble);
    stream.appendChild(msg);
    main.appendChild(stream);

    const composer = el<HTMLDivElement>("div", "composer");
    composer.appendChild(el("div", "composer-label", "Antwort wählen"));
    const replyRow = el<HTMLDivElement>("div", "reply-row");
    for (const opt of options) {
      const b = el<HTMLButtonElement>("button", "reply-btn", opt);
      b.onclick = () => {
        if (this.run.isLocked()) return;
        send(opt);
      };
      this.run.register(opt, b);
      replyRow.appendChild(b);
    }
    composer.appendChild(replyRow);
    main.appendChild(composer);
    main.appendChild(this.run.status);
    this.el.appendChild(main);
  }

  applyResult(pkt: GambleResultPkt): void {
    this.run.apply(pkt, "Antwort akzeptiert.", "Das war nicht die richtige Antwort.");
  }
}

function dmRow(name: string, preview: string, selected: boolean): HTMLDivElement {
  const row = el<HTMLDivElement>("div", "dm-row" + (selected ? " selected" : ""));
  row.appendChild(avatarTile(name, 32));
  const txt = el<HTMLDivElement>("div", "dm-text");
  txt.appendChild(el("div", "dm-name", name));
  txt.appendChild(el("div", "dm-preview", preview));
  row.appendChild(txt);
  return row;
}
