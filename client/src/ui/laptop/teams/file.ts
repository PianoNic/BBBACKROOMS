/** Teams channel Files tab — player picks the file the teacher asked for. */
import type { LaptopApp } from "../app";
import type { GambleResultPkt, LaptopChallenge } from "../../../net/protocol";
import { el } from "../../dom";
import { fileSwatch, type SendFn } from "../layout/shared";
import { buildTaskBar } from "../layout/taskBar";
import { createChallenge } from "../layout/challenge";
import { buildTeamsRail } from "./rail";

const AUTHORS = ["L. Jeanneret", "R. Winsky", "S. Müller", "T. Berger", "A. Hofer"];
const WHEN = ["gestern", "vor 2 Tagen", "vor 1 Std.", "letzten Mo.", "13.05.2026"];

function pick<T>(list: T[], seed: string, salt: number): T {
  let h = salt;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}

export class TeamsFileApp implements LaptopApp {
  readonly kind = "teams_file" as const;
  readonly el: HTMLDivElement;
  private readonly run = createChallenge();

  constructor(challenge: LaptopChallenge, send: SendFn) {
    this.el = el<HTMLDivElement>("div", "teams-app");
    this.el.appendChild(buildTeamsRail("teams"));

    const channel = challenge.channel ?? "Channel";
    const files = challenge.files ?? [];
    const hint = challenge.hint ?? "";

    const sidebar = el<HTMLDivElement>("div", "teams-sidebar");
    const head = el<HTMLDivElement>("div", "sidebar-head");
    head.appendChild(el("span", "sidebar-title", "Teams"));
    sidebar.appendChild(head);
    const teamRow = el<HTMLDivElement>("div", "team-row open");
    const emblem = el<HTMLSpanElement>("span", "team-emblem");
    emblem.textContent = channel.slice(0, 1).toUpperCase();
    teamRow.append(emblem, el("span", "team-label", channel));
    sidebar.appendChild(teamRow);
    const sub = el<HTMLDivElement>("div", "channel-row selected");
    sub.appendChild(el("span", "channel-hash", "#"));
    sub.appendChild(el("span", undefined, "Allgemein"));
    sidebar.appendChild(sub);
    this.el.appendChild(sidebar);

    const main = el<HTMLDivElement>("div", "teams-main");

    const headerBar = el<HTMLDivElement>("div", "channel-header");
    headerBar.appendChild(el("div", "channel-title", `${channel} > Allgemein`));
    const tabs = el<HTMLDivElement>("div", "channel-tabs");
    tabs.appendChild(el("span", "channel-tab", "Beiträge"));
    tabs.appendChild(el("span", "channel-tab active", "Dateien"));
    tabs.appendChild(el("span", "channel-tab", "Wiki"));
    tabs.appendChild(el("span", "channel-tab", "+"));
    headerBar.appendChild(tabs);
    main.appendChild(headerBar);

    main.appendChild(buildTaskBar(`Öffne die Datei: ${hint}`));

    const fileList = el<HTMLDivElement>("div", "file-list");
    const headerRow = el<HTMLDivElement>("div", "file-row file-row-head");
    headerRow.appendChild(el("span", "file-col file-col-name", "Name"));
    headerRow.appendChild(el("span", "file-col file-col-by", "Geändert von"));
    headerRow.appendChild(el("span", "file-col file-col-when", "Geändert"));
    fileList.appendChild(headerRow);
    for (const f of files) {
      const row = el<HTMLDivElement>("div", "file-row");
      const sw = fileSwatch(f);
      const badge = el<HTMLSpanElement>("span", "file-badge");
      badge.textContent = sw.label;
      badge.style.background = sw.color;
      const nameCol = el<HTMLDivElement>("div", "file-col file-col-name");
      nameCol.append(badge, el("span", undefined, f));
      row.appendChild(nameCol);
      row.appendChild(el("span", "file-col file-col-by", pick(AUTHORS, f, 0)));
      row.appendChild(el("span", "file-col file-col-when", pick(WHEN, f, 7)));
      row.onclick = () => {
        if (this.run.isLocked()) return;
        send(f);
      };
      this.run.register(f, row);
      fileList.appendChild(row);
    }
    main.appendChild(fileList);
    main.appendChild(this.run.status);
    this.el.appendChild(main);
  }

  applyResult(pkt: GambleResultPkt): void {
    this.run.apply(pkt, "Datei geöffnet.", "Falsche Datei.");
  }
}
