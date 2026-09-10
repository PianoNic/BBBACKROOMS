import { gogglesHint, inventoryCounts, type GogglesHintState } from "./hud/state";

export class InventoryHud {
  private medkits = 0;
  private potions = 0;
  private compasses = 0;
  private trackers = 0;
  private goggles = 0;
  private gps = 0;

  set(
    medkits: number, potions: number, compasses: number,
    trackers: number, goggles: number, gps: number,
  ): void {
    this.medkits = medkits;
    this.potions = potions;
    this.compasses = compasses;
    this.trackers = trackers;
    this.goggles = goggles;
    this.gps = gps;
    const current = inventoryCounts.value;
    if (
      current.medkits !== medkits || current.potions !== potions
      || current.compasses !== compasses || current.trackers !== trackers
      || current.goggles !== goggles || current.gps !== gps
    ) {
      inventoryCounts.value = { medkits, potions, compasses, trackers, goggles, gps };
    }
  }

  /** Update the goggles slot's [F] hint to either "READY", "ACTIVE", or a
   *  countdown ("23s"). Driven by gameLoop using the timestamps from the
   *  server's `goggles_state` packet. */
  updateGogglesState(
    nowMs: number, activeUntilMs: number, cooldownUntilMs: number,
  ): void {
    if (this.goggles === 0) return;
    let text: string;
    let state: GogglesHintState;
    if (nowMs < activeUntilMs) {
      text = "ACTIVE";
      state = "active";
    } else if (nowMs < cooldownUntilMs) {
      const remaining = Math.ceil((cooldownUntilMs - nowMs) / 1000);
      text = `${remaining}s`;
      state = "cooldown";
    } else {
      text = "[F]";
      state = "idle";
    }
    const current = gogglesHint.value;
    if (current.text !== text || current.state !== state) {
      gogglesHint.value = { text, state };
    }
  }

  hasMedkit(): boolean { return this.medkits > 0; }
  hasPotion(): boolean { return this.potions > 0; }
  hasCompass(): boolean { return this.compasses > 0; }
  hasTracker(): boolean { return this.trackers > 0; }
  hasGoggles(): boolean { return this.goggles > 0; }
  hasGps(): boolean { return this.gps > 0; }
}
