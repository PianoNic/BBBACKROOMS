/** Modal wrapper around the lobby's admin settings panel. */
import { el } from "./dom";

export function openAdminModal(panel: HTMLDivElement): void {
  const overlay = el<HTMLDivElement>("div");
  overlay.id = "lobby-admin-overlay";
  const modal = el<HTMLDivElement>("div", "panel panel-brackets");
  modal.appendChild(el("h2", undefined, "ADMIN SETTINGS"));
  modal.appendChild(panel);
  const close = el<HTMLButtonElement>("button", "menu-btn primary", "CLOSE");
  const onKey = (e: KeyboardEvent) => {
    if (e.code === "Escape") { e.preventDefault(); close.click(); }
  };
  close.onclick = () => {
    overlay.remove();
    window.removeEventListener("keydown", onKey);
  };
  window.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close.click(); });
  modal.appendChild(close);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
