import { useEffect, useState } from "preact/hooks";
import type { ScoreboardData, SelfRewards } from "../../../net/protocol";
import { Button } from "../components/controls";
import { endgame } from "../state/overlays";
import { LOBBY_RESUME_KEY } from "../state/storageKeys";
import type { EndgameState } from "../state/overlays";

function useCountUp(target: number, ms: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) { setValue(0); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function Rewards(props: { rewards: SelfRewards }) {
  const r = props.rewards;
  const [width, setWidth] = useState("0%");
  const xp = useCountUp(r.xpEarned, 1200);
  const coins = useCountUp(r.coinsEarned, 1200);

  useEffect(() => {
    const pct = r.xpForNextLevel > 0
      ? Math.min(100, (r.xpIntoLevel / r.xpForNextLevel) * 100)
      : 0;
    const raf = requestAnimationFrame(() => setWidth(`${pct}%`));
    return () => cancelAnimationFrame(raf);
  }, [r.xpIntoLevel, r.xpForNextLevel]);

  return (
    <div class="rewards">
      <div class={r.leveledUp ? "level-badge leveled" : "level-badge"}>{`LEVEL ${r.levelAfter}`}</div>
      <div class="xp-bar"><div class="fill" style={{ width }} /></div>
      <div class="gains">
        <span>{`+${xp} XP`}</span>
        <span class="coins">{`+${coins} coins`}</span>
      </div>
      {r.achievements?.length ? (
        <div class="ach-list">
          {r.achievements.map((a) => (
            <div class="ach-card" key={a.name}>
              <span class="ach-icon">{a.icon}</span>
              <div class="ach-text">
                <div class="ach-name">{a.name}</div>
                <div class="ach-desc">{a.description}</div>
              </div>
              <span class="ach-coins">{a.saved ? `+${a.coins}` : "—"}</span>
            </div>
          ))}
        </div>
      ) : null}
      {!r.saved ? <div class="guest-note">Sign in to save your progress.</div> : null}
    </div>
  );
}

function Scoreboard(props: { data: ScoreboardData; selfId: string | null }) {
  const { data, selfId } = props;
  const rows = [...data.players].sort(
    (a, b) => Number(b.extracted) - Number(a.extracted) || b.tasks - a.tasks,
  );
  const team = data.team;

  return (
    <div class="scoreboard">
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Tasks</th>
            <th>Stuns</th>
            <th>Revives</th>
            <th class="is-secondary">Items</th>
            <th class="is-secondary">Survived</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((pl) => (
            <tr key={pl.id} class={pl.id === selfId ? "self" : undefined}>
              <td class="name">
                <span class="swatch" style={{ background: pl.color }} />
                {pl.name || "player"}
              </td>
              <td>{pl.tasks}</td>
              <td>{pl.stuns}</td>
              <td>{pl.revives}</td>
              <td class="is-secondary">{pl.items}</td>
              <td class="is-secondary">{fmtTime(pl.survivalMs)}</td>
              <td class={pl.extracted ? "ok" : pl.died ? "bad" : undefined}>
                {pl.extracted ? "ESCAPED" : pl.died ? "CAUGHT" : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td class="name">{`Team (${team.extracted}/${team.total} out)`}</td>
            <td>{team.tasks}</td>
            <td>{team.stuns}</td>
            <td>{team.revives}</td>
            <td class="is-secondary">{team.items}</td>
            <td class="is-secondary">{fmtTime(data.durationMs)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function EndgameOverlay(props: { state: EndgameState }) {
  const { kind, scoreboard, selfId, net } = props.state;
  const [returning, setReturning] = useState(false);

  return (
    <div id="victory" class={kind === "lost" ? "lost" : undefined}>
      <div class="endgame-content">
        <h1>{kind === "won" ? "ALL EXTRACTED" : "EVERYONE WAS CAUGHT"}</h1>
        <p>
          {kind === "won"
            ? "The team escaped the school."
            : "No one made it out of the school."}
        </p>
        <div class="endgame-body">
          {scoreboard?.selfRewards ? <Rewards rewards={scoreboard.selfRewards} /> : null}
          {scoreboard ? <Scoreboard data={scoreboard} selfId={selfId} /> : null}
        </div>
        <div class="endgame-buttons">
          <Button
            id="back-to-lobby-btn"
            variant="primary"
            disabled={!net || returning}
            title={net ? undefined : "offline — exit instead"}
            onClick={() => {
              setReturning(true);
              net?.send({ type: "back_to_lobby" });
            }}
          >
            {returning ? "Returning..." : "Back to lobby"}
          </Button>
          <Button
            onClick={() => {
              sessionStorage.removeItem(LOBBY_RESUME_KEY);
              location.reload();
            }}
          >
            Exit to title screen
          </Button>
        </div>
      </div>
    </div>
  );
}

export function clearEndgame(): void {
  endgame.value = null;
}
