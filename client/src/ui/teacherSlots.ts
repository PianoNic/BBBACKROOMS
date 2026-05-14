/** Start-of-game slot machine: spins through the full teacher roster and
 *  lands on the 3 teachers picked for this run. Resolves when the
 *  countdown finishes so the rest of game-start can proceed.
 *
 *  Styling lives in `teacherSlotStyle.ts`; the tick/lock SFX in
 *  `teacherSlotSound.ts`. */
import { playSfx } from "../core/audio";
import { abilityCopy } from "../gameplay/abilityLabels";
import type { RosterEntry, TeacherInfo } from "../net/protocol";
import { el } from "./dom";
import { ensureTeacherSlotStyle } from "./teacherSlotStyle";
import { TICK_VOICES, playTick } from "./teacherSlotSound";

const LOCK_SOUND = "/sounds/metal/clang.mp3";
const CELL_H = 320;

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

    const reels: { el: HTMLDivElement; strip: HTMLDivElement; }[] = [];
    const fallback = roster.length > 0
      ? roster
      : teachers.map((t) => ({
          image: t.image, name: t.name, subject: t.subject, ability: t.ability,
        }));

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
        r.strip.style.transform = `translateY(${-eased * targetIdx * CELL_H}px)`;
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

    requestAnimationFrame(tick);
  });
}
