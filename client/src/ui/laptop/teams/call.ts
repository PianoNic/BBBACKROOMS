/** Teams "Calls" view — the player must find the channel with a live
 *  meeting and click "Beitreten". */
import type { LaptopApp } from "../app";
import type { GambleResultPkt, LaptopChallenge } from "../../../net/protocol";
import { el } from "../../dom";
import { avatarTile, type SendFn } from "../layout/shared";
import { buildTaskBar } from "../layout/taskBar";
import { createChallenge } from "../layout/challenge";
import { buildTeamsRail } from "./rail";

export class TeamsCallApp implements LaptopApp {
  readonly kind = "teams_call" as const;
  readonly el: HTMLDivElement;
  private readonly run = createChallenge();

  constructor(challenge: LaptopChallenge, send: SendFn) {
    this.el = el<HTMLDivElement>("div", "teams-app");
    this.el.appendChild(buildTeamsRail("teams"));

    const channels = challenge.channels ?? [];
    const correct = channels[0] ?? "";

    const sidebar = el<HTMLDivElement>("div", "teams-sidebar");
    const head = el<HTMLDivElement>("div", "sidebar-head");
    head.appendChild(el("span", "sidebar-title", "Teams"));
    sidebar.appendChild(head);
    for (const ch of channels) {
      const row = el<HTMLDivElement>("div", "team-row");
      const emblem = el<HTMLSpanElement>("span", "team-emblem");
      emblem.textContent = ch.slice(0, 1).toUpperCase();
      row.append(emblem, el("span", "team-label", ch));
      sidebar.appendChild(row);
    }
    this.el.appendChild(sidebar);

    const main = el<HTMLDivElement>("div", "teams-main");
    main.appendChild(buildTaskBar(
      `${challenge.host ?? "Lehrer"} hat einen Anruf gestartet - tritt dem live Meeting bei.`,
    ));

    const list = el<HTMLDivElement>("div", "call-list");
    for (const ch of channels) {
      const row = el<HTMLDivElement>("div", "call-row");
      const headRow = el<HTMLDivElement>("div", "call-head");
      headRow.appendChild(avatarTile(ch, 36));
      headRow.appendChild(el("div", "call-name", ch));
      if (ch === correct) {
        const live = el<HTMLSpanElement>("span", "live-pill");
        live.appendChild(el("span", "live-dot"));
        live.appendChild(el("span", undefined, "Live"));
        headRow.appendChild(live);
      }
      const btn = el<HTMLButtonElement>(
        "button", "join-btn" + (ch === correct ? " primary" : ""),
        "Beitreten",
      );
      btn.onclick = () => {
        if (this.run.isLocked()) return;
        send(ch);
      };
      const right = el<HTMLDivElement>("div", "call-right");
      right.appendChild(btn);
      row.append(headRow, right);
      this.run.register(ch, row);
      list.appendChild(row);
    }
    main.appendChild(list);
    main.appendChild(this.run.status);
    this.el.appendChild(main);
  }

  applyResult(pkt: GambleResultPkt): void {
    this.run.apply(
      pkt,
      "Erfolg - du bist dem richtigen Call beigetreten.",
      "Falscher Call. Versuche einen anderen.",
    );
  }
}
