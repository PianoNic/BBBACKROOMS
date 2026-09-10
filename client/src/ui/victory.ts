import type { NetClient } from "../net/client";
import type { ScoreboardData } from "../net/protocol";
import { mountMenuApp } from "./menu/mount";
import { endgame } from "./menu/state/overlays";

function releaseLock(): void {
  if (document.pointerLockElement) document.exitPointerLock();
}

export function showVictory(
  net: NetClient | null = null,
  scoreboard: ScoreboardData | null = null,
  selfId: string | null = null,
): void {
  if (endgame.value) return;
  releaseLock();
  mountMenuApp();
  endgame.value = { kind: "won", net, scoreboard, selfId };
}

export function showGameOver(
  net: NetClient | null = null,
  scoreboard: ScoreboardData | null = null,
  selfId: string | null = null,
): void {
  if (endgame.value) return;
  releaseLock();
  mountMenuApp();
  endgame.value = { kind: "lost", net, scoreboard, selfId };
}

export function isEndgameVisible(): boolean {
  return endgame.value !== null;
}

export function clearEndgameOverlay(): void {
  endgame.value = null;
}
