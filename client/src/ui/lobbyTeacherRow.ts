/** "Teachers" picker for the lobby admin panel: random (all) vs. pick
 *  a specific subset, with a grid of clickable teacher tiles. */
import type { NetClient } from "../net/client";
import type { RosterEntry } from "../net/protocol";
import { resolveTeacherName, resolveTeacherThumb } from "../core/texturePacks";
import { el } from "./dom";

export type TeacherRowState = {
  selectedTeachers: string[] | null;
  roster: RosterEntry[];
};

export type Row = {
  row: HTMLDivElement;
  refresh: (isAdmin: boolean) => void;
};

export function buildTeacherRow(state: TeacherRowState, client: NetClient): Row {
  const row = el<HTMLDivElement>("div", "admin-row teachers-row");
  row.appendChild(el("label", undefined, "Teachers"));
  const mode = el<HTMLDivElement>("div", "seg");
  const randomBtn = el<HTMLButtonElement>("button", "seg-btn", "RANDOM (ALL)");
  const pickedBtn = el<HTMLButtonElement>("button", "seg-btn", "PICK SET");
  mode.append(randomBtn, pickedBtn);
  row.appendChild(mode);
  const grid = el<HTMLDivElement>("div", "teacher-grid");
  row.appendChild(grid);

  randomBtn.onclick = () => client.send({
    type: "lobby_settings", selectAllTeachers: true,
  });
  pickedBtn.onclick = () => client.send({
    type: "lobby_settings",
    selectedTeachers: state.selectedTeachers ?? [],
  });

  return {
    row,
    refresh: (isAdmin) => {
      randomBtn.disabled = !isAdmin;
      pickedBtn.disabled = !isAdmin;
      const selected = new Set(state.selectedTeachers ?? []);
      const pickMode = state.selectedTeachers !== null;
      randomBtn.classList.toggle("active", !pickMode);
      pickedBtn.classList.toggle("active", pickMode);
      grid.replaceChildren();
      grid.style.display = pickMode ? "grid" : "none";
      if (!pickMode) return;
      state.roster.forEach((t, index) => {
        grid.appendChild(buildTile(t, index, selected, state, client, isAdmin));
      });
    },
  };
}

function buildTile(
  t: RosterEntry, index: number, selected: Set<string>, state: TeacherRowState,
  client: NetClient, isAdmin: boolean,
): HTMLButtonElement {
  const tile = el<HTMLButtonElement>("button", "teacher-tile");
  const img = el<HTMLImageElement>("img");
  const name = resolveTeacherName(t.ability, index, t.name);
  img.src = resolveTeacherThumb(t.ability, index, t.image);
  img.alt = name;
  tile.append(img, el<HTMLSpanElement>("span", undefined, name));
  if (selected.has(t.image)) tile.classList.add("active");
  tile.disabled = !isAdmin;
  tile.onclick = () => {
    const next = new Set(state.selectedTeachers ?? []);
    if (next.has(t.image)) next.delete(t.image);
    else next.add(t.image);
    client.send({ type: "lobby_settings", selectedTeachers: [...next] });
  };
  return tile;
}
