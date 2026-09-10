import { render } from "preact";
import { HudApp } from "./HudApp";

let mounted = false;

export function mountHud(): void {
  if (mounted) return;
  mounted = true;
  let root = document.getElementById("hud-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "hud-root";
    document.body.appendChild(root);
  }
  render(<HudApp />, root);
}

export function unmountHud(): void {
  if (!mounted) return;
  mounted = false;
  const root = document.getElementById("hud-root");
  if (root) render(null, root);
}
