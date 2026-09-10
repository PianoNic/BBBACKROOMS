import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { decodeBbpack } from "../../../core/bbpack";
import { MUSIC_DEFINITIONS, SOUND_DEFINITIONS } from "../../../core/soundRegistry";
import {
  getActivePackId, getStoredPack, importPackFromFile, invalidatePackCache,
  listPacks, setActivePackId, type PackSummary,
} from "../../../core/texturePacks";
import type { RosterEntry } from "../../../net/protocol";
import { Button } from "../components/controls";
import { Modal, Overlay } from "../components/Overlay";
import { isConsentAccepted, PackConsent } from "./PackConsent";
import { AudioRow, TeacherTauntRow, type AudioRowUi } from "./packs/AudioRow";
import { basenameOf, processAudioFile, sizeLabelFor, type AudioAsset } from "./packs/audioProcessing";
import {
  bumpPatchVersion, buildPack, drawIntoCanvas, isIdValid, isNameValid, isVersionValid,
  processImageFile, sanitizePackName, slotIndicesFromTeachers,
  type AudioBuildInput, type OpenedTeacherEntry, type SlotEntry,
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

function emptyAudioUi(): AudioRowUi {
  return { fileName: null, sizeLabel: "", error: null };
}

type OpenedPackAudio = { sounds: Record<string, string>; music: Record<string, string> };
type EditorTab = "teachers" | "audio";

export function PackEditor(props: PackEditorProps) {
  const { roster } = props;
  const [id, setId] = useState("mein-pack");
  const [version, setVersion] = useState("1.0.0");
  const [name, setName] = useState("Mein Pack");
  const [consentDone, setConsentDone] = useState(isConsentAccepted());
  const [tab, setTab] = useState<EditorTab>("teachers");
  const [slotUi, setSlotUi] = useState<Map<number, SlotUi>>(new Map());
  const [soundUi, setSoundUi] = useState<Map<string, AudioRowUi>>(new Map());
  const [musicUi, setMusicUi] = useState<Map<string, AudioRowUi>>(new Map());
  const [teacherSoundUi, setTeacherSoundUi] = useState<Map<number, AudioRowUi>>(new Map());
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; error: boolean }>({ text: "", error: false });
  const [openMenuVisible, setOpenMenuVisible] = useState(false);
  const [installedPacks, setInstalledPacks] = useState<PackSummary[]>([]);

  const blobsRef = useRef(new Map<number, Blob>());
  const canvasRefs = useRef(new Map<number, HTMLCanvasElement>());
  const objectUrlsRef = useRef<string[]>([]);
  const previewUrlsRef = useRef(new Map<string, string>());
  const currentAudioRef = useRef<{ key: string; audio: HTMLAudioElement } | null>(null);
  const soundFilesRef = useRef(new Map<string, AudioAsset>());
  const musicFilesRef = useRef(new Map<string, AudioAsset>());
  const teacherSoundFilesRef = useRef(new Map<number, AudioAsset>());
  const openedVersionRef = useRef<string | null>(null);
  const versionTouchedRef = useRef(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      for (const url of objectUrlsRef.current.splice(0)) URL.revokeObjectURL(url);
      for (const url of previewUrlsRef.current.values()) URL.revokeObjectURL(url);
      previewUrlsRef.current.clear();
      currentAudioRef.current?.audio.pause();
      currentAudioRef.current = null;
    };
  }, []);

  const idValid = isIdValid(id);
  const versionValid = isVersionValid(version);
  const nameValid = isNameValid(name);
  const hasImage = useMemo(() => [...slotUi.values()].some((s) => s.ready), [slotUi]);
  const hasAudio = useMemo(() => {
    const anyFile = (m: Map<unknown, AudioRowUi>) => [...m.values()].some((u) => u.fileName !== null);
    return anyFile(soundUi) || anyFile(musicUi) || anyFile(teacherSoundUi);
  }, [soundUi, musicUi, teacherSoundUi]);
  const canSave = idValid && versionValid && nameValid && (hasImage || hasAudio);

  function setUi(index: number, patch: Partial<SlotUi>): void {
    setSlotUi((prev) => {
      const next = new Map(prev);
      next.set(index, { ...(next.get(index) ?? emptyUi()), ...patch });
      return next;
    });
  }

  function setSoundRowUi(soundId: string, patch: Partial<AudioRowUi>): void {
    setSoundUi((prev) => {
      const next = new Map(prev);
      next.set(soundId, { ...(next.get(soundId) ?? emptyAudioUi()), ...patch });
      return next;
    });
  }

  function setMusicRowUi(trackId: string, patch: Partial<AudioRowUi>): void {
    setMusicUi((prev) => {
      const next = new Map(prev);
      next.set(trackId, { ...(next.get(trackId) ?? emptyAudioUi()), ...patch });
      return next;
    });
  }

  function setTeacherSoundRowUi(index: number, patch: Partial<AudioRowUi>): void {
    setTeacherSoundUi((prev) => {
      const next = new Map(prev);
      next.set(index, { ...(next.get(index) ?? emptyAudioUi()), ...patch });
      return next;
    });
  }

  function stopPreview(): void {
    const current = currentAudioRef.current;
    if (current) {
      current.audio.pause();
      currentAudioRef.current = null;
    }
    setPlayingKey(null);
  }

  function togglePreview(key: string, url: string): void {
    if (currentAudioRef.current?.key === key) {
      stopPreview();
      return;
    }
    stopPreview();
    const audio = new Audio(url);
    audio.addEventListener("ended", () => {
      if (currentAudioRef.current?.audio === audio) stopPreview();
    });
    void audio.play().catch(() => {});
    currentAudioRef.current = { key, audio };
    setPlayingKey(key);
  }

  function previewUrlFor(key: string, blob: Blob): string {
    const existing = previewUrlsRef.current.get(key);
    if (existing) return existing;
    const url = URL.createObjectURL(blob);
    previewUrlsRef.current.set(key, url);
    return url;
  }

  function revokePreview(key: string): void {
    const url = previewUrlsRef.current.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      previewUrlsRef.current.delete(key);
    }
  }

  function clearAudioSelections(): void {
    stopPreview();
    for (const key of [...previewUrlsRef.current.keys()]) revokePreview(key);
    soundFilesRef.current.clear();
    musicFilesRef.current.clear();
    teacherSoundFilesRef.current.clear();
    setSoundUi(new Map());
    setMusicUi(new Map());
    setTeacherSoundUi(new Map());
  }

  function handleSoundFile(soundId: string, file: File): void {
    try {
      const asset = processAudioFile(file, "sound");
      soundFilesRef.current.set(soundId, asset);
      revokePreview(`sound:${soundId}`);
      setSoundRowUi(soundId, { fileName: asset.fileName, sizeLabel: sizeLabelFor(asset.blob.size), error: null });
    } catch (err) {
      setSoundRowUi(soundId, { error: err instanceof Error ? err.message : "Datei ungültig" });
    }
  }

  function handleSoundRemove(soundId: string): void {
    soundFilesRef.current.delete(soundId);
    if (currentAudioRef.current?.key === `file:sound:${soundId}`) stopPreview();
    revokePreview(`sound:${soundId}`);
    setSoundRowUi(soundId, { fileName: null, sizeLabel: "", error: null });
  }

  function handleMusicFile(trackId: string, file: File): void {
    try {
      const asset = processAudioFile(file, "music");
      musicFilesRef.current.set(trackId, asset);
      revokePreview(`music:${trackId}`);
      setMusicRowUi(trackId, { fileName: asset.fileName, sizeLabel: sizeLabelFor(asset.blob.size), error: null });
    } catch (err) {
      setMusicRowUi(trackId, { error: err instanceof Error ? err.message : "Datei ungültig" });
    }
  }

  function handleMusicRemove(trackId: string): void {
    musicFilesRef.current.delete(trackId);
    if (currentAudioRef.current?.key === `file:music:${trackId}`) stopPreview();
    revokePreview(`music:${trackId}`);
    setMusicRowUi(trackId, { fileName: null, sizeLabel: "", error: null });
  }

  function handleTeacherSoundFile(index: number, file: File): void {
    try {
      const asset = processAudioFile(file, "sound");
      teacherSoundFilesRef.current.set(index, asset);
      revokePreview(`teacher:${index}`);
      setTeacherSoundRowUi(index, { fileName: asset.fileName, sizeLabel: sizeLabelFor(asset.blob.size), error: null });
    } catch (err) {
      setTeacherSoundRowUi(index, { error: err instanceof Error ? err.message : "Datei ungültig" });
    }
  }

  function handleTeacherSoundRemove(index: number): void {
    teacherSoundFilesRef.current.delete(index);
    if (currentAudioRef.current?.key === `file:teacher:${index}`) stopPreview();
    revokePreview(`teacher:${index}`);
    setTeacherSoundRowUi(index, { fileName: null, sizeLabel: "", error: null });
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

  function collectAudio(): AudioBuildInput {
    return {
      sounds: new Map(soundFilesRef.current),
      music: new Map(musicFilesRef.current),
      teacherSounds: new Map(teacherSoundFilesRef.current),
    };
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
    teachers: Record<string, OpenedTeacherEntry>, audioManifest: OpenedPackAudio,
    resolveBlob: (path: string) => Blob | null,
  ): Promise<void> {
    setId(openId);
    setVersion(openVersion);
    setName(openName);
    openedVersionRef.current = openVersion;
    versionTouchedRef.current = false;

    clearAudioSelections();

    const entries = slotIndicesFromTeachers(teachers, roster.length);
    for (const [index, entry] of entries) {
      if (entry.image) {
        const blob = resolveBlob(entry.image);
        if (blob) {
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
      } else if (entry.name) {
        setUi(index, { nameOverride: entry.name });
      }
      if (entry.sound) {
        const blob = resolveBlob(entry.sound);
        if (blob) {
          const fileName = basenameOf(entry.sound);
          teacherSoundFilesRef.current.set(index, { blob, mime: blob.type, fileName });
          setTeacherSoundRowUi(index, { fileName, sizeLabel: sizeLabelFor(blob.size), error: null });
        }
      }
    }

    for (const def of SOUND_DEFINITIONS) {
      const assetName = audioManifest.sounds[def.id];
      if (!assetName) continue;
      const blob = resolveBlob(assetName);
      if (!blob) continue;
      const fileName = basenameOf(assetName);
      soundFilesRef.current.set(def.id, { blob, mime: blob.type, fileName });
      setSoundRowUi(def.id, { fileName, sizeLabel: sizeLabelFor(blob.size), error: null });
    }

    for (const def of MUSIC_DEFINITIONS) {
      const assetName = audioManifest.music[def.id];
      if (!assetName) continue;
      const blob = resolveBlob(assetName);
      if (!blob) continue;
      const fileName = basenameOf(assetName);
      musicFilesRef.current.set(def.id, { blob, mime: blob.type, fileName });
      setMusicRowUi(def.id, { fileName, sizeLabel: sizeLabelFor(blob.size), error: null });
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
    const audioAssets = stored.audio ?? {};
    await applyOpenedPack(
      stored.id, stored.version, stored.name, stored.teachers,
      { sounds: stored.sounds ?? {}, music: stored.music ?? {} },
      (path) => stored.images[path] ?? audioAssets[path] ?? null,
    );
  }

  async function openFromFile(file: File): Promise<void> {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { manifest, assets } = decodeBbpack(bytes);
      const m = manifest as {
        id?: unknown; version?: unknown; name?: unknown; teachers?: unknown;
        sounds?: unknown; music?: unknown;
      };
      if (
        !m || typeof m !== "object" || typeof m.id !== "string" || typeof m.version !== "string"
        || typeof m.name !== "string"
      ) {
        throw new Error("pack.json hat ein ungültiges Format");
      }
      const teachers = m.teachers && typeof m.teachers === "object"
        ? m.teachers as Record<string, OpenedTeacherEntry>
        : {};
      const sounds = m.sounds && typeof m.sounds === "object" ? m.sounds as Record<string, string> : {};
      const music = m.music && typeof m.music === "object" ? m.music as Record<string, string> : {};
      const assetsByName = new Map(assets.map((a) => [a.name, a]));
      await applyOpenedPack(m.id, m.version, m.name, teachers, { sounds, music }, (path) => {
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
      const bytes = await buildPack(roster, collectSlots(), meta, collectAudio());
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
      const bytes = await buildPack(roster, collectSlots(), meta, collectAudio());
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

        <div class="pack-editor-tabs" role="tablist">
          <button
            type="button"
            id="pack-editor-tab-teachers"
            role="tab"
            aria-selected={tab === "teachers"}
            class={tab === "teachers" ? "bb-seg-btn active" : "bb-seg-btn"}
            onClick={() => setTab("teachers")}
          >
            LEHRER
          </button>
          <button
            type="button"
            id="pack-editor-tab-audio"
            role="tab"
            aria-selected={tab === "audio"}
            class={tab === "audio" ? "bb-seg-btn active" : "bb-seg-btn"}
            onClick={() => setTab("audio")}
          >
            AUDIO
          </button>
        </div>

        {tab === "teachers" ? (
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
        ) : (
          <div id="pack-editor-audio" class="bb-scroll pack-editor-audio">
            <div class="pack-audio-section">
              <h3 class="pack-audio-section-title">SOUNDS</h3>
              {SOUND_DEFINITIONS.map((def) => (
                <AudioRow
                  key={def.id}
                  def={def}
                  ui={soundUi.get(def.id) ?? emptyAudioUi()}
                  disabled={!consentDone}
                  playingDefault={playingKey === `default:sound:${def.id}`}
                  playingReplacement={playingKey === `file:sound:${def.id}`}
                  onPlayDefault={() => {
                    if (def.defaults.length > 0) togglePreview(`default:sound:${def.id}`, def.defaults[0]);
                  }}
                  onPlayReplacement={() => {
                    const asset = soundFilesRef.current.get(def.id);
                    if (!asset) return;
                    togglePreview(`file:sound:${def.id}`, previewUrlFor(`sound:${def.id}`, asset.blob));
                  }}
                  onFile={(file) => handleSoundFile(def.id, file)}
                  onRemove={() => handleSoundRemove(def.id)}
                />
              ))}
            </div>
            <div class="pack-audio-section">
              <h3 class="pack-audio-section-title">MUSIK</h3>
              {MUSIC_DEFINITIONS.map((def) => (
                <AudioRow
                  key={def.id}
                  def={def}
                  ui={musicUi.get(def.id) ?? emptyAudioUi()}
                  disabled={!consentDone}
                  playingDefault={playingKey === `default:music:${def.id}`}
                  playingReplacement={playingKey === `file:music:${def.id}`}
                  onPlayDefault={() => {
                    if (def.defaults.length > 0) togglePreview(`default:music:${def.id}`, def.defaults[0]);
                  }}
                  onPlayReplacement={() => {
                    const asset = musicFilesRef.current.get(def.id);
                    if (!asset) return;
                    togglePreview(`file:music:${def.id}`, previewUrlFor(`music:${def.id}`, asset.blob));
                  }}
                  onFile={(file) => handleMusicFile(def.id, file)}
                  onRemove={() => handleMusicRemove(def.id)}
                />
              ))}
            </div>
            <div class="pack-audio-section">
              <h3 class="pack-audio-section-title">LEHRER-TAUNTS</h3>
              {roster.map((entry, index) => (
                <TeacherTauntRow
                  key={index}
                  entry={entry}
                  index={index}
                  ui={teacherSoundUi.get(index) ?? emptyAudioUi()}
                  disabled={!consentDone}
                  playingReplacement={playingKey === `file:teacher:${index}`}
                  onPlayReplacement={() => {
                    const asset = teacherSoundFilesRef.current.get(index);
                    if (!asset) return;
                    togglePreview(`file:teacher:${index}`, previewUrlFor(`teacher:${index}`, asset.blob));
                  }}
                  onFile={(file) => handleTeacherSoundFile(index, file)}
                  onRemove={() => handleTeacherSoundRemove(index)}
                />
              ))}
            </div>
          </div>
        )}

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
