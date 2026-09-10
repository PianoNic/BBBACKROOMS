import { reviveProgress } from "./state";

export function ReviveBar() {
  const progress = reviveProgress.value;
  const hidden = progress < 0;
  const pct = hidden ? 0 : Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div id="revive-bar" class={hidden ? "hidden" : undefined}>
      <div class="label">REVIVING…</div>
      <div class="track">
        <div class="fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
