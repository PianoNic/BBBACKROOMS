import { useEffect, useState } from "preact/hooks";
import { fetchRoster } from "../../../../net/roster";
import { Button } from "../../components/controls";
import { packEditorOpen } from "../../routes";
import {
  activePackId, cacheRoster, importPack, packEditorRoster, packs, refreshPacks,
  removeInstalledPack, useActivePack,
} from "../../state/packs";

export function TexturePackSection() {
  const [status, setStatus] = useState<{ text: string; error: boolean }>({ text: "", error: false });
  const [editorLoading, setEditorLoading] = useState(false);

  useEffect(() => { void refreshPacks(); }, []);

  async function onImportChange(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setStatus({ text: "importing…", error: false });
    try {
      const stored = await importPack(file);
      setStatus({ text: `imported "${stored.name}" (${stored.id})`, error: false });
    } catch (err) {
      setStatus({ text: err instanceof Error ? err.message : "failed to import pack", error: true });
    }
  }

  async function onOpenEditor(): Promise<void> {
    setEditorLoading(true);
    setStatus({ text: "lade roster…", error: false });
    try {
      const roster = await fetchRoster();
      cacheRoster(roster);
      packEditorRoster.value = roster;
      packEditorOpen.value = true;
      setStatus({ text: "", error: false });
    } catch (err) {
      setStatus({ text: err instanceof Error ? err.message : "failed to load roster", error: true });
    } finally {
      setEditorLoading(false);
    }
  }

  return (
    <div class="pack-section">
      <div class="bb-row">
        <label>Install from .bbpack</label>
        <div class="pack-row-ctrl">
          <input type="file" accept=".bbpack" id="pack-import-input" hidden onChange={(e) => void onImportChange(e)} />
          <Button
            small id="pack-import-btn"
            onClick={() => document.getElementById("pack-import-input")?.click()}
          >
            IMPORT PACK
          </Button>
        </div>
      </div>
      <div class="bb-row">
        <label>Build a pack</label>
        <div class="pack-row-ctrl">
          <Button small id="pack-editor-open" disabled={editorLoading} onClick={() => void onOpenEditor()}>
            PACK EDITOR
          </Button>
        </div>
      </div>

      <div id="pack-status" class={status.error ? "error" : undefined}>{status.text}</div>

      <div id="pack-list">
        {packs.value.length === 0 ? (
          <div class="pack-empty">no packs installed</div>
        ) : (
          packs.value.map((p) => (
            <div class="pack-row" key={p.id}>
              <div class="pack-info">
                <span class="pack-name">{p.name} v{p.version}</span>
                <span class="pack-hash">{p.hash.slice(0, 10)}</span>
              </div>
              <button
                type="button"
                class={p.id === activePackId.value ? "bb-seg-btn active" : "bb-seg-btn"}
                onClick={() => void useActivePack(p.id === activePackId.value ? null : p.id)}
              >
                {p.id === activePackId.value ? "ACTIVE" : "USE"}
              </button>
              <button type="button" class="bb-seg-btn pack-delete" onClick={() => void removeInstalledPack(p.id)}>
                DELETE
              </button>
            </div>
          ))
        )}
      </div>

      <div class="set-note pack-note">
        Packs are stored locally in this browser only. Installing one is your own responsibility.
      </div>
    </div>
  );
}
