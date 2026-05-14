/** Top navbar for the Moodle (BBB Baden) theme. Lucide icons only. */
import { el } from "../../dom";
import {
  icon, Home, GraduationCap, Calendar, HelpCircle, Search, User,
} from "../../icons";
import type { IconNode } from "lucide";

type NavKey = "home" | "courses" | "calendar" | "help";

const NAV_ITEMS: { key: NavKey; label: string; node: IconNode }[] = [
  { key: "home", label: "Startseite", node: Home },
  { key: "courses", label: "Meine Kurse", node: GraduationCap },
  { key: "calendar", label: "Kalender", node: Calendar },
  { key: "help", label: "Hilfe", node: HelpCircle },
];

export function buildMoodleNav(active: NavKey): HTMLDivElement {
  const nav = el<HTMLDivElement>("div", "moodle-nav");
  const left = el<HTMLDivElement>("div", "moodle-nav-left");
  left.appendChild(el("span", "moodle-logo", "BBB"));
  left.appendChild(el("span", "moodle-brand", "Berufsfachschule BBB"));
  nav.appendChild(left);

  const center = el<HTMLDivElement>("div", "moodle-nav-center");
  for (const item of NAV_ITEMS) {
    const cell = el<HTMLSpanElement>(
      "span", "moodle-nav-item" + (item.key === active ? " active" : ""),
    );
    const iconWrap = el<HTMLSpanElement>("span", "moodle-nav-icon");
    iconWrap.appendChild(icon(item.node, 14));
    cell.appendChild(iconWrap);
    cell.appendChild(el("span", "moodle-nav-label", item.label));
    center.appendChild(cell);
  }
  nav.appendChild(center);

  const right = el<HTMLDivElement>("div", "moodle-nav-right");
  const search = el<HTMLDivElement>("div", "moodle-search");
  const searchIcon = el<HTMLSpanElement>("span", "moodle-search-icon");
  searchIcon.appendChild(icon(Search, 14));
  search.appendChild(searchIcon);
  search.appendChild(el("span", "moodle-search-ph", "Kurse durchsuchen..."));
  right.appendChild(search);
  const user = el<HTMLDivElement>("div", "moodle-user");
  user.appendChild(icon(User, 18));
  right.appendChild(user);
  nav.appendChild(right);

  return nav;
}
