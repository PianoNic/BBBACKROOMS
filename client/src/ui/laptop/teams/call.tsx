/** Teams "Calls" view — the player must find the channel with a live
 *  meeting and click "Beitreten". */
import type { LaptopChallenge } from "../../../net/protocol";
import { Avatar } from "../layout/Avatar";
import { useChallenge } from "../layout/useChallenge";
import { TeamsRail } from "./rail";
import { sendLaptopChoice } from "../state";
import { TaskBar } from "../layout/taskBar";

export function TeamsCallApp(props: { challenge: LaptopChallenge }) {
  const channels = props.challenge.channels ?? [];
  const correct = channels[0] ?? "";
  const run = useChallenge(
    sendLaptopChoice,
    "Erfolg - du bist dem richtigen Call beigetreten.",
    "Falscher Call. Versuche einen anderen.",
  );

  return (
    <div class="teams-app">
      <TeamsRail active="teams" />
      <div class="teams-sidebar">
        <div class="sidebar-head">
          <span class="sidebar-title">Teams</span>
        </div>
        {channels.map((ch) => (
          <div class="team-row" key={ch}>
            <span class="team-emblem">{ch.slice(0, 1).toUpperCase()}</span>
            <span class="team-label">{ch}</span>
          </div>
        ))}
      </div>
      <div class="teams-main">
        <TaskBar text={`${props.challenge.host ?? "Lehrer"} hat einen Anruf gestartet - tritt dem live Meeting bei.`} />
        <div class="call-list">
          {channels.map((ch) => (
            <div class={"call-row " + run.outcomeClassFor(ch)} key={ch}>
              <div class="call-head">
                <Avatar name={ch} size={36} />
                <div class="call-name">{ch}</div>
                {ch === correct ? (
                  <span class="live-pill">
                    <span class="live-dot" />
                    <span>Live</span>
                  </span>
                ) : null}
              </div>
              <div class="call-right">
                <button
                  class={"join-btn" + (ch === correct ? " primary" : "")}
                  onClick={() => run.choose(ch)}
                >
                  Beitreten
                </button>
              </div>
            </div>
          ))}
        </div>
        <div class={"challenge-status" + (run.outcome ? " " + run.outcome : "")}>
          {run.status}
        </div>
      </div>
    </div>
  );
}
