import type { LaptopGame } from "../../../net/protocol";
import { Icon } from "../../Icon";
import {
  Lock, Minus, Square, X, Check, Dices,
  ArrowLeft, ArrowRight, RotateCw,
} from "../../icons";

export type ChromeSpec = {
  url: string;
  tabTitle: string;
  brandLabel: string;
};

export function chromeFor(game: LaptopGame): ChromeSpec {
  if (game.startsWith("teams_")) {
    return {
      url: "https://teams.microsoft.com/v2/",
      tabTitle: "Microsoft Teams",
      brandLabel: "Microsoft Teams",
    };
  }
  if (game.startsWith("moodle_")) {
    return {
      url: "https://moodle.backrooms-baden.ch/",
      tabTitle: "Moodle",
      brandLabel: "Moodle",
    };
  }
  if (game === "rpg_battle") {
    return {
      url: "https://games.backrooms-baden.ch/quest",
      tabTitle: "Schul-Quest",
      brandLabel: "Schul-Quest",
    };
  }
  return {
    url: "https://www.backrooms-baden.ch/casino",
    tabTitle: `Schul-Casino - ${game}`,
    brandLabel: "Schul-Casino",
  };
}

export function shellClassFor(game: LaptopGame): string {
  if (game.startsWith("teams_")) return "shell-teams";
  if (game.startsWith("moodle_")) return "shell-moodle";
  if (game === "rpg_battle") return "shell-rpg";
  return "shell-casino";
}

export function isAppShell(game: LaptopGame): boolean {
  return (
    game.startsWith("teams_") || game.startsWith("moodle_") ||
    game === "rpg_battle"
  );
}

export function Titlebar(props: { title: string; onClose: () => void }) {
  return (
    <div class="titlebar">
      <div class="title-wrap">
        <span class="tab-title">{props.title}</span>
      </div>
      <div class="win-controls">
        <button class="wbtn min"><Icon node={Minus} size={14} /></button>
        <button class="wbtn max"><Icon node={Square} size={12} /></button>
        <button class="wbtn close-btn" onClick={props.onClose}>
          <Icon node={X} size={14} />
        </button>
      </div>
    </div>
  );
}

export function Toolbar(props: { url: string }) {
  return (
    <div class="toolbar">
      <div class="navs">
        <button class="navbtn"><Icon node={ArrowLeft} size={16} /></button>
        <button class="navbtn"><Icon node={ArrowRight} size={16} /></button>
        <button class="navbtn"><Icon node={RotateCw} size={16} /></button>
      </div>
      <div class="omnibox">
        <Icon node={Lock} size={12} />
        <span class="url">{props.url}</span>
      </div>
    </div>
  );
}

export function BrandHeader(props: { spec: ChromeSpec; game: LaptopGame; done: boolean }) {
  return (
    <div class="page-header">
      <div class="brand">
        <Icon node={Dices} size={28} />
        <span>{props.spec.brandLabel}</span>
      </div>
      <div class="sub">
        {props.done ? (
          <>
            <Icon node={Check} size={14} />
            <span> already cleared</span>
          </>
        ) : (
          `play ${props.game} - win once to clear`
        )}
      </div>
    </div>
  );
}
