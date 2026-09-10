/** Schul-Quest — turn-based RPG against a teacher boss. The server resolves
 *  every turn (gamble_play with strike/special/heal); this app only renders
 *  the returned battle snapshot: HP bars, hit shakes and a combat log. */
import { useEffect, useRef, useState } from "preact/hooks";
import type { LaptopChallenge, RpgBattle } from "../../../net/protocol";
import { laptopResult, sendLaptopChoice } from "../state";

const ACTIONS: { key: string; label: string; sub: string }[] = [
  { key: "strike", label: "⚔️ Angriff", sub: "4–7 Schaden" },
  { key: "special", label: "✨ Spezial", sub: "9–14, kann verfehlen" },
  { key: "heal", label: "❤️ Heilen", sub: "+6–9 LP" },
];

function Fighter(props: { side: "boss" | "player"; emoji: string; name: string; hp: number; max: number; shakeKey: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const prevKey = useRef(props.shakeKey);
  useEffect(() => {
    if (props.shakeKey === prevKey.current) return;
    prevKey.current = props.shakeKey;
    const node = ref.current;
    if (!node) return;
    node.classList.remove("rpg-shake");
    void node.offsetWidth;
    node.classList.add("rpg-shake");
  }, [props.shakeKey]);

  const hp = Math.max(0, props.hp);
  return (
    <div class={`rpg-fighter ${props.side}`} ref={ref}>
      <div class="rpg-sprite">{props.emoji}</div>
      <div class="rpg-name">{props.name}</div>
      <div class="rpg-hp">
        <div class="rpg-hp-fill" style={{ width: `${(hp / props.max) * 100}%` }} />
      </div>
      <span class="rpg-hp-text">{`${hp} / ${props.max} LP`}</span>
    </div>
  );
}

export function RpgBattleApp(props: { challenge: LaptopChallenge }) {
  const bossName = props.challenge.boss ?? "Lehrer-Boss";
  const playerMax = props.challenge.playerMaxHp ?? 20;
  const bossMax = props.challenge.bossMaxHp ?? 22;

  const [bossHp, setBossHp] = useState(bossMax);
  const [playerHp, setPlayerHp] = useState(playerMax);
  const [bossShake, setBossShake] = useState(0);
  const [playerShake, setPlayerShake] = useState(0);
  const [log, setLog] = useState<string[]>([`${bossName} versperrt dir den Weg!`]);
  const lockedRef = useRef(false);
  const seenRef = useRef<RpgBattle | null>(null);

  const pushLog = (line: string): void => {
    setLog((prev) => [...prev, line].slice(-4));
  };

  const narrate = (b: RpgBattle): void => {
    if (b.action === "heal") {
      pushLog(b.healed > 0
        ? `❤️ Du heilst dich um ${b.healed} LP.`
        : "❤️ Du bist schon bei vollen LP.");
    } else if (b.action === "special" && b.playerDmg === 0) {
      pushLog("✨ Dein Spezialangriff verfehlt!");
    } else if (b.playerDmg > 0) {
      const icon = b.action === "special" ? "✨" : "⚔️";
      pushLog(`${icon} Du triffst für ${b.playerDmg} Schaden!`);
    }
    if (b.bossDmg > 0) {
      pushLog(`📐 ${bossName} schlägt zurück: ${b.bossDmg} Schaden.`);
    }
  };

  const pkt = laptopResult.value;
  useEffect(() => {
    const b = pkt?.battle;
    if (!b || b === seenRef.current) return;
    seenRef.current = b;
    narrate(b);
    setBossHp(b.bossHp);
    setPlayerHp(b.playerHp);
    if (b.playerDmg > 0) setBossShake((n) => n + 1);
    if (b.bossDmg > 0) setPlayerShake((n) => n + 1);

    if (b.bossDown) {
      pushLog(`🏆 ${bossName} ist besiegt! Laptop freigeschaltet.`);
      return;
    }
    if (b.playerDown) {
      pushLog("💀 Du wurdest aus dem Schulzimmer geworfen! Neuer Versuch…");
      window.setTimeout(() => {
        setBossHp(bossMax);
        setPlayerHp(playerMax);
        pushLog(`${bossName} wartet schon wieder auf dich.`);
        lockedRef.current = false;
      }, 1400);
      return;
    }
    lockedRef.current = false;
  }, [pkt]);

  const act = (key: string): void => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    sendLaptopChoice(key);
  };

  return (
    <div class="rpg-app">
      <div class="rpg-header">
        <div class="rpg-title">⚔️ SCHUL-QUEST</div>
        <div class="rpg-subtitle">{`Besiege ${bossName} und schalte den Laptop frei!`}</div>
      </div>
      <div class="rpg-arena">
        <Fighter side="boss" emoji="🧑‍🏫" name={bossName} hp={bossHp} max={bossMax} shakeKey={bossShake} />
        <div class="rpg-vs">VS</div>
        <Fighter side="player" emoji="🎒" name="Du" hp={playerHp} max={playerMax} shakeKey={playerShake} />
      </div>
      <div class="rpg-log">
        {log.map((line, i) => <div class="rpg-log-line" key={i}>{line}</div>)}
      </div>
      <div class="rpg-actions">
        {ACTIONS.map((a) => (
          <button class="rpg-action" onClick={() => act(a.key)} key={a.key}>
            <span class="rpg-action-label">{a.label}</span>
            <span class="rpg-action-sub">{a.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
