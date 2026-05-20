/** Top navbar for the Moodle (BBB Baden) theme.
 *  Mirrors moodle.bbbaden.ch — white bar, BBB logo on the left, dark nav
 *  items with a red underline on the active one, and bell / chat / avatar
 *  icons on the right. */
import { el } from "../../dom";
import { icon, Bell, MessageSquare } from "../../icons";

type NavKey = "home" | "courses" | "calendar" | "help";

const NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: "home", label: "Startseite" },
  { key: "courses", label: "Dashboard" },
  { key: "calendar", label: "Meine Kurse" },
];

export function buildMoodleNav(active: NavKey): HTMLDivElement {
  const nav = el<HTMLDivElement>("div", "moodle-nav");

  const left = el<HTMLDivElement>("div", "moodle-nav-left");
  const logo = document.createElement("img");
  logo.className = "moodle-logo-img";
  logo.src = "/bbb-logo.jpg";
  logo.alt = "BBB Berufsfachschule";
  left.appendChild(logo);
  nav.appendChild(left);

  const center = el<HTMLDivElement>("div", "moodle-nav-center");
  for (const item of NAV_ITEMS) {
    const cell = el<HTMLSpanElement>(
      "span", "moodle-nav-item" + (item.key === active ? " active" : ""),
    );
    cell.textContent = item.label;
    center.appendChild(cell);
  }
  nav.appendChild(center);

  const right = el<HTMLDivElement>("div", "moodle-nav-right");
  const bell = el<HTMLDivElement>("div", "moodle-icon-btn");
  bell.appendChild(icon(Bell, 20, 1.5));
  right.appendChild(bell);

  const chat = el<HTMLDivElement>("div", "moodle-icon-btn");
  chat.appendChild(icon(MessageSquare, 20, 1.5));
  const badge = el<HTMLSpanElement>("span", "moodle-icon-badge", "1");
  chat.appendChild(badge);
  right.appendChild(chat);

  const user = el<HTMLDivElement>("div", "moodle-user");
  user.appendChild(el("span", "moodle-user-initials", "NE"));
  right.appendChild(user);
  nav.appendChild(right);

  return nav;
}
