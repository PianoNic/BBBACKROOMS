import type { LaptopApp } from "../app";
import type { GambleResultPkt } from "../../../net/protocol";

const MIN_ROLL_MS = 1200;
const TIMEOUT_MS = 6000;


const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]],
};

/** Resting tilt so the cube reads as 3D when settled. Applied as a prefix
 *  to the per-value rotation that brings the chosen face toward the camera. */
const VIEW = "rotateX(-18deg) rotateY(24deg)";
const FACE_TRANSFORM: Record<number, string> = {
  1: VIEW,
  2: `${VIEW} rotateY(-90deg)`,
  3: `${VIEW} rotateX(-90deg)`,
  4: `${VIEW} rotateX(90deg)`,
  5: `${VIEW} rotateY(90deg)`,
  6: `${VIEW} rotateY(180deg)`,
};

type State = "idle" | "spinning" | "settled";

export class DiceGame implements LaptopApp {
  readonly kind = "dice" as const;
  readonly el: HTMLDivElement;
  private readonly dice: [HTMLDivElement, HTMLDivElement];
  private readonly btn: HTMLButtonElement;
  private readonly status: HTMLDivElement;
  private state: State = "idle";
  private finalRolls: [number, number] | null = null;
  private finalWin = false;
  private finalSum = 0;
  private spinStart = 0;
  private playFn: () => void;
  private timeoutId: number | null = null;

  constructor(playFn: () => void) {
    this.playFn = playFn;
    this.el = document.createElement("div");
    this.el.className = "game dice";

    const stage = document.createElement("div");
    stage.className = "dice-stage";
    this.dice = [buildDie("a"), buildDie("b")];
    stage.append(this.dice[0], this.dice[1]);
    this.el.appendChild(stage);

    const controls = document.createElement("div");
    controls.className = "row";
    this.btn = document.createElement("button");
    this.btn.textContent = "ROLL";
    this.btn.className = "flip";
    this.btn.onclick = () => this.startRoll();
    controls.appendChild(this.btn);
    this.el.appendChild(controls);

    this.status = document.createElement("div");
    this.status.className = "status";
    this.status.textContent = "sum >= 7 wins";
    this.el.appendChild(this.status);

    this.showFaces(1, 1);
  }

  applyResult(pkt: GambleResultPkt): void {
    if (pkt.game !== "dice" || !pkt.rolls || this.state !== "spinning") return;
    this.finalRolls = [
      Math.max(1, Math.min(6, pkt.rolls[0] ?? 1)),
      Math.max(1, Math.min(6, pkt.rolls[1] ?? 1)),
    ];
    this.finalWin = pkt.win;
    this.finalSum = pkt.sum ?? 0;
    const delay = Math.max(0, MIN_ROLL_MS - (performance.now() - this.spinStart));
    window.setTimeout(() => this.settle(), delay);
  }

  private startRoll(): void {
    if (this.state === "spinning") return;
    this.state = "spinning";
    this.btn.disabled = true;
    this.status.textContent = "rolling...";
    this.status.className = "status";
    this.spinStart = performance.now();
    this.finalRolls = null;
    for (const d of this.dice) {
      d.style.transform = "";
      d.classList.add("spinning");
    }
    this.playFn();
    if (this.timeoutId !== null) window.clearTimeout(this.timeoutId);
    this.timeoutId = window.setTimeout(() => {
      if (this.state === "spinning" && !this.finalRolls) {
        this.finalRolls = [1, 1];
        this.finalWin = false;
        this.finalSum = 2;
        this.settle();
      }
    }, TIMEOUT_MS);
  }

  private settle(): void {
    if (this.state !== "spinning" || !this.finalRolls) return;
    this.state = "settled";
    for (const d of this.dice) d.classList.remove("spinning");
    this.showFaces(this.finalRolls[0], this.finalRolls[1]);
    this.btn.disabled = false;
    const win = this.finalWin;
    this.status.textContent = win
      ? `WINNER ${this.finalSum}`
      : `${this.finalSum} - try again`;
    this.status.className = "status " + (win ? "win" : "lose");
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.state = "idle";
  }

  private showFaces(a: number, b: number): void {
    this.dice[0].style.transform = FACE_TRANSFORM[a];
    this.dice[1].style.transform = FACE_TRANSFORM[b];
  }
}

function buildDie(variant: string): HTMLDivElement {
  const die = document.createElement("div");
  die.className = `die die-${variant}`;
  for (let v = 1; v <= 6; v++) {
    const face = document.createElement("div");
    face.className = `face face-${v}`;
    for (const [px, py] of PIPS[v]) {
      const pip = document.createElement("span");
      pip.className = "pip";
      pip.style.left = `${px * 100}%`;
      pip.style.top = `${py * 100}%`;
      face.appendChild(pip);
    }
    die.appendChild(face);
  }
  return die;
}
