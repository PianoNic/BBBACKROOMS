import type { LaptopApp } from "../app";
import type { GambleResultPkt } from "../../../net/protocol";

const MIN_FLIP_MS = 1300;
const TIMEOUT_MS = 6000;

/** A flat disc rotating around the X axis. Heads is the front face,
 *  tails is on the back. Flipping = continuous rotation animation; on
 *  settle we transition to the exact face transform of the outcome. */
const FACE_TRANSFORM = {
  heads: "rotateX(0deg)",
  tails: "rotateX(180deg)",
} as const;

type Side = "heads" | "tails";
type State = "idle" | "flipping" | "settled";

export class CoinflipGame implements LaptopApp {
  readonly kind = "coinflip" as const;
  readonly el: HTMLDivElement;
  private readonly coin: HTMLDivElement;
  private readonly btn: HTMLButtonElement;
  private readonly status: HTMLDivElement;
  private state: State = "idle";
  private choice: Side = "heads";
  private finalOutcome: Side | null = null;
  private finalWin = false;
  private flipStart = 0;
  private timeoutId: number | null = null;
  private playFn: (choice: Side) => void;

  constructor(playFn: (choice: Side) => void) {
    this.playFn = playFn;
    this.el = document.createElement("div");
    this.el.className = "game coinflip";

    const stage = document.createElement("div");
    stage.className = "coin-stage";
    this.coin = buildCoin();
    stage.appendChild(this.coin);
    this.el.appendChild(stage);

    const choiceRow = document.createElement("div");
    choiceRow.className = "row";
    const mkBtn = (side: Side): HTMLButtonElement => {
      const b = document.createElement("button");
      b.textContent = side;
      b.className = "choice" + (this.choice === side ? " active" : "");
      b.onclick = () => {
        this.choice = side;
        for (const el of choiceRow.querySelectorAll("button"))
          el.classList.toggle("active", el.textContent === side);
      };
      return b;
    };
    choiceRow.append(mkBtn("heads"), mkBtn("tails"));
    this.el.appendChild(choiceRow);

    const controls = document.createElement("div");
    controls.className = "row";
    this.btn = document.createElement("button");
    this.btn.textContent = "FLIP";
    this.btn.className = "flip";
    this.btn.onclick = () => this.startFlip();
    controls.appendChild(this.btn);
    this.el.appendChild(controls);

    this.status = document.createElement("div");
    this.status.className = "status";
    this.el.appendChild(this.status);

    this.showFace("heads");
  }

  applyResult(pkt: GambleResultPkt): void {
    if (pkt.game !== "coinflip" || !pkt.outcome || this.state !== "flipping") return;
    this.finalOutcome = pkt.outcome;
    this.finalWin = pkt.win;
    const delay = Math.max(0, MIN_FLIP_MS - (performance.now() - this.flipStart));
    window.setTimeout(() => this.settle(), delay);
  }

  private startFlip(): void {
    if (this.state === "flipping") return;
    this.state = "flipping";
    this.btn.disabled = true;
    this.status.textContent = "flipping...";
    this.status.className = "status";
    this.flipStart = performance.now();
    this.finalOutcome = null;
    this.coin.style.transform = "";
    this.coin.classList.add("flipping");
    this.playFn(this.choice);
    if (this.timeoutId !== null) window.clearTimeout(this.timeoutId);
    this.timeoutId = window.setTimeout(() => {
      if (this.state === "flipping" && !this.finalOutcome) {
        this.finalOutcome = "heads";
        this.finalWin = false;
        this.settle();
      }
    }, TIMEOUT_MS);
  }

  private settle(): void {
    if (this.state !== "flipping" || !this.finalOutcome) return;
    this.state = "settled";
    this.coin.classList.remove("flipping");
    this.showFace(this.finalOutcome);
    this.btn.disabled = false;
    const win = this.finalWin;
    this.status.textContent = win
      ? `${this.finalOutcome} - winner!`
      : `${this.finalOutcome} - try again`;
    this.status.className = "status " + (win ? "win" : "lose");
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.state = "idle";
  }

  private showFace(side: Side): void {
    this.coin.style.transform = FACE_TRANSFORM[side];
  }
}

function buildCoin(): HTMLDivElement {
  const coin = document.createElement("div");
  coin.className = "coin";
  const heads = document.createElement("div");
  heads.className = "coin-face heads";
  heads.textContent = "H";
  const tails = document.createElement("div");
  tails.className = "coin-face tails";
  tails.textContent = "T";
  coin.append(heads, tails);
  return coin;
}
