/** Tiny state machine shared by every Teams / Moodle challenge app.
 *
 *  Each challenge has the same shape: render a list of options, let the
 *  player click one, gate further clicks until the server replies, then
 *  flash green/red on the chosen row and show a status message. This
 *  helper encapsulates all that so the app files just describe layout. */
import type { GambleResultPkt } from "../../../net/protocol";
import { el } from "../../dom";

export type ChallengeRunner = {
  /** The "challenge-status" footer element — append it to your app. */
  readonly status: HTMLDivElement;
  /** Register a clickable option so it can be flashed on result. */
  register(choice: string, target: HTMLElement): void;
  /** True while a click is in flight (or the game is solved). Use this
   *  to early-return inside button handlers. */
  isLocked(): boolean;
  /** Apply a server result: flash the chosen option + show status text. */
  apply(pkt: GambleResultPkt, winText: string, loseText: string): void;
};

export function createChallenge(): ChallengeRunner {
  const status = el<HTMLDivElement>("div", "challenge-status");
  const targets = new Map<string, HTMLElement>();
  let locked = false;

  return {
    status,
    register(choice, target) { targets.set(choice, target); },
    isLocked: () => locked,
    apply(pkt, winText, loseText) {
      locked = true;
      const target = targets.get(pkt.choice ?? "");
      if (target) target.classList.add(pkt.win ? "ok" : "bad");
      status.textContent = pkt.win ? winText : loseText;
      status.className = "challenge-status " + (pkt.win ? "win" : "lose");
      if (!pkt.win) {
        window.setTimeout(() => { locked = false; }, 800);
      }
    },
  };
}
