import { hideOverlayVisible } from "./state";

export function HideOverlay() {
  if (!hideOverlayVisible.value) return null;
  return (
    <div id="hide-overlay">
      <div class="hide-hint">[E] Verlassen</div>
    </div>
  );
}
