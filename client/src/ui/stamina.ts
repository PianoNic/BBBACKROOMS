export class StaminaBar {
  readonly element: HTMLDivElement;
  private readonly fill: HTMLDivElement;

  constructor() {
    this.element = document.createElement("div");
    this.element.id = "stamina";
    this.fill = document.createElement("div");
    this.fill.className = "fill";
    this.element.appendChild(this.fill);
    document.body.appendChild(this.element);
  }

  update(value: number): void {
    const pct = Math.max(0, Math.min(1, value)) * 100;
    this.fill.style.width = `${pct}%`;
    this.fill.style.background = value < 0.2 ? "#c0392b" : "#e8d268";
  }
}
