import type { LaptopApp } from "../app";
import type { GambleResultPkt } from "../../../net/protocol";

const SYMBOLS = ["🍒", "🔔", "7️⃣"];
const REELS = 3;
const VISIBLE = 3;
const SYMBOL_PX = 64;
const ROW_PX = SYMBOL_PX + 8;
const REEL_W = 90;
const PAD = 12;

export class SlotsGame implements LaptopApp {
  readonly kind = "slots" as const;
  readonly el: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly btn: HTMLButtonElement;
  private readonly status: HTMLDivElement;
  private offsets = [0, 0, 0];
  private anchors = [0, 0, 0];
  private targets = [0, 0, 0];
  private spinning = [false, false, false];
  private spinStart = [0, 0, 0];
  private animating = false;
  private pending: { symbols: number[]; win: boolean } | null = null;
  private playFn: () => void;

  constructor(playFn: () => void) {
    this.playFn = playFn;
    this.el = document.createElement("div");
    this.el.className = "game slots";

    const w = REELS * REEL_W + (REELS + 1) * PAD;
    const h = VISIBLE * ROW_PX + 2 * PAD;
    this.canvas = document.createElement("canvas");
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.className = "slot-canvas";
    this.ctx = this.canvas.getContext("2d")!;
    this.el.appendChild(this.canvas);

    const controls = document.createElement("div");
    controls.className = "row";
    this.btn = document.createElement("button");
    this.btn.textContent = "SPIN";
    this.btn.className = "flip";
    this.btn.onclick = () => this.startSpin();
    controls.appendChild(this.btn);
    this.el.appendChild(controls);

    this.status = document.createElement("div");
    this.status.className = "status";
    this.status.textContent = "3-of-a-kind on the line";
    this.el.appendChild(this.status);

    this.draw();
  }

  applyResult(pkt: GambleResultPkt): void {
    if (pkt.game !== "slots" || !pkt.symbols) return;
    const symbols = pkt.symbols;
    this.pending = { symbols, win: pkt.win };
    const now = performance.now();
    const period = SYMBOLS.length * ROW_PX;
    for (let i = 0; i < REELS; i++) {
      const baseOffset = this.offsets[i];
      const cycles = 4 + i * 2;
      const want = symbols[i] * ROW_PX;
      const current = ((baseOffset % period) + period) % period;
      let delta = want - current;
      if (delta < 0) delta += period;
      this.targets[i] = baseOffset + cycles * period + delta;
      this.anchors[i] = this.offsets[i];
      this.spinStart[i] = now;
    }
  }

  private startSpin(): void {
    if (this.animating) return;
    this.animating = true;
    this.btn.disabled = true;
    this.status.textContent = "spinning…";
    this.status.className = "status";
    this.spinning = [true, true, true];
    this.playFn();
    requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    const dur = [1100, 1500, 1900];
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    let stillSpinning = false;
    for (let i = 0; i < REELS; i++) {
      if (!this.spinning[i]) continue;
      if (this.pending === null) {
        this.offsets[i] += 16;
        stillSpinning = true;
        continue;
      }
      const t = Math.min(1, (now - this.spinStart[i]) / dur[i]);
      this.offsets[i] = this.anchors[i] + (this.targets[i] - this.anchors[i]) * ease(t);
      if (t >= 1) {
        this.spinning[i] = false;
        this.offsets[i] = this.targets[i];
      } else {
        stillSpinning = true;
      }
    }
    this.draw();
    if (stillSpinning) {
      requestAnimationFrame(this.tick);
    } else {
      this.animating = false;
      this.btn.disabled = false;
      const win = this.pending?.win ?? false;
      this.status.textContent = win ? "🎉 WINNER - 3 of a kind" : "no match - try again";
      this.status.className = "status " + (win ? "win" : "lose");
      this.pending = null;
    }
  };

  private draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = "#0c0c10";
    ctx.fillRect(0, 0, w, h);

    const reelTop = PAD;
    const reelHeight = VISIBLE * ROW_PX;
    const paylineY = reelTop + ROW_PX + ROW_PX / 2; // centre of middle row

    for (let i = 0; i < REELS; i++) {
      const rx = PAD + i * (REEL_W + PAD);
      ctx.fillStyle = "#1c1c24";
      ctx.fillRect(rx, reelTop, REEL_W, reelHeight);
      ctx.strokeStyle = "#3a3a48";
      ctx.lineWidth = 2;
      ctx.strokeRect(rx + 1, reelTop + 1, REEL_W - 2, reelHeight - 2);

      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, reelTop, REEL_W, reelHeight);
      ctx.clip();

      ctx.font = `${SYMBOL_PX}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const offsetFrac = this.offsets[i] / ROW_PX;
      const centerSym = Math.floor(offsetFrac);
      const subFrac = offsetFrac - centerSym;
      for (let r = -1; r <= 1; r++) {
        const symIdx = ((centerSym + r) % SYMBOLS.length + SYMBOLS.length) % SYMBOLS.length;
        const y = paylineY + (r - subFrac) * ROW_PX;
        ctx.fillStyle = "#eee";
        ctx.fillText(SYMBOLS[symIdx], rx + REEL_W / 2, y);
      }
      ctx.restore();
    }

    // payline highlight
    ctx.strokeStyle = "#ffd54a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD / 2, paylineY);
    ctx.lineTo(w - PAD / 2, paylineY);
    ctx.stroke();
  }
}
