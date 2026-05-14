/** Centered hold-E progress arc shown while channelling a revive. */
export class ReviveBar {
  readonly element: HTMLDivElement;
  private readonly fill: HTMLDivElement;

  constructor() {
    this.element = document.createElement("div");
    this.element.id = "revive-bar";
    this.element.classList.add("hidden");
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = "REVIVING…";
    this.element.appendChild(label);
    const track = document.createElement("div");
    track.className = "track";
    this.fill = document.createElement("div");
    this.fill.className = "fill";
    track.appendChild(this.fill);
    this.element.appendChild(track);
    document.body.appendChild(this.element);
  }

  set(progress: number): void {
    if (progress < 0) {
      this.element.classList.add("hidden");
      this.fill.style.width = "0%";
      return;
    }
    this.element.classList.remove("hidden");
    this.fill.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  }
}
