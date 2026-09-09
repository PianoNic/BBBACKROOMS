/** Browser-chrome builders (titlebar, address bar, brand header) and the
 *  per-game chrome spec. Shared by `LaptopOverlay` so the overlay itself
 *  stays focused on dispatch and lifecycle. */
import type { LaptopGame } from "../../../net/protocol";
import { el } from "../../dom";
import {
  icon, Lock, Minus, Square, X, Check, Dices,
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

export function buildTitlebar(title: string, onClose: () => void): HTMLDivElement {
  const titlebar = el<HTMLDivElement>("div", "titlebar");
  const titleWrap = el<HTMLDivElement>("div", "title-wrap");
  titleWrap.append(el("span", "tab-title", title));
  const winCtrls = el<HTMLDivElement>("div", "win-controls");
  const minBtn = el<HTMLButtonElement>("button", "wbtn min");
  minBtn.appendChild(icon(Minus, 14));
  const maxBtn = el<HTMLButtonElement>("button", "wbtn max");
  maxBtn.appendChild(icon(Square, 12));
  const closeBtn = el<HTMLButtonElement>("button", "wbtn close-btn");
  closeBtn.appendChild(icon(X, 14));
  closeBtn.onclick = onClose;
  winCtrls.append(minBtn, maxBtn, closeBtn);
  titlebar.append(titleWrap, winCtrls);
  return titlebar;
}

export function buildToolbar(url: string): HTMLDivElement {
  const toolbar = el<HTMLDivElement>("div", "toolbar");
  const navs = el<HTMLDivElement>("div", "navs");
  for (const node of [ArrowLeft, ArrowRight, RotateCw]) {
    const b = el<HTMLButtonElement>("button", "navbtn");
    b.appendChild(icon(node, 16));
    navs.appendChild(b);
  }
  const omnibox = el<HTMLDivElement>("div", "omnibox");
  omnibox.appendChild(icon(Lock, 12));
  omnibox.appendChild(el("span", "url", url));
  toolbar.append(navs, omnibox);
  return toolbar;
}

export function buildBrandHeader(
  spec: ChromeSpec, game: LaptopGame, done: boolean,
): HTMLDivElement {
  const header = el<HTMLDivElement>("div", "page-header");
  const brand = el<HTMLDivElement>("div", "brand");
  brand.appendChild(icon(Dices, 28));
  brand.appendChild(el("span", undefined, spec.brandLabel));
  const sub = el<HTMLDivElement>("div", "sub");
  if (done) {
    sub.appendChild(icon(Check, 14));
    sub.appendChild(el("span", undefined, " already cleared"));
  } else {
    sub.textContent = `play ${game} - win once to clear`;
  }
  header.append(brand, sub);
  return header;
}
