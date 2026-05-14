/** Yellow "what to do" strip rendered above every Teams/Moodle challenge.
 *  Uses a lucide Pin icon (no emojis) so it matches the rest of the UI. */
import { el } from "../../dom";
import { icon, Pin } from "../../icons";

export function buildTaskBar(text: string, baseClass = "task-bar"): HTMLDivElement {
  const bar = el<HTMLDivElement>("div", baseClass);
  const iconWrap = el<HTMLSpanElement>("span", "task-pin");
  iconWrap.appendChild(icon(Pin, 14));
  bar.appendChild(iconWrap);
  bar.appendChild(el("span", "task-text", text));
  return bar;
}
