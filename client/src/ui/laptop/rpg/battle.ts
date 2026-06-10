/** BBB Quest — turn-based RPG against a teacher boss. The server resolves
 *  every turn (gamble_play with strike/special/heal); this app only renders
 *  the returned battle snapshot: HP bars, hit shakes and a combat log. */
import type { LaptopApp } from "../app";
import type {
  GambleResultPkt, LaptopChallenge, RpgBattle,
} from "../../../net/protocol";
import { el } from "../../dom";
import { type SendFn } from "../layout/shared";

const ACTIONS: { key: string; label: string; sub: string }[] = [
  { key: "strike", label: "⚔️ Angriff", sub: "4–7 Schaden" },
  { key: "special", label: "✨ Spezial", sub: "9–14, kann verfehlen" },
  { key: "heal", label: "❤️ Heilen", sub: "+6–9 LP" },
];

type Fighter = {
  root: HTMLDivElement;
  fill: HTMLDivElement;
  hpText: HTMLSpanElement;
  max: number;
};

function buildFighter(
  side: "boss" | "player", emoji: string, name: string, max: number,
): Fighter {
  const root = el<HTMLDivElement>("div", `rpg-fighter ${side}`);
  root.appendChild(el("div", "rpg-sprite", emoji));
  root.appendChild(el("div", "rpg-name", name));
  const bar = el<HTMLDivElement>("div", "rpg-hp");
  const fill = el<HTMLDivElement>("div", "rpg-hp-fill");
  fill.style.width = "100%";
  bar.appendChild(fill);
  root.appendChild(bar);
  const hpText = el<HTMLSpanElement>("span", "rpg-hp-text", `${max} / ${max} LP`);
  root.appendChild(hpText);
  return { root, fill, hpText, max };
}

function setHp(f: Fighter, hp: number): void {
  f.fill.style.width = `${(Math.max(0, hp) / f.max) * 100}%`;
  f.hpText.textContent = `${Math.max(0, hp)} / ${f.max} LP`;
}

function shake(elm: HTMLElement): void {
  elm.classList.remove("rpg-shake");
  void elm.offsetWidth; // restart the CSS animation
  elm.classList.add("rpg-shake");
}

export class RpgBattleApp implements LaptopApp {
  readonly kind = "rpg_battle" as const;
  readonly el: HTMLDivElement;
  private readonly boss: Fighter;
  private readonly player: Fighter;
  private readonly log: HTMLDivElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private readonly bossName: string;
  private locked = false;

  constructor(challenge: LaptopChallenge, send: SendFn) {
    this.bossName = challenge.boss ?? "Lehrer-Boss";
    const playerMax = challenge.playerMaxHp ?? 20;
    const bossMax = challenge.bossMaxHp ?? 22;

    this.el = el<HTMLDivElement>("div", "rpg-app");

    const header = el<HTMLDivElement>("div", "rpg-header");
    header.appendChild(el("div", "rpg-title", "⚔️ BBB QUEST"));
    header.appendChild(el(
      "div", "rpg-subtitle", `Besiege ${this.bossName} und schalte den Laptop frei!`,
    ));
    this.el.appendChild(header);

    const arena = el<HTMLDivElement>("div", "rpg-arena");
    this.boss = buildFighter("boss", "🧑‍🏫", this.bossName, bossMax);
    this.player = buildFighter("player", "🎒", "Du", playerMax);
    arena.appendChild(this.boss.root);
    arena.appendChild(el("div", "rpg-vs", "VS"));
    arena.appendChild(this.player.root);
    this.el.appendChild(arena);

    this.log = el<HTMLDivElement>("div", "rpg-log");
    this.pushLog(`${this.bossName} versperrt dir den Weg!`);
    this.el.appendChild(this.log);

    const actions = el<HTMLDivElement>("div", "rpg-actions");
    for (const a of ACTIONS) {
      const btn = el<HTMLButtonElement>("button", "rpg-action");
      btn.appendChild(el("span", "rpg-action-label", a.label));
      btn.appendChild(el("span", "rpg-action-sub", a.sub));
      btn.onclick = () => {
        if (this.locked) return;
        this.locked = true;
        send(a.key);
      };
      this.buttons.push(btn);
      actions.appendChild(btn);
    }
    this.el.appendChild(actions);
  }

  private pushLog(line: string): void {
    this.log.appendChild(el("div", "rpg-log-line", line));
    while (this.log.children.length > 4) this.log.firstChild?.remove();
  }

  applyResult(pkt: GambleResultPkt): void {
    const b = pkt.battle;
    if (!b) return;
    this.narrate(b);
    setHp(this.boss, b.bossHp);
    setHp(this.player, b.playerHp);
    if (b.playerDmg > 0) shake(this.boss.root);
    if (b.bossDmg > 0) shake(this.player.root);

    if (b.bossDown) {
      this.pushLog(`🏆 ${this.bossName} ist besiegt! Laptop freigeschaltet.`);
      return; // stays locked — the overlay closes itself on win
    }
    if (b.playerDown) {
      this.pushLog("💀 Du wurdest aus dem Schulzimmer geworfen! Neuer Versuch…");
      window.setTimeout(() => {
        setHp(this.boss, this.boss.max);
        setHp(this.player, this.player.max);
        this.pushLog(`${this.bossName} wartet schon wieder auf dich.`);
        this.locked = false;
      }, 1400);
      return;
    }
    this.locked = false;
  }

  private narrate(b: RpgBattle): void {
    if (b.action === "heal") {
      this.pushLog(b.healed > 0
        ? `❤️ Du heilst dich um ${b.healed} LP.`
        : "❤️ Du bist schon bei vollen LP.");
    } else if (b.action === "special" && b.playerDmg === 0) {
      this.pushLog("✨ Dein Spezialangriff verfehlt!");
    } else if (b.playerDmg > 0) {
      const icon = b.action === "special" ? "✨" : "⚔️";
      this.pushLog(`${icon} Du triffst für ${b.playerDmg} Schaden!`);
    }
    if (b.bossDmg > 0) {
      this.pushLog(`📐 ${this.bossName} schlägt zurück: ${b.bossDmg} Schaden.`);
    }
  }
}
