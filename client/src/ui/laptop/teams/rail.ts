/** Vertical Teams app rail (the dark strip on the far left with stacked
 *  app icons). Used by every Teams view. Lucide icons only — no emojis. */
import { el } from "../../dom";
import {
  icon, Bell, MessageSquare, Users, Calendar, Phone, Folder,
} from "../../icons";
import type { IconNode } from "lucide";

export type RailKey = "activity" | "chat" | "teams" | "calendar" | "calls" | "files";

const ITEMS: { key: RailKey; label: string; node: IconNode }[] = [
  { key: "activity", label: "Aktivität", node: Bell },
  { key: "chat",     label: "Chat",      node: MessageSquare },
  { key: "teams",    label: "Teams",     node: Users },
  { key: "calendar", label: "Kalender",  node: Calendar },
  { key: "calls",    label: "Anrufe",    node: Phone },
  { key: "files",    label: "Dateien",   node: Folder },
];

export function buildTeamsRail(active: RailKey): HTMLDivElement {
  const rail = el<HTMLDivElement>("div", "teams-rail");
  for (const item of ITEMS) {
    const cell = el<HTMLDivElement>(
      "div", "rail-item" + (item.key === active ? " active" : ""),
    );
    const iconWrap = el<HTMLDivElement>("div", "rail-icon");
    iconWrap.appendChild(icon(item.node, 20));
    cell.appendChild(iconWrap);
    cell.appendChild(el("div", "rail-label", item.label));
    rail.appendChild(cell);
  }
  return rail;
}
