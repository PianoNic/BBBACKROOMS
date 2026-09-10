import { useEffect, useRef, useState } from "preact/hooks";
import { laptopResult, sendLaptopChoice } from "../state";

const SYMBOLS = ["🍒", "🔔", "7️⃣"];
const REELS = 3;
const VISIBLE = 3;
const SYMBOL_PX = 64;
const ROW_PX = SYMBOL_PX + 8;
const REEL_W = 90;
const PAD = 12;

type Anim = {
  offsets: number[];
  anchors: number[];
  targets: number[];
  spinning: boolean[];
  spinStart: number[];
  animating: boolean;
  pending: { symbols: number[]; win: boolean } | null;
  raf: number | null;
};

export function SlotsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [status, setStatus] = useState("3-of-a-kind on the line");
  const [statusClass, setStatusClass] = useState("status");
  const anim = useRef<Anim>({
    offsets: [0, 0, 0],
    anchors: [0, 0, 0],
    targets: [0, 0, 0],
    spinning: [false, false, false],
    spinStart: [0, 0, 0],
    animating: false,
    pending: null,
    raf: null,
  });

  const draw = (): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const a = anim.current;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#0c0c10";
    ctx.fillRect(0, 0, w, h);

    const reelTop = PAD;
    const reelHeight = VISIBLE * ROW_PX;
    const paylineY = reelTop + ROW_PX + ROW_PX / 2;

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

      const offsetFrac = a.offsets[i] / ROW_PX;
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

    ctx.strokeStyle = "#ffd54a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD / 2, paylineY);
    ctx.lineTo(w - PAD / 2, paylineY);
    ctx.stroke();
  };

  const tick = (now: number): void => {
    const a = anim.current;
    const dur = [1100, 1500, 1900];
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    let stillSpinning = false;
    for (let i = 0; i < REELS; i++) {
      if (!a.spinning[i]) continue;
      if (a.pending === null) {
        a.offsets[i] += 16;
        stillSpinning = true;
        continue;
      }
      const t = Math.min(1, (now - a.spinStart[i]) / dur[i]);
      a.offsets[i] = a.anchors[i] + (a.targets[i] - a.anchors[i]) * ease(t);
      if (t >= 1) {
        a.spinning[i] = false;
        a.offsets[i] = a.targets[i];
      } else {
        stillSpinning = true;
      }
    }
    draw();
    if (stillSpinning) {
      a.raf = requestAnimationFrame(tick);
    } else {
      a.animating = false;
      setSpinning(false);
      const win = a.pending?.win ?? false;
      setStatus(win ? "🎉 WINNER - 3 of a kind" : "no match - try again");
      setStatusClass("status " + (win ? "win" : "lose"));
      a.pending = null;
    }
  };

  useEffect(() => {
    draw();
    return () => {
      if (anim.current.raf !== null) cancelAnimationFrame(anim.current.raf);
    };
  }, []);

  const pkt = laptopResult.value;
  useEffect(() => {
    if (!pkt || pkt.game !== "slots" || !pkt.symbols) return;
    const a = anim.current;
    const symbols = pkt.symbols;
    a.pending = { symbols, win: pkt.win };
    const now = performance.now();
    const period = SYMBOLS.length * ROW_PX;
    for (let i = 0; i < REELS; i++) {
      const baseOffset = a.offsets[i];
      const cycles = 4 + i * 2;
      const want = symbols[i] * ROW_PX;
      const current = ((baseOffset % period) + period) % period;
      let delta = want - current;
      if (delta < 0) delta += period;
      a.targets[i] = baseOffset + cycles * period + delta;
      a.anchors[i] = a.offsets[i];
      a.spinStart[i] = now;
    }
  }, [pkt]);

  const startSpin = (): void => {
    const a = anim.current;
    if (a.animating) return;
    a.animating = true;
    setSpinning(true);
    setStatus("spinning…");
    setStatusClass("status");
    a.spinning = [true, true, true];
    sendLaptopChoice();
    a.raf = requestAnimationFrame(tick);
  };

  const w = REELS * REEL_W + (REELS + 1) * PAD;
  const h = VISIBLE * ROW_PX + 2 * PAD;

  return (
    <div class="game slots">
      <canvas ref={canvasRef} width={w} height={h} class="slot-canvas" />
      <div class="row">
        <button class="flip" disabled={spinning} onClick={startSpin}>SPIN</button>
      </div>
      <div class={statusClass}>{status}</div>
    </div>
  );
}
