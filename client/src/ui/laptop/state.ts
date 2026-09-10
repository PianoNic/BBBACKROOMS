import { signal } from "@preact/signals";
import type { NetClient } from "../../net/client";
import type { GambleResultPkt, LaptopChallenge, LaptopGame } from "../../net/protocol";

export const laptopId = signal<string | null>(null);
export const laptopGame = signal<LaptopGame | null>(null);
export const laptopDone = signal(false);
export const laptopChallenge = signal<LaptopChallenge>({});
export const laptopResult = signal<GambleResultPkt | null>(null);

let net: NetClient | null = null;

export function setLaptopNet(client: NetClient): void {
  net = client;
}

export function sendLaptopChoice(choice?: string): void {
  const id = laptopId.value;
  if (!id || !net) return;
  net.send({ type: "gamble_play", laptopId: id, choice });
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.code === "Escape") {
    e.preventDefault();
    closeLaptop();
  }
}

export function isLaptopOpen(): boolean {
  return laptopId.value !== null;
}

export function openLaptop(
  id: string, game: LaptopGame, done: boolean, challenge?: LaptopChallenge,
): void {
  if (laptopId.value) return;
  if (document.pointerLockElement) document.exitPointerLock();
  laptopId.value = id;
  laptopGame.value = game;
  laptopDone.value = done;
  laptopChallenge.value = challenge ?? {};
  laptopResult.value = null;
  window.addEventListener("keydown", onKeyDown);
}

export function closeLaptop(): void {
  laptopId.value = null;
  laptopGame.value = null;
  laptopChallenge.value = {};
  laptopResult.value = null;
  window.removeEventListener("keydown", onKeyDown);
}

export function applyLaptopResult(pkt: GambleResultPkt): void {
  if (!laptopId.value || pkt.laptopId !== laptopId.value) return;
  if (laptopGame.value !== pkt.game) return;
  laptopResult.value = pkt;
  if (pkt.win) {
    window.setTimeout(() => {
      if (laptopId.value) closeLaptop();
    }, 2200);
  }
}
