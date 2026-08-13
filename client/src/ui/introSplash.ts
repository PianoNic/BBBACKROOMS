/** Studio splash shown once per session before the title screen:
 *  "PianoNic Games / presents" fades through immediately, no gate.
 *  Any click skips it. The logo sting is attempted right away — browsers
 *  that block pre-gesture audio just roll the credits silently, and the
 *  title music starts on the first real interaction instead. */
import { playSfx, unlockAudio } from "../core/audio";
import { el } from "./dom";

const SEEN_KEY = "bbb-intro-seen";
const STING = "/sounds/actions/logo-sting.ogg";
const CREDITS_MS = 3400;

export function playIntro(): Promise<void> {
  // Once per tab session — endgame "back to lobby" reloads shouldn't replay it.
  if (sessionStorage.getItem(SEEN_KEY)) return Promise.resolve();
  sessionStorage.setItem(SEEN_KEY, "1");

  return new Promise((resolve) => {
    const overlay = el<HTMLDivElement>("div");
    overlay.id = "intro-splash";
    const credit = el<HTMLDivElement>("div", "intro-credit");
    credit.appendChild(el("div", "intro-studio", "PianoNic Games"));
    credit.appendChild(el("div", "intro-presents", "presents"));
    overlay.appendChild(credit);
    document.body.appendChild(overlay);

    unlockAudio();
    playSfx(STING, 0.85); // best effort — may be blocked before a gesture

    let finished = false;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      overlay.classList.add("intro-out");
      window.setTimeout(() => overlay.remove(), 650);
      resolve();
    };
    overlay.addEventListener("pointerdown", finish); // click skips
    window.setTimeout(finish, CREDITS_MS);
  });
}
