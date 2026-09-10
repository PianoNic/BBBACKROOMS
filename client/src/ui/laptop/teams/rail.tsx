import type { IconNode } from "lucide";
import { Icon } from "../../Icon";
import {
  Bell, Calendar, Folder, MessageSquare, Phone, Users,
} from "../../icons";

export type RailKey = "activity" | "chat" | "teams" | "calendar" | "calls" | "files";

const ITEMS: { key: RailKey; label: string; node: IconNode }[] = [
  { key: "activity", label: "Aktivität", node: Bell },
  { key: "chat",     label: "Chat",      node: MessageSquare },
  { key: "teams",    label: "Teams",     node: Users },
  { key: "calendar", label: "Kalender",  node: Calendar },
  { key: "calls",    label: "Anrufe",    node: Phone },
  { key: "files",    label: "Dateien",   node: Folder },
];

export function TeamsRail(props: { active: RailKey }) {
  return (
    <div class="teams-rail">
      {ITEMS.map((item) => (
        <div class={"rail-item" + (item.key === props.active ? " active" : "")} key={item.key}>
          <div class="rail-icon"><Icon node={item.node} size={20} /></div>
          <div class="rail-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
