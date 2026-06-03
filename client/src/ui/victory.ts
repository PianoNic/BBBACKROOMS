/** Victory + game-over overlays.
 *
 *  Two buttons:
 *   - "Back to lobby"      → tells the server to reset the lobby to the
 *                            waiting room; all clients receive the new
 *                            `lobby_state` and reload to land in the
 *                            lobby room together.
 *   - "Exit to title screen" → clears the resume hint and reloads to the
 *                            title menu. */
import type { NetClient } from "../net/client";
import type { ScoreboardData } from "../net/protocol";

function releaseLock(): void {
  if (document.pointerLockElement) document.exitPointerLock();
}

type Endgame = "won" | "lost";
let active: Endgame | null = null;

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function buildScoreboard(sb: ScoreboardData, selfId: string | null): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "scoreboard";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML =
    "<tr><th>Player</th><th>Tasks</th><th>Stuns</th><th>Revives</th>" +
    "<th>Items</th><th>Survived</th><th>Status</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  // Survivors first, then by tasks completed — most useful read order.
  const rows = [...sb.players].sort(
    (a, b) => Number(b.extracted) - Number(a.extracted) || b.tasks - a.tasks,
  );
  for (const pl of rows) {
    const tr = document.createElement("tr");
    if (pl.id === selfId) tr.classList.add("self");

    const nameTd = document.createElement("td");
    nameTd.className = "name";
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = pl.color;
    // textContent (not innerHTML) — player names are untrusted input.
    nameTd.append(swatch, document.createTextNode(pl.name || "player"));
    tr.appendChild(nameTd);

    for (const v of [pl.tasks, pl.stuns, pl.revives, pl.items, fmtTime(pl.survivalMs)]) {
      const td = document.createElement("td");
      td.textContent = String(v);
      tr.appendChild(td);
    }

    const st = document.createElement("td");
    st.textContent = pl.extracted ? "ESCAPED" : pl.died ? "CAUGHT" : "—";
    if (pl.extracted) st.classList.add("ok");
    else if (pl.died) st.classList.add("bad");
    tr.appendChild(st);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const tfoot = document.createElement("tfoot");
  const t = sb.team;
  const foot = document.createElement("tr");
  foot.innerHTML =
    `<td class="name">Team (${t.extracted}/${t.total} out)</td>` +
    `<td>${t.tasks}</td><td>${t.stuns}</td><td>${t.revives}</td>` +
    `<td>${t.items}</td><td>${fmtTime(sb.durationMs)}</td><td></td>`;
  tfoot.appendChild(foot);
  table.appendChild(tfoot);

  wrap.appendChild(table);
  return wrap;
}

function buildOverlay(
  kind: Endgame,
  net: NetClient | null,
  scoreboard: ScoreboardData | null,
  selfId: string | null,
): HTMLDivElement {
  const root = document.createElement("div");
  root.id = "victory";
  if (kind === "lost") root.classList.add("lost");
  const h = document.createElement("h1");
  h.textContent = kind === "won" ? "ALL EXTRACTED" : "EVERYONE WAS CAUGHT";
  const sub = document.createElement("p");
  sub.textContent = kind === "won"
    ? "The team escaped the school."
    : "No one made it out of the school.";

  const buttons = document.createElement("div");
  buttons.className = "endgame-buttons";

  const backBtn = document.createElement("button");
  backBtn.id = "back-to-lobby-btn";
  backBtn.className = "primary";
  backBtn.textContent = "Back to lobby";
  if (!net) {
    backBtn.disabled = true;
    backBtn.title = "offline — exit instead";
  } else {
    backBtn.onclick = () => {
      backBtn.disabled = true;
      backBtn.textContent = "Returning...";
      net.send({ type: "back_to_lobby" });
    };
  }

  const exitBtn = document.createElement("button");
  exitBtn.textContent = "Exit to title screen";
  exitBtn.onclick = () => {
    sessionStorage.removeItem("bbb_lobby_resume");
    location.reload();
  };

  buttons.append(backBtn, exitBtn);
  root.append(h, sub);
  if (scoreboard) root.append(buildScoreboard(scoreboard, selfId));
  root.append(buttons);
  return root;
}

export function showVictory(
  net: NetClient | null = null,
  scoreboard: ScoreboardData | null = null,
  selfId: string | null = null,
): void {
  if (document.getElementById("victory")) return;
  releaseLock();
  active = "won";
  document.body.appendChild(buildOverlay("won", net, scoreboard, selfId));
}

export function showGameOver(
  net: NetClient | null = null,
  scoreboard: ScoreboardData | null = null,
  selfId: string | null = null,
): void {
  if (document.getElementById("victory")) return;
  releaseLock();
  active = "lost";
  document.body.appendChild(buildOverlay("lost", net, scoreboard, selfId));
}

export function isEndgameVisible(): boolean {
  return active !== null;
}

/** Tear the overlay down — called when the lobby resets and we soft-reload. */
export function clearEndgameOverlay(): void {
  document.getElementById("victory")?.remove();
  active = null;
}
