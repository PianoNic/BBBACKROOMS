import {
  getActivePackId, importPackFromFile, listPacks, removePack, setActivePackId,
  type PackSummary,
} from "../core/texturePacks";
import { fetchRoster } from "../net/roster";
import { el } from "./dom";
import { openPackEditor } from "./packEditor";

export function buildTexturePackSection(): HTMLElement {
  const section = el<HTMLDivElement>("div", "pack-section");

  const importRow = el<HTMLDivElement>("div", "set-row");
  importRow.appendChild(el("label", undefined, "Install from zip"));
  const ctrl = el<HTMLDivElement>("div", "set-ctrl");
  const input = el<HTMLInputElement>("input");
  input.type = "file";
  input.accept = ".zip,application/zip";
  input.id = "pack-import-input";
  input.style.display = "none";
  const importBtn = el<HTMLButtonElement>("button", "menu-btn small", "IMPORT PACK");
  importBtn.id = "pack-import-btn";
  importBtn.onclick = () => input.click();
  ctrl.append(importBtn, input);
  importRow.appendChild(ctrl);
  section.appendChild(importRow);

  const editorRow = el<HTMLDivElement>("div", "set-row");
  editorRow.appendChild(el("label", undefined, "Build a pack"));
  const editorCtrl = el<HTMLDivElement>("div", "set-ctrl");
  const editorBtn = el<HTMLButtonElement>("button", "menu-btn small", "PACK EDITOR");
  editorBtn.id = "pack-editor-open";
  editorBtn.onclick = async () => {
    status.textContent = "lade roster…";
    status.classList.remove("error");
    editorBtn.disabled = true;
    try {
      const roster = await fetchRoster();
      status.textContent = "";
      openPackEditor(roster, refresh);
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : "failed to load roster";
      status.classList.add("error");
    } finally {
      editorBtn.disabled = false;
    }
  };
  editorCtrl.appendChild(editorBtn);
  editorRow.appendChild(editorCtrl);
  section.appendChild(editorRow);

  const status = el<HTMLDivElement>("div", "pack-status");
  status.id = "pack-status";
  section.appendChild(status);

  const list = el<HTMLDivElement>("div", "pack-list");
  list.id = "pack-list";
  section.appendChild(list);

  const note = el<HTMLDivElement>("div", "set-note pack-note",
    "Packs are stored locally in this browser only. Installing one is your own responsibility.");
  section.appendChild(note);

  async function refresh(): Promise<void> {
    const packs = await listPacks();
    const activeId = getActivePackId();
    list.replaceChildren();
    if (packs.length === 0) {
      list.appendChild(el("div", "pack-empty", "no packs installed"));
      return;
    }
    for (const p of packs) list.appendChild(buildPackRow(p, p.id === activeId, refresh));
  }

  input.onchange = async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    status.textContent = "importing…";
    status.classList.remove("error");
    try {
      const stored = await importPackFromFile(file);
      status.textContent = `imported "${stored.name}" (${stored.id})`;
      await refresh();
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : "failed to import pack";
      status.classList.add("error");
    }
  };

  void refresh();
  return section;
}

function buildPackRow(
  pack: PackSummary, isActive: boolean, refresh: () => Promise<void>,
): HTMLElement {
  const row = el<HTMLDivElement>("div", "pack-row");
  const info = el<HTMLDivElement>("div", "pack-info");
  info.appendChild(el("span", "pack-name", `${pack.name} v${pack.version}`));
  info.appendChild(el("span", "pack-hash", pack.hash.slice(0, 10)));
  row.appendChild(info);

  const useBtn = el<HTMLButtonElement>("button", "seg-btn", isActive ? "ACTIVE" : "USE");
  if (isActive) useBtn.classList.add("active");
  useBtn.onclick = async () => {
    await setActivePackId(isActive ? null : pack.id);
    await refresh();
  };
  row.appendChild(useBtn);

  const delBtn = el<HTMLButtonElement>("button", "seg-btn pack-delete", "DELETE");
  delBtn.onclick = async () => {
    await removePack(pack.id);
    await refresh();
  };
  row.appendChild(delBtn);

  return row;
}
