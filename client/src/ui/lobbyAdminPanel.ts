/** Admin-only settings panel (max players, password, map size, teacher pick).
 *
 *  Built detached and mounted into the lobby-admin overlay on demand.
 *  Returns the root element plus tiny re-render / disable hooks for the
 *  caller to invoke when lobby state changes. */
import type { NetClient } from "../net/client";
import type { RosterEntry } from "../net/protocol";
import { el } from "./dom";
import { buildTeacherRow, type Row } from "./lobbyTeacherRow";

const MAP_SIZES: { label: string; value: number }[] = [
  { label: "SMALL", value: 60 },
  { label: "MEDIUM", value: 120 },
  { label: "LARGE", value: 180 },
];

export type AdminPanelState = {
  selfId: string;
  adminId: string | null;
  maxPlayers: number;
  hasPassword: boolean;
  selectedTeachers: string[] | null;
  mapSize: number;
  objectiveCount: number;
  roster: RosterEntry[];
};

export type AdminPanel = {
  root: HTMLDivElement;
  /** Re-read state and update rendered controls (call after each lobby_settings packet). */
  refresh: () => void;
};

export function buildAdminPanel(state: AdminPanelState, client: NetClient): AdminPanel {
  const root = el<HTMLDivElement>("div", "admin-settings");
  const rows = el<HTMLDivElement>("div", "admin-rows");

  const mp = buildMaxPlayersRow(state, client);
  const pw = buildPasswordRow(state, client);
  const ms = buildMapSizeRow(state, client);
  const oc = buildObjectiveCountRow(state, client);
  const tc = buildTeacherRow(state, client);

  rows.append(mp.row, pw.row, ms.row, oc.row, tc.row);
  root.appendChild(rows);

  function refresh(): void {
    const isAdmin = state.selfId === state.adminId;
    mp.refresh(isAdmin);
    pw.refresh(isAdmin);
    ms.refresh(isAdmin);
    oc.refresh(isAdmin);
    tc.refresh(isAdmin);
  }
  refresh();

  return { root, refresh };
}


function buildMaxPlayersRow(state: AdminPanelState, client: NetClient): Row {
  const row = el<HTMLDivElement>("div", "admin-row");
  row.appendChild(el("label", undefined, "Max players"));
  const input = el<HTMLInputElement>("input");
  input.type = "number"; input.min = "1"; input.max = "100"; input.step = "1";
  input.value = String(state.maxPlayers);
  input.onchange = () => {
    const v = Math.max(1, Math.min(100, parseInt(input.value, 10) || 8));
    input.value = String(v);
    client.send({ type: "lobby_settings", maxPlayers: v });
  };
  row.appendChild(input);
  return {
    row,
    refresh: (isAdmin) => {
      input.disabled = !isAdmin;
      input.value = String(state.maxPlayers);
    },
  };
}

function buildPasswordRow(state: AdminPanelState, client: NetClient): Row {
  const row = el<HTMLDivElement>("div", "admin-row");
  row.appendChild(el("label", undefined, "Password"));
  const input = el<HTMLInputElement>("input");
  input.type = "text"; input.maxLength = 64;
  input.placeholder = state.hasPassword ? "(set — type to change)" : "(none)";
  row.appendChild(input);
  const setBtn = el<HTMLButtonElement>("button", "menu-btn small", "SET");
  setBtn.onclick = () => {
    client.send({ type: "lobby_settings", password: input.value });
    input.value = "";
  };
  const clearBtn = el<HTMLButtonElement>("button", "menu-btn small", "CLEAR");
  clearBtn.onclick = () => {
    client.send({ type: "lobby_settings", clearPassword: true });
    input.value = "";
  };
  row.append(setBtn, clearBtn);
  return {
    row,
    refresh: (isAdmin) => {
      input.disabled = !isAdmin;
      setBtn.disabled = !isAdmin;
      clearBtn.disabled = !isAdmin;
      input.placeholder = state.hasPassword ? "(set — type to change)" : "(none)";
    },
  };
}

function buildMapSizeRow(state: AdminPanelState, client: NetClient): Row {
  const row = el<HTMLDivElement>("div", "admin-row");
  row.appendChild(el("label", undefined, "Map size"));
  const seg = el<HTMLDivElement>("div", "seg");
  const buttons: { btn: HTMLButtonElement; value: number }[] = [];
  for (const opt of MAP_SIZES) {
    const b = el<HTMLButtonElement>("button", "seg-btn", opt.label);
    b.onclick = () => client.send({ type: "lobby_settings", mapSize: opt.value });
    seg.appendChild(b);
    buttons.push({ btn: b, value: opt.value });
  }
  row.appendChild(seg);
  return {
    row,
    refresh: (isAdmin) => {
      for (const { btn, value } of buttons) {
        btn.classList.toggle("active", state.mapSize === value);
        btn.disabled = !isAdmin;
      }
    },
  };
}

function buildObjectiveCountRow(state: AdminPanelState, client: NetClient): Row {
  const row = el<HTMLDivElement>("div", "admin-row");
  row.appendChild(el("label", undefined, "Objectives"));
  const input = el<HTMLInputElement>("input");
  input.type = "range"; input.min = "2"; input.max = "12"; input.step = "1";
  input.value = String(state.objectiveCount);
  const label = el<HTMLSpanElement>("span", "set-value", String(state.objectiveCount));
  input.oninput = () => { label.textContent = input.value; };
  input.onchange = () => {
    const v = Math.max(2, Math.min(12, parseInt(input.value, 10) || 6));
    client.send({ type: "lobby_settings", objectiveCount: v });
  };
  row.append(input, label);
  return {
    row,
    refresh: (isAdmin) => {
      input.disabled = !isAdmin;
      input.value = String(state.objectiveCount);
      label.textContent = String(state.objectiveCount);
    },
  };
}

