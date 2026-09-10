/** Studio splash shown once per session before the title screen:
 *  "PianoNic Games / presents" fades through immediately, no gate.
 *  Any click skips it. The logo sting is attempted right away — browsers
 *  that block pre-gesture audio just roll the credits silently, and the
 *  title music starts on the first real interaction instead. */
import { playSfx, unlockAudio } from "../core/audio";
import { INTRO_SEEN_KEY } from "./menu/state/storageKeys";
import { introPhase } from "./hud/state";

const STING = "/sounds/actions/logo-sting.ogg";
const CREDITS_MS = 3400;
const FADE_MS = 650;

let finishCurrent: (() => void) | null = null;

export function skipIntro(): void {
  finishCurrent?.();
}

export function playIntro(): Promise<void> {
  // Once per tab session — endgame "back to lobby" reloads shouldn't replay it.
  if (sessionStorage.getItem(INTRO_SEEN_KEY)) return Promise.resolve();
  sessionStorage.setItem(INTRO_SEEN_KEY, "1");

  return new Promise((resolve) => {
    introPhase.value = "visible";

    unlockAudio();
    playSfx(STING, 0.85); // best effort — may be blocked before a gesture

    let finished = false;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      finishCurrent = null;
      introPhase.value = "out";
      window.setTimeout(() => { introPhase.value = "hidden"; }, FADE_MS);
      resolve();
    };
    finishCurrent = finish;
    window.setTimeout(finish, CREDITS_MS);
  });
}
