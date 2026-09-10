import { render } from "preact";
import { LaptopApp } from "./LaptopApp";

let mounted = false;

export function mountLaptop(): void {
  if (mounted) return;
  mounted = true;
  let root = document.getElementById("laptop-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "laptop-root";
    document.body.appendChild(root);
  }
  render(<LaptopApp />, root);
}
