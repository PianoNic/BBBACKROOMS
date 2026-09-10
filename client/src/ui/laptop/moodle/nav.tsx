/** Top navbar for the Moodle theme.
 *  Mirrors moodle.backrooms-baden.ch — white bar, Moodle wordmark on the left, dark nav
 *  items with a red underline on the active one, and bell / chat / avatar
 *  icons on the right. */
import { Icon } from "../../Icon";
import { Bell, MessageSquare } from "../../icons";

type NavKey = "home" | "courses" | "calendar" | "help";

const NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: "home", label: "Startseite" },
  { key: "courses", label: "Dashboard" },
  { key: "calendar", label: "Meine Kurse" },
];

export function MoodleNav(props: { active: NavKey }) {
  return (
    <div class="moodle-nav">
      <div class="moodle-nav-left">
        <span class="moodle-logo-img">Moodle</span>
      </div>
      <div class="moodle-nav-center">
        {NAV_ITEMS.map((item) => (
          <span
            class={"moodle-nav-item" + (item.key === props.active ? " active" : "")}
            key={item.key}
          >
            {item.label}
          </span>
        ))}
      </div>
      <div class="moodle-nav-right">
        <div class="moodle-icon-btn"><Icon node={Bell} size={20} strokeWidth={1.5} /></div>
        <div class="moodle-icon-btn">
          <Icon node={MessageSquare} size={20} strokeWidth={1.5} />
          <span class="moodle-icon-badge">1</span>
        </div>
        <div class="moodle-user">
          <span class="moodle-user-initials">HU</span>
        </div>
      </div>
    </div>
  );
}
