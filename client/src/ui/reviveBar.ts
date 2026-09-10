import { reviveProgress } from "./hud/state";

export class ReviveBar {
  set(progress: number): void {
    reviveProgress.value = progress;
  }
}
