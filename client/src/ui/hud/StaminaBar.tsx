import { staminaValue } from "./state";

export function StaminaBar() {
  const value = staminaValue.value;
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const background = value < 0.2 ? "#c0392b" : "#e8d268";
  return (
    <div id="stamina">
      <div class="fill" style={{ width: `${pct}%`, background }} />
    </div>
  );
}
