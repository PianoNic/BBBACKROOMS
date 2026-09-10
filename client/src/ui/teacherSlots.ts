/** Start-of-game slot machine: spins through the full teacher roster and
 *  lands on the 3 teachers picked for this run. Resolves when the
 *  countdown finishes so the rest of game-start can proceed.
 *
 *  Styling lives in `styles/_teacher-slots.scss`; the tick/lock SFX in
 *  `teacherSlotSound.ts`. */
import { playSfx } from "../core/audio";
import { abilityCopy } from "../gameplay/abilityLabels";
import type { RosterEntry, TeacherInfo } from "../net/protocol";
import { resolveTeacherImage, resolveTeacherName, resolveTeacherThumb } from "../core/texturePacks";
import { TICK_VOICES, playTick } from "./teacherSlotSound";
import { teacherSlotsView, type ReelView, type TeacherCellView } from "./hud/state";

const LOCK_SOUND = "/sounds/metal/clang.mp3";
const CELL_H = 320;

function cellView(entries: RosterEntry[], entryIndex: number, targetIdx: number): TeacherCellView {
  const e = entries[entryIndex];
  const landed = entryIndex === targetIdx;
  return {
    imgSrc: landed
      ? resolveTeacherImage(e.ability, -1, `/teachers/${e.image}`)
      : resolveTeacherThumb(e.ability, -1, e.image),
    name: resolveTeacherName(e.ability, -1, e.name),
    ability: abilityCopy(e.ability).label,
  };
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
  return new Promise((resolve) => {
    const fallback = roster.length > 0
      ? roster
      : teachers.map((t) => ({
          image: t.image, name: t.name, subject: t.subject, ability: t.ability,
        }));

    const reelEntries: RosterEntry[][] = [];
    const targetIdxs: number[] = [];
    const descriptions: { text: string; show: boolean }[] = [];

    teachers.forEach((t, i) => {
      const padBefore = 40 + i * 16;
      const landOn: RosterEntry = { image: t.image, name: t.name, subject: t.subject, ability: t.ability };
      const list = pickStrip(fallback, landOn, padBefore);
      reelEntries.push(list);
      targetIdxs.push(list.length - 1);
      const descName = resolveTeacherName(t.ability, -1, t.name);
      descriptions.push({ text: `${descName} — ${abilityCopy(t.ability).desc}`, show: false });
    });

    const startTimes = teachers.map((_, i) => i * 250);
    const stopTimes = teachers.map((_, i) => 2400 + i * 700);
    const t0 = performance.now();
    // Per-wheel last-cell index: each reel fires a tick as it visually
    // crosses a cell boundary. With cubic ease-out, cells pass fast at
    // the start and slow as the wheel decelerates → tick rate tracks
    // the wheel's actual speed for free.
    const lastCellIdx: number[] = teachers.map(() => -1);
    const locked: boolean[] = teachers.map(() => false);

    const buildReelView = (i: number, pos: number): ReelView => {
      const targetIdx = targetIdxs[i];
      const base = Math.min(Math.floor(pos), targetIdx);
      const idx0 = base;
      const idx1 = Math.min(base + 1, targetIdx);
      return {
        cells: [
          cellView(reelEntries[i], idx0, targetIdx),
          cellView(reelEntries[i], idx1, targetIdx),
        ],
        translateY: -(pos - base) * CELL_H,
        spinning: !locked[i],
        locked: locked[i],
      };
    };

    const reelViews: ReelView[] = teachers.map((_, i) => buildReelView(i, 0));

    const publish = (countdown: number | null): void => {
      teacherSlotsView.value = {
        reels: reelViews.slice(),
        descriptions: descriptions.slice(),
        countdown,
      };
    };
    publish(null);

    let countdownStarted = false;
    let countdownValue = 5;
    const finish = () => { teacherSlotsView.value = null; resolve(); };
    const startCountdown = () => {
      countdownStarted = true;
      publish(countdownValue);
      const iv = window.setInterval(() => {
        countdownValue -= 1;
        if (countdownValue <= 0) { window.clearInterval(iv); finish(); }
        else publish(countdownValue);
      }, 1000);
    };

    const tick = (now: number) => {
      const dt = now - t0;
      let stillSpinning = false;
      teachers.forEach((_, i) => {
        const startT = startTimes[i];
        const stopT = stopTimes[i];
        if (dt < startT) { stillSpinning = true; return; }
        if (dt >= stopT) {
          if (!locked[i]) {
            locked[i] = true;
            reelViews[i] = buildReelView(i, targetIdxs[i]);
            descriptions[i] = { ...descriptions[i], show: true };
            playSfx(LOCK_SOUND, 0.35);
          }
          return;
        }
        stillSpinning = true;
        const progress = (dt - startT) / (stopT - startT);
        const eased = 1 - Math.pow(1 - progress, 3);
        const pos = eased * targetIdxs[i];
        reelViews[i] = buildReelView(i, pos);
        const cellIdx = Math.min(Math.floor(pos), targetIdxs[i]);
        if (cellIdx !== lastCellIdx[i]) {
          lastCellIdx[i] = cellIdx;
          const voice = TICK_VOICES[i % TICK_VOICES.length];
          playTick(0.18, voice.freq, voice.q);
        }
      });
      if (stillSpinning) {
        publish(null);
        requestAnimationFrame(tick);
      } else if (!countdownStarted) {
        startCountdown();
      }
    };

    requestAnimationFrame(tick);
  });
}
