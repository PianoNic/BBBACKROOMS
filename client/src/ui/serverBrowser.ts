/** Server-browser screen: lobby list + create-lobby modal + profile column. */
import { el } from "./dom";
import { buildProfilePanel } from "./profilePanel";

type LobbyInfo = {
  id: string; name: string;
  players: number; maxPlayers: number;
  hasPassword: boolean;
  status?: "waiting" | "running" | "ended";
};

const API = import.meta.env.VITE_SERVER_URL ?? "";

export type LobbyPickFn = (id: string, password?: string) => void;

function openCreateModal(onPick: LobbyPickFn): void {
  const overlay = el<HTMLDivElement>("div");
  overlay.id = "create-modal";
  const panel = el<HTMLDivElement>("div", "panel panel-brackets");
  panel.appendChild(el("h2", undefined, "NEW LOBBY"));

  const nameField = el<HTMLDivElement>("div", "field");
  nameField.appendChild(el("label", undefined, "Name"));
  const nameInput = el<HTMLInputElement>("input");
  nameInput.placeholder = "lobby name";
  nameField.appendChild(nameInput);
  panel.appendChild(nameField);

  const maxField = el<HTMLDivElement>("div", "field");
  maxField.appendChild(el("label", undefined, "Max players"));
  const maxInput = el<HTMLInputElement>("input");
  maxInput.type = "number"; maxInput.min = "1"; maxInput.max = "16"; maxInput.value = "8";
  maxField.appendChild(maxInput);
  panel.appendChild(maxField);

  const pwdField = el<HTMLDivElement>("div", "field");
  pwdField.appendChild(el("label", undefined, "Password (optional)"));
  const pwdInput = el<HTMLInputElement>("input");
  pwdInput.type = "password";
  pwdInput.placeholder = "leave blank for no password";
  pwdField.appendChild(pwdInput);
  panel.appendChild(pwdField);

  const footer = el<HTMLDivElement>("div", "footer");
  const submit = el<HTMLButtonElement>("button", "menu-btn primary", "CREATE");
  const cancel = el<HTMLButtonElement>("button", "menu-btn back", "← CANCEL");
  footer.append(cancel, submit);
  panel.appendChild(footer);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    window.removeEventListener("keydown", onKey);
  };
  const doCreate = async () => {
    const password = pwdInput.value.trim() || null;
    const maxPlayers = Math.max(1, Math.min(100, parseInt(maxInput.value || "8", 10)));
    submit.disabled = true;
    try {
      const res = await fetch(`${API}/lobbies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.value, maxPlayers, password }),
      });
      const l: LobbyInfo = await res.json();
      close();
      onPick(l.id, password ?? undefined);
    } catch {
      submit.disabled = false;
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.code === "Escape") { e.preventDefault(); close(); }
    else if (e.code === "Enter") { e.preventDefault(); doCreate(); }
  };
  window.addEventListener("keydown", onKey);

  submit.onclick = doCreate;
  cancel.onclick = close;
  setTimeout(() => nameInput.focus(), 0);
}

export function buildServerScreen(
  root: HTMLElement,
  onPick: LobbyPickFn,
  onBack: () => void,
): void {
  const layout = el<HTMLDivElement>("div", "server-layout");

  const panel = el<HTMLDivElement>("div", "panel panel-brackets");
  panel.appendChild(el("h2", undefined, "SERVERS"));

  const createRow = el<HTMLDivElement>("div", "create-row");
  const createBtn = el<HTMLButtonElement>("button", "menu-btn primary wide", "+ CREATE NEW LOBBY");
  createBtn.onclick = () => openCreateModal(onPick);
  createRow.append(createBtn);
  panel.appendChild(createRow);

  const listHeader = el<HTMLDivElement>("div", "list-header");
  listHeader.appendChild(el("span", undefined, "Active lobbies"));
  const refreshBtn = el<HTMLButtonElement>("button", "icon-btn", "↻");
  refreshBtn.title = "Refresh";
  listHeader.appendChild(refreshBtn);
  panel.appendChild(listHeader);

  const list = el<HTMLUListElement>("ul", "lobby-list");
  list.appendChild(el("li", "empty", "loading…"));
  panel.appendChild(list);

  const back = el<HTMLButtonElement>("button", "menu-btn back", "← BACK");
  back.onclick = onBack;
  panel.appendChild(back);

  layout.appendChild(panel);
  layout.appendChild(buildProfilePanel());
  layout.appendChild(el<HTMLDivElement>("div", "filler"));
  root.appendChild(layout);

  const refresh = async () => {
    list.replaceChildren();
    try {
      const res = await fetch(`${API}/lobbies`);
      const lobbies: LobbyInfo[] = await res.json();
      if (lobbies.length === 0) {
        list.appendChild(el("li", "empty", "no active lobbies — create one"));
        return;
      }
      // (rows rendered below)

      const joinable = lobbies.filter((l) => (l.status ?? "waiting") === "waiting");
      const inProgress = lobbies.filter((l) => l.status === "running" || l.status === "ended");
      const renderRow = (l: LobbyInfo, locked: boolean) => {
        const li = el<HTMLLIElement>("li", locked ? "lobby-row locked" : "lobby-row");
        const lockTxt = l.hasPassword ? "🔒 " : "";
        li.appendChild(el("span", "lobby-name", `${lockTxt}${l.name}`));
        li.appendChild(el("span", "lobby-dots"));
        const tag = l.status === "running" ? "IN GAME"
          : l.status === "ended" ? "ENDED" : `${l.players}/${l.maxPlayers}`;
        li.appendChild(el("span", "lobby-count", tag));
        if (locked) {
          li.title = "Game in progress — cannot join";
        } else {
          li.onclick = () => {
            if (l.hasPassword) {
              const pwd = prompt(`Password for "${l.name}":`);
              if (pwd == null) return;
              onPick(l.id, pwd);
            } else {
              onPick(l.id);
            }
          };
        }
        list.appendChild(li);
      };
      for (const l of joinable) renderRow(l, false);
      if (inProgress.length) {
        list.appendChild(el("li", "list-section", "IN PROGRESS"));
        for (const l of inProgress) renderRow(l, true);
      }
    } catch {
      list.replaceChildren(el("li", "empty", "could not reach server"));
    }
  };
  refreshBtn.onclick = refresh;
  refresh();
}
