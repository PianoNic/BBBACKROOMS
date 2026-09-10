import { interactLabel, interactX, interactY } from "./state";

export function InteractPrompt() {
  const label = interactLabel.value;
  return (
    <div
      id="interact-prompt"
      class={label === null ? "hidden" : undefined}
      style={{ left: `${interactX.value}px`, top: `${interactY.value}px` }}
    >
      <span class="key">[E]</span> <span class="label">{label ?? ""}</span>
    </div>
  );
}
