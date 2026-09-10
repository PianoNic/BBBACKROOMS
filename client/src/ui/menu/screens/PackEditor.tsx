import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { decodeBbpack } from "../../../core/bbpack";
import {
  getActivePackId, getStoredPack, importPackFromFile, invalidatePackCache,
  listPacks, setActivePackId, type PackSummary,
} from "../../../core/texturePacks";
import type { RosterEntry } from "../../../net/protocol";
import { Button } from "../components/controls";
import { Modal, Overlay } from "../components/Overlay";
import { isConsentAccepted, PackConsent } from "./PackConsent";
import {
  bumpPatchVersion, buildPack, drawIntoCanvas, isIdValid, isNameValid, isVersionValid,
  processImageFile, sanitizePackName, slotIndicesFromTeachers, type SlotEntry,
} from "./packs/imageProcessing";
import { SlotCard, type SlotUi } from "./packs/SlotCard";

export type PackEditorProps = {
  roster: RosterEntry[];
  onClose: () => void;
  onInstalled?: () => void;
};

function emptyUi(): SlotUi {
  return { ready: false, sizeLabel: "", error: null, nameOverride: "" };
}

type OpenedTeachers = Record<string, { image: string; name?: string }>;

export function PackEditor(props: PackEditorProps) {
  const { roster } = props;
  const [id, setId] = useState("mein-pack");
  const [version, setVersion] = useState("1.0.0");
  const [name, setName] = useState("Mein Pack");
  const [consentDone, setConsentDone] = useState(isConsentAccepted());
  const [slotUi, setSlotUi] = useState<Map<number, SlotUi>>(new Map());
  const [status, setStatus] = useState<{ text: string; error: boolean }>({ text: "", error: false });
  const [openMenuVisible, setOpenMenuVisible] = useState(false);
  const [installedPacks, setInstalledPacks] = useState<PackSummary[]>([]);

  const blobsRef = useRef(new Map<number, Blob>());
  const canvasRefs = useRef(new Map<number, HTMLCanvasElement>());
  const objectUrlsRef = useRef<string[]>([]);
  const openedVersionRef = useRef<string | null>(null);
  const versionTouchedRef = useRef(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      for (const url of objectUrlsRef.current.splice(0)) URL.revokeObjectURL(url);
    };
  }, []);

  const idValid = isIdValid(id);
  const versionValid = isVersionValid(version);
  const nameValid = isNameValid(name);
  const hasImage = useMemo(() => [...slotUi.values()].some((s) => s.ready), [slotUi]);
  const canSave = idValid && versionValid && nameValid && hasImage;

  function setUi(index: number, patch: Partial<SlotUi>): void {
    setSlotUi((prev) => {
      const next = new Map(prev);
      next.set(index, { ...(next.get(index) ?? emptyUi()), ...patch });
      return next;
    });
  }

  async function handleFile(index: number, file: File): Promise<void> {
    setUi(index, { error: null });
    try {
      const result = await processImageFile(file);
      blobsRef.current.set(index, result.blob);
      const canvas = canvasRefs.current.get(index);
      if (canvas) await drawIntoCanvas(canvas, result.blob);
      setUi(index, { ready: true, sizeLabel: `${(result.blob.size / 1024).toFixed(1)} KB`, error: null });
    } catch (err) {
      setUi(index, { error: err instanceof Error ? err.message : "Bild konnte nicht verarbeitet werden" });
    }
  }

  function handleRemove(index: number): void {
    blobsRef.current.delete(index);
    setUi(index, { ready: false, sizeLabel: "", error: null });
  }

  function handleNameInput(index: number, value: string): void {
    setUi(index, { nameOverride: value });
  }

  function registerCanvas(index: number, canvas: HTMLCanvasElement | null): void {
    if (canvas) canvasRefs.current.set(index, canvas);
    else canvasRefs.current.delete(index);
  }

  function collectSlots(): Map<number, SlotEntry> {
    const out = new Map<number, SlotEntry>();
    for (const [index, blob] of blobsRef.current) {
      const ui = slotUi.get(index);
      if (!ui?.ready) continue;
      out.set(index, { blob, nameOverride: ui.nameOverride });
    }
    return out;
  }

  function effectiveVersion(): string {
    if (openedVersionRef.current !== null && !versionTouchedRef.current) {
      const bumped = bumpPatchVersion(openedVersionRef.current);
      if (bumped !== version) setVersion(bumped);
      return bumped;
    }
    return version.trim();
  }

  async function applyOpenedPack(
    openId: string, openVersion: string, openName: string,
    teachers: OpenedTeachers, resolveBlob: (path: string) => Blob | null,
  ): Promise<void> {
    setId(openId);
    setVersion(openVersion);
    setName(openName);
    openedVersionRef.current = openVersion;
    versionTouchedRef.current = false;

    const entries = slotIndicesFromTeachers(teachers, roster.length);
    for (const [index, entry] of entries) {
      const blob = resolveBlob(entry.image);
      if (!blob) continue;
      blobsRef.current.set(index, blob);
      const canvas = canvasRefs.current.get(index);
      if (canvas) await drawIntoCanvas(canvas, blob);
      setUi(index, {
        ready: true,
        sizeLabel: `${(blob.size / 1024).toFixed(1)} KB`,
        error: null,
        nameOverride: entry.name ?? "",
      });
    }
    setOpenMenuVisible(false);
    setStatus({ text: `pack "${openName}" geöffnet`, error: false });
  }

  async function openInstalled(pack: PackSummary): Promise<void> {
    const stored = await getStoredPack(pack.id);
    if (!stored) {
      setStatus({ text: "pack nicht gefunden", error: true });
      return;
    }
    await applyOpenedPack(
      stored.id, stored.version, stored.name, stored.teachers,
      (path) => stored.images[path] ?? null,
    );
  }

  async function openFromFile(file: File): Promise<void> {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { manifest, assets } = decodeBbpack(bytes);
      const m = manifest as { id?: unknown; version?: unknown; name?: unknown; teachers?: unknown };
      if (
        !m || typeof m !== "object" || typeof m.id !== "string" || typeof m.version !== "string"
        || typeof m.name !== "string" || !m.teachers || typeof m.teachers !== "object"
      ) {
        throw new Error("pack.json hat ein ungültiges Format");
      }
      const assetsByName = new Map(assets.map((a) => [a.name, a]));
      await applyOpenedPack(m.id, m.version, m.name, m.teachers as OpenedTeachers, (path) => {
        const asset = assetsByName.get(path);
        return asset ? new Blob([asset.bytes], { type: asset.mime }) : null;
      });
    } catch (err) {
      setStatus({ text: err instanceof Error ? err.message : "pack konnte nicht geöffnet werden", error: true });
    }
  }

  async function toggleOpenMenu(): Promise<void> {
    if (!openMenuVisible) setInstalledPacks(await listPacks());
    setOpenMenuVisible((v) => !v);
  }

  async function handleDownload(): Promise<void> {
    setStatus({ text: "erstelle pack…", error: false });
    try {
      const meta = { id, name: name.trim(), version: effectiveVersion() };
      const bytes = await buildPack(roster, collectSlots(), meta);
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      objectUrlsRef.current.push(url);
      const filename = sanitizePackName(`${meta.id}-${meta.version}`);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setStatus({ text: `heruntergeladen: "${filename}"`, error: false });
    } catch (err) {
      setStatus({ text: err instanceof Error ? err.message : "download fehlgeschlagen", error: true });
    }
  }

  async function handleInstall(): Promise<void> {
    setStatus({ text: "installiere…", error: false });
    try {
      const meta = { id, name: name.trim(), version: effectiveVersion() };
      const bytes = await buildPack(roster, collectSlots(), meta);
      const wasActive = getActivePackId() === meta.id;
      const stored = await importPackFromFile(
        new File([bytes], `${meta.id}.bbpack`, { type: "application/octet-stream" }),
      );
      if (wasActive) {
        invalidatePackCache(stored.id);
        await setActivePackId(stored.id);
      }
      openedVersionRef.current = stored.version;
      versionTouchedRef.current = false;
      setStatus({ text: `installiert: "${stored.name}"`, error: false });
      props.onInstalled?.();
    } catch (err) {
      setStatus({ text: err instanceof Error ? err.message : "installation fehlgeschlagen", error: true });
    }
  }

  return (
    <Overlay id="pack-editor" onClose={props.onClose} closeOnBackdrop={false}>
      <Modal class="pack-editor-modal">
        <h2 class="bb-heading">PACK EDITOR</h2>

        <div class="pack-editor-toolbar">
          <Button small onClick={() => void toggleOpenMenu()}>PACK ÖFFNEN</Button>
          {openMenuVisible ? (
            <div class="pack-editor-openmenu">
              {installedPacks.length === 0 ? (
                <div class="pack-editor-openmenu-empty">keine installierten packs</div>
              ) : (
                installedPacks.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    class="bb-seg-btn"
                    onClick={() => void openInstalled(p)}
                  >
                    {p.name} v{p.version}
                  </button>
                ))
              )}
              <label class="bb-btn small pack-editor-openfile">
                Datei wählen
                <input
                  type="file"
                  accept=".bbpack"
                  hidden
                  onChange={(e) => {
                    const input = e.target as HTMLInputElement;
                    const file = input.files?.[0];
                    input.value = "";
                    if (file) void openFromFile(file);
                  }}
                />
              </label>
            </div>
          ) : null}
        </div>

        <div class="pack-editor-meta">
          <div class="pack-editor-field">
            <label>ID</label>
            <input
              id="pack-editor-id" class={idValid ? "bb-input" : "bb-input error"} type="text" value={id}
              onInput={(e) => setId((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="pack-editor-field">
            <label>Version</label>
            <input
              id="pack-editor-version" class={versionValid ? "bb-input" : "bb-input error"} type="text" value={version}
              onInput={(e) => {
                versionTouchedRef.current = true;
                setVersion((e.target as HTMLInputElement).value);
              }}
            />
          </div>
          <div class="pack-editor-field">
            <label>Name</label>
            <input
              id="pack-editor-name" class={nameValid ? "bb-input" : "bb-input error"} type="text" value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>

        <div id="pack-editor-slots" class="bb-scroll pack-editor-slots">
          {roster.map((entry, index) => (
            <SlotCard
              key={index}
              entry={entry}
              index={index}
              ui={slotUi.get(index) ?? emptyUi()}
              disabled={!consentDone}
              onFile={handleFile}
              onRemove={handleRemove}
              onNameInput={handleNameInput}
              registerCanvas={registerCanvas}
            />
          ))}
        </div>

        <div class="pack-editor-actions">
          <Button id="pack-editor-download" small disabled={!canSave} onClick={() => void handleDownload()}>
            PACK HERUNTERLADEN
          </Button>
          <Button id="pack-editor-install" small disabled={!canSave} onClick={() => void handleInstall()}>
            DIREKT INSTALLIEREN
          </Button>
        </div>

        <div id="pack-editor-status" class={status.error ? "error" : undefined}>{status.text}</div>

        <Button id="pack-editor-close" variant="back" onClick={props.onClose}>← ZURÜCK</Button>
      </Modal>

      {!consentDone ? (
        <PackConsent onAccept={() => setConsentDone(true)} onCancel={props.onClose} />
      ) : null}
    </Overlay>
  );
}
