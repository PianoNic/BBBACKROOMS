import { render } from "preact";
import { MenuApp } from "./MenuApp";

let mounted = false;

export function mountMenuApp(): void {
  if (mounted) return;
  mounted = true;
  let root = document.getElementById("menu-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "menu-root";
    document.body.appendChild(root);
  }
  render(<MenuApp />, root);
}
