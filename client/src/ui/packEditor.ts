import JSZip from "jszip";
import { MAX_TEACHER_ENTRIES, PACK_ID_RE, importPackFromFile } from "../core/texturePacks";
import { el } from "./dom";
import type { RosterEntry } from "../net/protocol";

const MAX_IMAGE_BYTES = 512 * 1024;
const MAX_IMAGE_DIM = 1024;
const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];

type SlotState = { blob: Blob | null; sourceWidth: number; sourceHeight: number };

type SlotRefs = {
  wrapper: HTMLDivElement;
  defaultImg: HTMLImageElement;
  previewCanvas: HTMLCanvasElement;
  fileInput: HTMLInputElement;
  pickBtn: HTMLButtonElement;
  removeBtn: HTMLButtonElement;
  nameInput: HTMLInputElement;
  sizeLabel: HTMLDivElement;
  errorLabel: HTMLDivElement;
};

let consentAccepted = false;

function slugifyImage(image: string): string {
  const base = image.replace(/\.[^./]+$/, "");
  return base.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function sanitizeZipName(base: string): string {
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "-") || "pack";
  return cleaned.toLowerCase().endsWith(".zip") ? cleaned : `${cleaned}.zip`;
}

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function processImageFile(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const outSize = Math.min(side, MAX_IMAGE_DIM);
  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas nicht verfügbar");
  }
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, outSize, outSize);
  bitmap.close();
  for (const quality of QUALITIES) {
    const blob = await encodeCanvas(canvas, quality);
    if (blob && blob.size <= MAX_IMAGE_BYTES) return { blob, width: outSize, height: outSize };
  }
  throw new Error("Bild zu groß, auch bei niedrigster Qualität");
}

async function drawIntoCanvas(canvas: HTMLCanvasElement, blob: Blob): Promise<void> {
  const bitmap = await createImageBitmap(blob);
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
}

function buildMetaField(
  id: string, label: string, defaultValue: string,
): { row: HTMLDivElement; input: HTMLInputElement } {
  const row = el<HTMLDivElement>("div", "pack-editor-field");
  row.appendChild(el("label", undefined, label));
  const input = el<HTMLInputElement>("input");
  input.type = "text";
  input.id = id;
  input.value = defaultValue;
  row.appendChild(input);
  return { row, input };
}

function buildConsentModal(onAccept: () => void, onCancel: () => void): HTMLDivElement {
  const modal = el<HTMLDivElement>("div");
  modal.id = "pack-consent";
  const box = el<HTMLDivElement>("div", "panel panel-brackets");
  box.appendChild(el("h2", undefined, "HINWEIS"));
  box.appendChild(el("p", "pack-consent-text",
    "Nur eigene Bilder oder Bilder mit Einwilligung der abgebildeten Person. "
    + "Packs mit Bildern oder Namen realer Personen ohne deren Einwilligung sind nicht erlaubt."));

  const label = el<HTMLLabelElement>("label", "pack-consent-label");
  const check = el<HTMLInputElement>("input");
  check.type = "checkbox";
  check.id = "pack-consent-check";
  label.appendChild(check);
  label.appendChild(document.createTextNode(" Ich versichere, dass ich die Bildrechte habe."));
  box.appendChild(label);

  const row = el<HTMLDivElement>("div", "pack-consent-actions");
  const cancelBtn = el<HTMLButtonElement>("button", "menu-btn small", "Abbrechen");
  cancelBtn.onclick = onCancel;
  const acceptBtn = el<HTMLButtonElement>("button", "menu-btn small", "Verstanden");
  acceptBtn.id = "pack-consent-accept";
  acceptBtn.disabled = true;
  acceptBtn.onclick = () => { if (check.checked) onAccept(); };
  check.onchange = () => { acceptBtn.disabled = !check.checked; };
  row.append(cancelBtn, acceptBtn);
  box.appendChild(row);

  modal.appendChild(box);
  return modal;
}

