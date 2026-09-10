/** Teams channel Files tab — player picks the file the teacher asked for. */
import type { LaptopChallenge } from "../../../net/protocol";
import { fileSwatch } from "../layout/shared";
import { useChallenge } from "../layout/useChallenge";
import { TeamsRail } from "./rail";
import { sendLaptopChoice } from "../state";
import { TaskBar } from "../layout/taskBar";

const AUTHORS = ["L. Jeanneret", "R. Winsky", "S. Müller", "T. Berger", "A. Hofer"];
const WHEN = ["gestern", "vor 2 Tagen", "vor 1 Std.", "letzten Mo.", "13.05.2026"];

function pick<T>(list: T[], seed: string, salt: number): T {
  let h = salt;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}

export function TeamsFileApp(props: { challenge: LaptopChallenge }) {
  const channel = props.challenge.channel ?? "Channel";
  const files = props.challenge.files ?? [];
  const hint = props.challenge.hint ?? "";
  const run = useChallenge(sendLaptopChoice, "Datei geöffnet.", "Falsche Datei.");

  return (
    <div class="teams-app">
      <TeamsRail active="teams" />
      <div class="teams-sidebar">
        <div class="sidebar-head">
          <span class="sidebar-title">Teams</span>
        </div>
        <div class="team-row open">
          <span class="team-emblem">{channel.slice(0, 1).toUpperCase()}</span>
          <span class="team-label">{channel}</span>
        </div>
        <div class="channel-row selected">
          <span class="channel-hash">#</span>
          <span>Allgemein</span>
        </div>
      </div>
      <div class="teams-main">
        <div class="channel-header">
          <div class="channel-title">{`${channel} > Allgemein`}</div>
          <div class="channel-tabs">
            <span class="channel-tab">Beiträge</span>
            <span class="channel-tab active">Dateien</span>
            <span class="channel-tab">Wiki</span>
            <span class="channel-tab">+</span>
          </div>
        </div>
        <TaskBar text={`Öffne die Datei: ${hint}`} />
        <div class="file-list">
          <div class="file-row file-row-head">
            <span class="file-col file-col-name">Name</span>
            <span class="file-col file-col-by">Geändert von</span>
            <span class="file-col file-col-when">Geändert</span>
          </div>
          {files.map((f) => {
            const sw = fileSwatch(f);
            return (
              <div
                class={"file-row " + run.outcomeClassFor(f)}
                onClick={() => run.choose(f)}
                key={f}
              >
                <div class="file-col file-col-name">
                  <span class="file-badge" style={{ background: sw.color }}>{sw.label}</span>
                  <span>{f}</span>
                </div>
                <span class="file-col file-col-by">{pick(AUTHORS, f, 0)}</span>
                <span class="file-col file-col-when">{pick(WHEN, f, 7)}</span>
              </div>
            );
          })}
        </div>
        <div class={"challenge-status" + (run.outcome ? " " + run.outcome : "")}>
          {run.status}
        </div>
      </div>
    </div>
  );
}
