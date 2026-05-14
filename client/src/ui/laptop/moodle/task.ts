/** Moodle's task strip — yellow callout above the page content with a
 *  Lucide pin icon and the "find X" hint. */
import { el } from "../../dom";
import { icon, Pin } from "../../icons";

export function buildMoodleTask(text: string): HTMLDivElement {
  const bar = el<HTMLDivElement>("div", "moodle-task");
  const pin = el<HTMLSpanElement>("span", "task-pin");
  pin.appendChild(icon(Pin, 14));
  bar.appendChild(pin);
  bar.appendChild(el("span", "task-text", text));
  return bar;
}
