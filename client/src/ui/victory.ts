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

function releaseLock(): void {
  if (document.pointerLockElement) document.exitPointerLock();
}

type Endgame = "won" | "lost";
let active: Endgame | null = null;

function buildOverlay(kind: Endgame, net: NetClient | null): HTMLDivElement {
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
  root.append(h, sub, buttons);
  return root;
}

export function showVictory(net: NetClient | null = null): void {
  if (document.getElementById("victory")) return;
  releaseLock();
  active = "won";
  document.body.appendChild(buildOverlay("won", net));
}

export function showGameOver(net: NetClient | null = null): void {
  if (document.getElementById("victory")) return;
  releaseLock();
  active = "lost";
  document.body.appendChild(buildOverlay("lost", net));
}

export function isEndgameVisible(): boolean {
  return active !== null;
}

/** Tear the overlay down — called when the lobby resets and we soft-reload. */
export function clearEndgameOverlay(): void {
  document.getElementById("victory")?.remove();
  active = null;
}
