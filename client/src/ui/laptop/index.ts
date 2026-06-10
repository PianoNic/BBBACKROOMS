/** Laptop overlay: a fake desktop window that hosts one of the laptop's
 *  apps (casino game, Teams or Moodle challenge). The chrome helpers live
 *  in `layout/chrome.ts`; this file is just the dispatcher + lifecycle. */
import type { NetClient } from "../../net/client";
import type {
  GambleResultPkt, LaptopChallenge, LaptopGame,
} from "../../net/protocol";
import type { LaptopApp } from "./app";
import { SlotsGame } from "./casino/slots";
import { DiceGame } from "./casino/dice";
import { CoinflipGame } from "./casino/coinflip";
import { TeamsCallApp } from "./teams/call";
import { TeamsDmApp } from "./teams/dm";
import { TeamsFileApp } from "./teams/file";
import { MoodleCourseApp } from "./moodle/course";
import { MoodleFileApp } from "./moodle/file";
import { MoodleQuizApp } from "./moodle/quiz";
import { RpgBattleApp } from "./rpg/battle";
import {
  buildBrandHeader, buildTitlebar, buildToolbar,
  chromeFor, isAppShell, shellClassFor,
} from "./layout/chrome";
import { el } from "../dom";

export class LaptopOverlay {
  private root: HTMLDivElement | null = null;
  private laptopId: string | null = null;
  private currentApp: LaptopApp | null = null;

  constructor(private readonly net: NetClient) {}

  isOpen(): boolean {
    return this.root !== null;
  }

  open(
    laptopId: string, game: LaptopGame, done: boolean,
    challenge?: LaptopChallenge,
  ): void {
    if (this.root) return;
    this.laptopId = laptopId;
    if (document.pointerLockElement) document.exitPointerLock();

    const spec = chromeFor(game);
    const root = el<HTMLDivElement>("div");
    root.id = "laptop";

    const win = el<HTMLDivElement>("div", `browser ${shellClassFor(game)}`);
    win.appendChild(buildTitlebar(spec.tabTitle, () => this.close()));
    win.appendChild(buildToolbar(spec.url));

    const appShell = isAppShell(game);
    const page = el<HTMLDivElement>("div", "page" + (appShell ? " page-app" : ""));
    if (!appShell) page.appendChild(buildBrandHeader(spec, game, done));

    const appWrap = el<HTMLDivElement>("div", appShell ? "app-wrap" : "game-wrap");
    this.currentApp = this.buildApp(game, challenge ?? {});
    appWrap.appendChild(this.currentApp.el);
    page.appendChild(appWrap);

    win.appendChild(page);
    root.appendChild(win);
    document.body.appendChild(root);
    this.root = root;
    window.addEventListener("keydown", this.onKeyDown);
  }

  applyResult(pkt: GambleResultPkt): void {
    if (!this.currentApp || pkt.laptopId !== this.laptopId) return;
    if (this.currentApp.kind !== pkt.game) return;
    this.currentApp.applyResult(pkt);
    if (pkt.win) {
      window.setTimeout(() => {
        if (this.root) this.close();
      }, 2200);
    }
  }

  close(): void {
    this.root?.remove();
    this.root = null;
    this.currentApp = null;
    this.laptopId = null;
    window.removeEventListener("keydown", this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === "Escape") {
      e.preventDefault();
      this.close();
    }
  };

  private buildApp(game: LaptopGame, challenge: LaptopChallenge): LaptopApp {
    const send = (choice?: string): void => this.send(choice);
    if (game === "slots") return new SlotsGame(() => send());
    if (game === "dice") return new DiceGame(() => send());
    if (game === "coinflip") return new CoinflipGame((c) => send(c));
    if (game === "teams_call") return new TeamsCallApp(challenge, send);
    if (game === "teams_dm") return new TeamsDmApp(challenge, send);
    if (game === "teams_file") return new TeamsFileApp(challenge, send);
    if (game === "moodle_course") return new MoodleCourseApp(challenge, send);
    if (game === "moodle_quiz") return new MoodleQuizApp(challenge, send);
    if (game === "rpg_battle") return new RpgBattleApp(challenge, send);
    return new MoodleFileApp(challenge, send);
  }

  private send(choice?: string): void {
    if (!this.laptopId) return;
    this.net.send({ type: "gamble_play", laptopId: this.laptopId, choice });
  }
}
