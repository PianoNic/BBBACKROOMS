import { mountMenuApp } from "./menu/mount";
import { pauseMenu } from "./menu/state/overlays";
import type { CamControl, MicControl, PauseMenuOptions } from "./menu/state/overlays";

export type { CamControl, MicControl };

export function showPauseMenu(opts: PauseMenuOptions): void {
  mountMenuApp();
  pauseMenu.value = opts;
}
