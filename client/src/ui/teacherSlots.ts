/** Start-of-game slot machine: spins through the full teacher roster and
 *  lands on the 3 teachers picked for this run. Resolves when the
 *  countdown finishes so the rest of game-start can proceed.
 *
 *  Styling lives in `teacherSlotStyle.ts`; the tick/lock SFX in
 *  `teacherSlotSound.ts`. */
import { playSfx } from "../core/audio";
import { abilityCopy } from "../gameplay/abilityLabels";
import type { RosterEntry, TeacherInfo } from "../net/protocol";
import { resolveTeacherImage, resolveTeacherName, resolveTeacherThumb } from "../core/texturePacks";
import { el } from "./dom";
import { ensureTeacherSlotStyle } from "./teacherSlotStyle";
import { TICK_VOICES, playTick } from "./teacherSlotSound";

const LOCK_SOUND = "/sounds/metal/clang.mp3";
const CELL_H = 320;

type CellRefs = {
  root: HTMLDivElement;
  img: HTMLImageElement;
  name: HTMLDivElement;
  ability: HTMLDivElement;
};

class Reel {
  readonly el: HTMLDivElement;
  readonly targetIdx: number;
  private readonly strip: HTMLDivElement;
  private readonly entries: RosterEntry[];
  private readonly cells: [CellRefs, CellRefs];
  private readonly boundIdx: [number, number] = [-1, -1];
  private boundBase = 0;

  constructor(entries: RosterEntry[]) {
    this.entries = entries;
    this.targetIdx = entries.length - 1;
    this.el = el<HTMLDivElement>("div", "reel spinning");
    this.strip = el<HTMLDivElement>("div", "strip");
    this.cells = [Reel.buildCell(), Reel.buildCell()];
    this.strip.appendChild(this.cells[0].root);
    this.strip.appendChild(this.cells[1].root);
    this.el.appendChild(this.strip);
    this.bindCell(0, 0);
    this.bindCell(1, Math.min(1, this.targetIdx));
  }

  private static buildCell(): CellRefs {
    const root = el<HTMLDivElement>("div", "cell");
    const img = document.createElement("img");
    img.alt = "";
    root.appendChild(img);
    const name = el<HTMLDivElement>("div", "name");
    root.appendChild(name);
    const ability = el<HTMLDivElement>("div", "ability");
    root.appendChild(ability);
    return { root, img, name, ability };
  }

  private bindCell(cellIndex: 0 | 1, entryIndex: number): void {
    if (this.boundIdx[cellIndex] === entryIndex) return;
    this.boundIdx[cellIndex] = entryIndex;
    const e = this.entries[entryIndex];
    const cell = this.cells[cellIndex];
    const landed = entryIndex === this.targetIdx;
    cell.img.src = landed
      ? resolveTeacherImage(e.ability, -1, `/teachers/${e.image}`)
      : resolveTeacherThumb(e.ability, -1, e.image);
    cell.name.textContent = resolveTeacherName(e.ability, -1, e.name);
    cell.ability.textContent = abilityCopy(e.ability).label;
  }

  render(pos: number): number {
    const base = Math.min(Math.floor(pos), this.targetIdx);
    const frac = pos - base;
    this.strip.style.transform = `translateY(${-frac * CELL_H}px)`;
    if (base !== this.boundBase) {
      this.boundBase = base;
      this.bindCell(0, base);
      this.bindCell(1, Math.min(base + 1, this.targetIdx));
    }
    return base;
  }
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

export function showTeacherSlots(
  teachers: TeacherInfo[], roster: RosterEntry[],
): Promise<void> {
  ensureTeacherSlotStyle();
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

    const reels: Reel[] = [];
    const fallback = roster.length > 0
      ? roster
      : teachers.map((t) => ({
          image: t.image, name: t.name, subject: t.subject, ability: t.ability,
        }));

    teachers.forEach((t, i) => {
      const padBefore = 40 + i * 16;
      const list = pickStrip(fallback, {
        image: t.image, name: t.name, subject: t.subject, ability: t.ability,
      }, padBefore);
      const reel = new Reel(list);
      reelsEl.appendChild(reel.el);
      reels.push(reel);
      const desc = el<HTMLDivElement>("div", "desc");
      const descName = resolveTeacherName(t.ability, -1, t.name);
      desc.textContent = `${descName} — ${abilityCopy(t.ability).desc}`;
      descsEl.appendChild(desc);
    });

    document.body.appendChild(root);

    const startTimes = teachers.map((_, i) => i * 250);
    const stopTimes = teachers.map((_, i) => 2400 + i * 700);
    const t0 = performance.now();
    // Per-wheel last-cell index: each reel fires a tick as it visually
    // crosses a cell boundary. With cubic ease-out, cells pass fast at
    // the start and slow as the wheel decelerates → tick rate tracks
    // the wheel's actual speed for free.
    const lastCellIdx: number[] = teachers.map(() => -1);

    let countdownStarted = false;
    const finish = () => { root.remove(); resolve(); };
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
        if (remaining <= 0) { window.clearInterval(iv); finish(); }
        else render();
      }, 1000);
    };

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
            r.render(r.targetIdx);
            descsEl.children[i].classList.add("show");
            playSfx(LOCK_SOUND, 0.35);
          }
          return;
        }
        stillSpinning = true;
        const progress = (dt - startT) / (stopT - startT);
        const eased = 1 - Math.pow(1 - progress, 3);
        const pos = eased * r.targetIdx;
        const cellIdx = r.render(pos);
        if (cellIdx !== lastCellIdx[i]) {
          lastCellIdx[i] = cellIdx;
          const voice = TICK_VOICES[i % TICK_VOICES.length];
          playTick(0.18, voice.freq, voice.q);
        }
      });
      if (stillSpinning) requestAnimationFrame(tick);
      else if (!countdownStarted) startCountdown();
    };

    requestAnimationFrame(tick);
  });
}
