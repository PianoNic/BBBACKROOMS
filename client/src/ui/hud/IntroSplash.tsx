import { skipIntro } from "../introSplash";
import { introPhase } from "./state";

export function IntroSplash() {
  const phase = introPhase.value;
  if (phase === "hidden") return null;
  return (
    <div
      id="intro-splash"
      class={phase === "out" ? "intro-out" : undefined}
      onPointerDown={skipIntro}
    >
      <div class="intro-credit">
        <div class="intro-studio">PianoNic Games</div>
        <div class="intro-presents">presents</div>
      </div>
    </div>
  );
}