function buildSlotCard(
  entry: RosterEntry, index: number,
  onFileChange: (index: number, file: File) => void,
  onRemove: (index: number) => void,
): { wrapper: HTMLDivElement; refs: SlotRefs } {
  const wrapper = el<HTMLDivElement>("div", "pack-slot");
  wrapper.id = `pack-slot-${index}`;
  wrapper.dataset.ready = "false";

  const preview = el<HTMLDivElement>("div", "pack-slot-preview");
  const defaultImg = el<HTMLImageElement>("img", "pack-slot-default");
  defaultImg.src = `/teachers/${entry.image}`;
  defaultImg.alt = entry.name;
  const previewCanvas = el<HTMLCanvasElement>("canvas", "pack-slot-canvas");
  previewCanvas.id = `pack-slot-preview-${index}`;
  previewCanvas.hidden = true;
  preview.append(defaultImg, previewCanvas);
  wrapper.appendChild(preview);

  wrapper.appendChild(el("div", "pack-slot-name", entry.name));
  wrapper.appendChild(el("div", "pack-slot-subject", entry.subject));

  const fileInput = el<HTMLInputElement>("input", "slot-file");
  fileInput.type = "file";
  fileInput.id = `pack-slot-file-${index}`;
  fileInput.accept = "image/*";
  fileInput.hidden = true;
  fileInput.disabled = true;
  fileInput.onchange = () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (file) onFileChange(index, file);
  };

  const pickBtn = el<HTMLButtonElement>("button", "menu-btn small", "Bild wählen");
  pickBtn.disabled = true;
  pickBtn.onclick = () => fileInput.click();

  const removeBtn = el<HTMLButtonElement>("button", "menu-btn small pack-slot-remove", "Entfernen");
  removeBtn.hidden = true;
  removeBtn.onclick = () => onRemove(index);

  const btnRow = el<HTMLDivElement>("div", "pack-slot-actions");
  btnRow.append(pickBtn, removeBtn);
  wrapper.appendChild(btnRow);
  wrapper.appendChild(fileInput);

  const nameInput = el<HTMLInputElement>("input", "pack-slot-name-input");
  nameInput.type = "text";
  nameInput.id = `pack-slot-name-${index}`;
  nameInput.placeholder = "Name überschreiben";
  wrapper.appendChild(nameInput);

  const sizeLabel = el<HTMLDivElement>("div", "pack-slot-size");
  wrapper.appendChild(sizeLabel);

  const errorLabel = el<HTMLDivElement>("div", "pack-slot-error error");
  errorLabel.hidden = true;
  wrapper.appendChild(errorLabel);

  return {
    wrapper,
    refs: { wrapper, defaultImg, previewCanvas, fileInput, pickBtn, removeBtn, nameInput, sizeLabel, errorLabel },
  };
}

async function buildZip(
  roster: RosterEntry[], slotState: Map<number, SlotState>, slotRefs: Map<number, SlotRefs>,
  meta: { id: string; version: string; name: string },
): Promise<Blob> {
  const editedIndices = [...slotState.keys()]
    .filter((i) => slotState.get(i)?.blob)
    .sort((a, b) => a - b);
  if (editedIndices.length > MAX_TEACHER_ENTRIES) {
    throw new Error(`höchstens ${MAX_TEACHER_ENTRIES} Bilder pro Pack`);
  }

  const zip = new JSZip();
  const teachers: Record<string, { image: string; name?: string }> = {};

  for (const index of editedIndices) {
    const state = slotState.get(index);
    if (!state?.blob) continue;
    const entry = roster[index];
    const path = `teachers/${slugifyImage(entry.image)}.jpg`;
    zip.file(path, state.blob);
    const overrideName = slotRefs.get(index)?.nameInput.value.trim() ?? "";
    const teacherEntry: { image: string; name?: string } = { image: path };
    if (overrideName) teacherEntry.name = overrideName;
    teachers[String(index)] = teacherEntry;
  }

  for (const index of editedIndices) {
    if (Object.keys(teachers).length >= MAX_TEACHER_ENTRIES) break;
    const entry = roster[index];
    if (Object.prototype.hasOwnProperty.call(teachers, entry.ability)) continue;
    teachers[entry.ability] = teachers[String(index)];
  }

  zip.file("pack.json", JSON.stringify({ id: meta.id, version: meta.version, name: meta.name, teachers }));
  return zip.generateAsync({ type: "blob" });
}

