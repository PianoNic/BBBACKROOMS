/** Top navbar for the Moodle theme.
 *  Mirrors moodle.bbbackrooms.ch — white bar, Moodle wordmark on the left, dark nav
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
  left.appendChild(el("span", "moodle-logo-img", "Moodle"));
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
  user.appendChild(el("span", "moodle-user-initials", "HU"));
  right.appendChild(user);
  nav.appendChild(right);

  return nav;
}
