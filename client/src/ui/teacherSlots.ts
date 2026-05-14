/** Start-of-game slot machine: spins through the full teacher roster and
 * lands on the 3 teachers picked for this run. Resolves when the player
 * presses CONTINUE so the rest of game-start can proceed. */
import { getSfxDestination, playSfx } from "../core/audio";
import { abilityCopy } from "../gameplay/abilityLabels";
import type { RosterEntry, TeacherInfo } from "../net/protocol";
import { el } from "./dom";

const LOCK_SOUND = "/sounds/metal/clang.mp3";

/** Procedural slot-machine tick. A real click is a short broadband noise
 *  burst, NOT a pitched sweep — so we generate ~10ms of white noise
 *  through a sharp bandpass, with a 1ms attack and 8ms decay. */
let cachedClickBuffer: AudioBuffer | null = null;
function getClickBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (cachedClickBuffer && cachedClickBuffer.sampleRate === ctx.sampleRate) {
    return cachedClickBuffer;
  }
  const samples = Math.floor(ctx.sampleRate * 0.015);
  const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
  cachedClickBuffer = buf;
  return buf;
}
function playTick(volume: number, freq: number, q: number): void {
  const dest = getSfxDestination();
  if (!dest) return;
  const ctx = dest.context;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = getClickBuffer(ctx);
  // Each wheel gets a slightly different bandpass centre + Q so the
  // ticks don't sound like a single pulse train.
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(volume, now + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(now);
  src.stop(now + 0.02);
}

// Per-wheel tick voices — distinct bandpass centres so each reel
// chatters at its own pitch. Cycles if there are more than 4 wheels.
const TICK_VOICES = [
  { freq: 2600, q: 1.5 },
  { freq: 3100, q: 1.7 },
  { freq: 3700, q: 1.8 },
  { freq: 2200, q: 1.4 },
];

let styleInjected = false;

function ensureStyle(): void {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
    #teacher-slots {
      position: fixed; inset: 0; z-index: 90;
      background: radial-gradient(ellipse at center, rgba(20,14,4,0.96), rgba(0,0,0,0.98));
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 28px;
      font-family: 'VT323', monospace;
      color: #f3d98a;
    }
    #teacher-slots h2 {
      margin: 0; font-family: 'Rubik Glitch', 'VT323', monospace;
      font-size: clamp(36px, 6vh, 64px); letter-spacing: 0.12em;
      color: #c8a25a; text-shadow: 0 0 18px rgba(200,162,90,0.5);
    }
    #teacher-slots .sub { color: #a78250; letter-spacing: 0.2em; font-size: 18px; }
    #teacher-slots .reels {
      display: flex; gap: 22px; padding: 22px;
      background: rgba(0,0,0,0.6);
      border: 2px solid #5a4520;
      box-shadow: inset 0 0 60px rgba(200,162,90,0.15), 0 0 60px rgba(0,0,0,0.7);
    }
    #teacher-slots .reel {
      width: 220px; height: 320px; overflow: hidden;
      background: #0a0703; border: 1px solid #6d5424;
      position: relative;
    }
    #teacher-slots .reel .strip {
      position: absolute; left: 0; right: 0; top: 0;
      display: flex; flex-direction: column;
    }
    #teacher-slots .reel .cell {
      width: 100%; height: 320px; flex: 0 0 320px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 8px;
      box-sizing: border-box;
    }
    #teacher-slots .reel .cell img {
      width: 180px; height: 180px; object-fit: cover;
      filter: contrast(1.15) saturate(0.85) brightness(0.92);
      border: 1px solid #4a3818;
    }
    #teacher-slots .reel .cell .name {
      margin-top: 8px; font-size: 20px; color: #f3d98a;
      text-align: center; line-height: 1.1;
    }
    #teacher-slots .reel .cell .ability {
      margin-top: 4px; font-size: 16px; color: #c8a25a;
      text-align: center; letter-spacing: 0.08em;
    }
    #teacher-slots .reel.locked {
      border-color: #c8a25a;
      box-shadow: 0 0 24px rgba(200,162,90,0.55), inset 0 0 24px rgba(200,162,90,0.25);
      animation: slot-lock-flash 0.5s ease-out;
    }
    @keyframes slot-lock-flash {
      0%   { background: rgba(200,162,90,0.4); }
      100% { background: #0a0703; }
    }
    #teacher-slots .descriptions {
      display: flex; gap: 22px; width: min(740px, 90vw);
      justify-content: center; min-height: 70px;
    }
    #teacher-slots .descriptions .desc {
      width: 220px; font-size: 17px; color: #d9c282;
      text-align: center; opacity: 0; transition: opacity 0.4s;
    }
    #teacher-slots .descriptions .desc.show { opacity: 1; }
    #teacher-slots .countdown {
      font-family: 'VT323', monospace; font-size: 26px;
      letter-spacing: 0.2em; color: #c8a25a;
      text-shadow: 0 0 14px rgba(200,162,90,0.4);
      opacity: 0; transition: opacity 0.4s;
    }
    #teacher-slots .countdown.show { opacity: 1; }
    #teacher-slots .countdown b { color: #f3d98a; font-weight: normal; }
  `;
  const s = document.createElement("style");
  s.textContent = css;
  document.head.appendChild(s);
}

function buildCell(e: { image: string; name: string; ability: string }): HTMLDivElement {
  const ab = abilityCopy(e.ability);
  const cell = el<HTMLDivElement>("div", "cell");
  const img = document.createElement("img");
  img.src = `/teachers/${e.image}`;
  img.alt = "";
  cell.appendChild(img);
  cell.appendChild(el<HTMLDivElement>("div", "name", e.name));
  cell.appendChild(el<HTMLDivElement>("div", "ability", ab.label));
  return cell;
}

function pickStrip(
  roster: RosterEntry[], landOn: RosterEntry, padBefore: number,
): RosterEntry[] {
  const out: RosterEntry[] = [];
  for (let i = 0; i < padBefore; i++) {
    out.push(roster[Math.floor(Math.random() * roster.length)]);
  }
  out.push(landOn);
  return out;
}

const CELL_H = 320;

export function showTeacherSlots(
  teachers: TeacherInfo[], roster: RosterEntry[],
): Promise<void> {
  ensureStyle();
  return new Promise((resolve) => {
    const root = el<HTMLDivElement>("div");
    root.id = "teacher-slots";
    root.appendChild(el<HTMLHeadingElement>("h2", undefined, "TONIGHT'S TEACHERS"));
    root.appendChild(el<HTMLDivElement>("div", "sub", "spinning the roster…"));
    const reelsEl = el<HTMLDivElement>("div", "reels");
    root.appendChild(reelsEl);
    const descsEl = el<HTMLDivElement>("div", "descriptions");
    root.appendChild(descsEl);
    const countdownEl = el<HTMLDivElement>("div", "countdown");
    root.appendChild(countdownEl);

    const reels: { el: HTMLDivElement; strip: HTMLDivElement; }[] = [];
    const fallback = roster.length > 0
      ? roster
      : teachers.map((t) => ({ image: t.image, name: t.name, subject: t.subject, ability: t.ability }));

    teachers.forEach((t, i) => {
      const reel = el<HTMLDivElement>("div", "reel spinning");
      const strip = el<HTMLDivElement>("div", "strip");
      const padBefore = 40 + i * 16;
      const list = pickStrip(fallback, {
        image: t.image, name: t.name, subject: t.subject, ability: t.ability,
      }, padBefore);
      for (const entry of list) strip.appendChild(buildCell(entry));
      reel.appendChild(strip);
      reelsEl.appendChild(reel);
      reels.push({ el: reel, strip });

      const desc = el<HTMLDivElement>("div", "desc");
      desc.textContent = `${t.name} — ${abilityCopy(t.ability).desc}`;
      descsEl.appendChild(desc);
    });

    document.body.appendChild(root);

    const stripLengths = reels.map((r) => r.strip.children.length);
    const startTimes = teachers.map((_, i) => i * 250);
    const stopTimes = teachers.map((_, i) => 2400 + i * 700);
    const t0 = performance.now();
    // Per-wheel last-cell index so each reel fires a tick as it visually
    // crosses a cell boundary. With the cubic ease-out, cells pass fast
    // at the start and slow as the wheel decelerates → the tick rate
    // tracks the wheel's actual speed for free.
    const lastCellIdx: number[] = teachers.map(() => -1);

    const tick = (now: number) => {
      const dt = now - t0;
      let stillSpinning = false;
      reels.forEach((r, i) => {
        const startT = startTimes[i];
        const stopT = stopTimes[i];
        if (dt < startT) { stillSpinning = true; return; }
        if (dt >= stopT) {
          if (!r.el.classList.contains("locked")) {
            r.el.classList.remove("spinning");
            r.el.classList.add("locked");
            const targetIdx = stripLengths[i] - 1;
            r.strip.style.transform = `translateY(${-targetIdx * CELL_H}px)`;
            descsEl.children[i].classList.add("show");
            playSfx(LOCK_SOUND, 0.35);
          }
          return;
        }
        stillSpinning = true;
        const progress = (dt - startT) / (stopT - startT);
        const eased = 1 - Math.pow(1 - progress, 3);
        const targetIdx = stripLengths[i] - 1;
        const offset = eased * targetIdx * CELL_H;
        r.strip.style.transform = `translateY(${-offset}px)`;
        // Fire a tick whenever this reel crosses the next cell row.
        const cellIdx = Math.floor(eased * targetIdx);
        if (cellIdx !== lastCellIdx[i]) {
          lastCellIdx[i] = cellIdx;
          const voice = TICK_VOICES[i % TICK_VOICES.length];
          playTick(0.18, voice.freq, voice.q);
        }
      });
      if (stillSpinning) requestAnimationFrame(tick);
      else if (!countdownStarted) startCountdown();
    };

    let countdownStarted = false;
    const finish = () => {
      root.remove();
      resolve();
    };
    const startCountdown = () => {
      countdownStarted = true;
      countdownEl.classList.add("show");
      let remaining = 5;
      const b = document.createElement("b");
      const render = () => {
        b.textContent = String(remaining);
        countdownEl.replaceChildren(
          document.createTextNode("starting in "),
          b,
          document.createTextNode(remaining === 1 ? " second…" : " seconds…"),
        );
      };
      render();
      const iv = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          window.clearInterval(iv);
          finish();
        } else {
          render();
        }
      }, 1000);
    };

    requestAnimationFrame(tick);
  });
}
