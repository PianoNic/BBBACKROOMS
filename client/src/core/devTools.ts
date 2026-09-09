import type { WorldInit } from "../net/protocol";
import type { Player } from "../gameplay/player";

export type DevHandle = {
  init: WorldInit;
  player: Player;
  teacherPositions: () => { x: number; z: number }[];
  inspector: (on: boolean) => void;
};

export function installDevTools(handle: DevHandle): void {
  if (!import.meta.env.DEV) return;
  (window as unknown as { bbbDev?: DevHandle }).bbbDev = handle;
}