export function openPackEditor(roster: RosterEntry[], onInstalled?: () => void): void {
  const overlay = el<HTMLDivElement>("div");
  overlay.id = "pack-editor";
  const panel = el<HTMLDivElement>("div", "panel panel-brackets");
  panel.appendChild(el("h2", undefined, "PACK EDITOR"));

  const metaRow = el<HTMLDivElement>("div", "pack-editor-meta");
  const idField = buildMetaField("pack-editor-id", "ID", "mein-pack");
  const versionField = buildMetaField("pack-editor-version", "Version", "1.0.0");
  const nameField = buildMetaField("pack-editor-name", "Name", "Mein Pack");
  metaRow.append(idField.row, versionField.row, nameField.row);
  panel.appendChild(metaRow);

  const slotsGrid = el<HTMLDivElement>("div");
  slotsGrid.id = "pack-editor-slots";
  panel.appendChild(slotsGrid);

  const downloadBtn = el<HTMLButtonElement>("button", "menu-btn small", "PACK HERUNTERLADEN");
  downloadBtn.id = "pack-editor-download";
  const installBtn = el<HTMLButtonElement>("button", "menu-btn small", "DIREKT INSTALLIEREN");
  installBtn.id = "pack-editor-install";
  const actionsRow = el<HTMLDivElement>("div", "pack-editor-actions");
  actionsRow.append(downloadBtn, installBtn);
  panel.appendChild(actionsRow);

  const statusLine = el<HTMLDivElement>("div");
  statusLine.id = "pack-editor-status";
  panel.appendChild(statusLine);

  const closeBtn = el<HTMLButtonElement>("button", "menu-btn back", "ZURÜCK");
  closeBtn.id = "pack-editor-close";
  panel.appendChild(closeBtn);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const objectUrls: string[] = [];
  const slotState = new Map<number, SlotState>();
  const slotRefs = new Map<number, SlotRefs>();

  function updateButtons(): void {
    const idValid = PACK_ID_RE.test(idField.input.value);
    idField.input.classList.toggle("error", !idValid);
    const versionValid = versionField.input.value.trim().length > 0 && versionField.input.value.length <= 64;
    versionField.input.classList.toggle("error", !versionValid);
    const nameValid = nameField.input.value.trim().length > 0 && nameField.input.value.length <= 64;
    nameField.input.classList.toggle("error", !nameValid);
    const hasImage = [...slotState.values()].some((s) => s.blob);
    const enabled = idValid && versionValid && nameValid && hasImage;
    downloadBtn.disabled = !enabled;
    installBtn.disabled = !enabled;
  }

  idField.input.oninput = updateButtons;
  versionField.input.oninput = updateButtons;
  nameField.input.oninput = updateButtons;

  function setSlotError(index: number, message: string | null): void {
    const refs = slotRefs.get(index);
    if (!refs) return;
    refs.errorLabel.textContent = message ?? "";
    refs.errorLabel.hidden = !message;
  }

  async function handleFile(index: number, file: File): Promise<void> {
    setSlotError(index, null);
    try {
      const result = await processImageFile(file);
      slotState.set(index, { blob: result.blob, sourceWidth: result.width, sourceHeight: result.height });
      const refs = slotRefs.get(index);
      if (refs) {
        await drawIntoCanvas(refs.previewCanvas, result.blob);
        refs.previewCanvas.hidden = false;
        refs.defaultImg.hidden = true;
        refs.removeBtn.hidden = false;
        refs.sizeLabel.textContent = `${(result.blob.size / 1024).toFixed(1)} KB`;
        refs.wrapper.dataset.ready = "true";
      }
    } catch (err) {
      setSlotError(index, err instanceof Error ? err.message : "Bild konnte nicht verarbeitet werden");
    }
    updateButtons();
  }

  function handleRemove(index: number): void {
    slotState.delete(index);
    const refs = slotRefs.get(index);
    if (refs) {
      refs.previewCanvas.hidden = true;
      refs.defaultImg.hidden = false;
      refs.removeBtn.hidden = true;
      refs.sizeLabel.textContent = "";
      refs.wrapper.dataset.ready = "false";
    }
    setSlotError(index, null);
    updateButtons();
  }

  roster.forEach((entry, index) => {
    const { wrapper, refs } = buildSlotCard(entry, index, (i, f) => void handleFile(i, f), handleRemove);
    slotRefs.set(index, refs);
    slotsGrid.appendChild(wrapper);
  });

  function setConsentEnabled(enabled: boolean): void {
    for (const refs of slotRefs.values()) {
      refs.fileInput.disabled = !enabled;
      refs.pickBtn.disabled = !enabled;
    }
  }

  function readMeta(): { id: string; version: string; name: string } {
    return {
      id: idField.input.value,
      version: versionField.input.value.trim(),
      name: nameField.input.value.trim(),
    };
  }

  downloadBtn.onclick = async () => {
    statusLine.classList.remove("error");
    statusLine.textContent = "erstelle zip…";
    try {
      const meta = readMeta();
      const blob = await buildZip(roster, slotState, slotRefs, meta);
      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      const filename = sanitizeZipName(`${meta.id}-${meta.version}`);
      const a = el<HTMLAnchorElement>("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      statusLine.textContent = `heruntergeladen: "${filename}"`;
    } catch (err) {
      statusLine.textContent = err instanceof Error ? err.message : "download fehlgeschlagen";
      statusLine.classList.add("error");
    }
  };

  installBtn.onclick = async () => {
    statusLine.classList.remove("error");
    statusLine.textContent = "installiere…";
    try {
      const meta = readMeta();
      const blob = await buildZip(roster, slotState, slotRefs, meta);
      const stored = await importPackFromFile(new File([blob], `${meta.id}.zip`, { type: "application/zip" }));
      statusLine.textContent = `installiert: "${stored.name}"`;
      onInstalled?.();
    } catch (err) {
      statusLine.textContent = err instanceof Error ? err.message : "installation fehlgeschlagen";
      statusLine.classList.add("error");
    }
  };

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  function close(): void {
    for (const url of objectUrls.splice(0)) URL.revokeObjectURL(url);
    overlay.remove();
    window.removeEventListener("keydown", onKey);
    document.body.style.overflow = previousOverflow;
  }
  closeBtn.onclick = close;
  const onKey = (e: KeyboardEvent) => {
    if (e.code === "Escape") { e.preventDefault(); close(); }
  };
  window.addEventListener("keydown", onKey);

  updateButtons();

  if (consentAccepted) {
    setConsentEnabled(true);
  } else {
    const modal = buildConsentModal(
      () => { consentAccepted = true; modal.remove(); setConsentEnabled(true); },
      () => { modal.remove(); close(); },
    );
    overlay.appendChild(modal);
  }
}
