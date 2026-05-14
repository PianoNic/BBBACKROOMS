/** Left-edge vertical inventory HUD: medkit + potion + compass + tracker
 *  + goggles. Caps mirror the server `INVENTORY_CAPS` — keep in sync. */
const MEDKIT_CAP = 2;
const POTION_CAP = 3;

function slot(id: string, iconCls: string, hint?: string): {
  el: HTMLDivElement; count: HTMLSpanElement; hint: HTMLSpanElement | null;
} {
  const el = document.createElement("div");
  el.className = "slot";
  el.id = id;
  const icon = document.createElement("span");
  icon.className = `icon ${iconCls}`;
  el.appendChild(icon);
  const count = document.createElement("span");
  count.className = "count";
  count.textContent = "0";
  el.appendChild(count);
  let hintEl: HTMLSpanElement | null = null;
  if (hint) {
    hintEl = document.createElement("span");
    hintEl.className = "hint";
    hintEl.textContent = hint;
    el.appendChild(hintEl);
  }
  return { el, count, hint: hintEl };
}

export class InventoryHud {
  readonly element: HTMLDivElement;
  private medkits = 0;
  private potions = 0;
  private compasses = 0;
  private trackers = 0;
  private goggles = 0;
  private gps = 0;
  private readonly medCount: HTMLSpanElement;
  private readonly potCount: HTMLSpanElement;
  private readonly compCount: HTMLSpanElement;
  private readonly trackCount: HTMLSpanElement;
  private readonly gogCount: HTMLSpanElement;
  private readonly gogHint: HTMLSpanElement | null;
  private readonly gpsCount: HTMLSpanElement;
  private readonly medSlot: HTMLDivElement;
  private readonly potSlot: HTMLDivElement;
  private readonly compSlot: HTMLDivElement;
  private readonly trackSlot: HTMLDivElement;
  private readonly gogSlot: HTMLDivElement;
  private readonly gpsSlot: HTMLDivElement;

  constructor() {
    this.element = document.createElement("div");
    this.element.id = "inventory";
    const med = slot("inv-medkit", "med");
    const pot = slot("inv-potion", "pot", "[Q]");
    const comp = slot("inv-compass", "comp");
    const track = slot("inv-tracker", "track");
    const gog = slot("inv-goggles", "goggles", "[F]");
    const gps = slot("inv-gps", "gps");
    this.element.append(med.el, pot.el, comp.el, track.el, gog.el, gps.el);
    this.medCount = med.count;
    this.potCount = pot.count;
    this.compCount = comp.count;
    this.trackCount = track.count;
    this.gogCount = gog.count;
    this.gogHint = gog.hint;
    this.gpsCount = gps.count;
    this.medSlot = med.el;
    this.potSlot = pot.el;
    this.compSlot = comp.el;
    this.trackSlot = track.el;
    this.gogSlot = gog.el;
    this.gpsSlot = gps.el;
    this.compSlot.style.display = "none";
    this.trackSlot.style.display = "none";
    this.gogSlot.style.display = "none";
    this.gpsSlot.style.display = "none";
    document.body.appendChild(this.element);
  }

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
    this.medCount.textContent = `${medkits}/${MEDKIT_CAP}`;
    this.potCount.textContent = `${potions}/${POTION_CAP}`;
    this.compCount.textContent = String(compasses);
    this.trackCount.textContent = String(trackers);
    this.gogCount.textContent = String(goggles);
    this.gpsCount.textContent = String(gps);
    this.element.classList.toggle("med-empty", medkits === 0);
    this.element.classList.toggle("pot-empty", potions === 0);
    this.medSlot.classList.toggle("full", medkits >= MEDKIT_CAP);
    this.potSlot.classList.toggle("full", potions >= POTION_CAP);
    this.compSlot.style.display = compasses > 0 ? "" : "none";
    this.trackSlot.style.display = trackers > 0 ? "" : "none";
    this.gogSlot.style.display = goggles > 0 ? "" : "none";
    this.gpsSlot.style.display = gps > 0 ? "" : "none";
  }

  /** Update the goggles slot's [F] hint to either "READY", "ACTIVE", or a
   *  countdown ("23s"). Driven by gameLoop using the timestamps from the
   *  server's `goggles_state` packet. */
  updateGogglesState(
    nowMs: number, activeUntilMs: number, cooldownUntilMs: number,
  ): void {
    if (!this.gogHint || this.goggles === 0) return;
    if (nowMs < activeUntilMs) {
      this.gogHint.textContent = "ACTIVE";
      this.gogSlot.classList.add("active");
      this.gogSlot.classList.remove("cooldown");
    } else if (nowMs < cooldownUntilMs) {
      const remaining = Math.ceil((cooldownUntilMs - nowMs) / 1000);
      this.gogHint.textContent = `${remaining}s`;
      this.gogSlot.classList.remove("active");
      this.gogSlot.classList.add("cooldown");
    } else {
      this.gogHint.textContent = "[F]";
      this.gogSlot.classList.remove("active", "cooldown");
    }
  }

  hasMedkit(): boolean { return this.medkits > 0; }
  hasPotion(): boolean { return this.potions > 0; }
  hasCompass(): boolean { return this.compasses > 0; }
  hasTracker(): boolean { return this.trackers > 0; }
  hasGoggles(): boolean { return this.goggles > 0; }
  hasGps(): boolean { return this.gps > 0; }
}
