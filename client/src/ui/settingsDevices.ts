/** Device + mic-meter rows used inside the settings panel.
 *
 *  Pulled out of `settingsPanel.ts` so that file stays focused on generic
 *  row builders (sliders / toggles / segmented buttons). */
import {
  getSettings, onSettingsChange, updateSetting, type Settings,
} from "../core/settings";
import { acquireMedia } from "../gameplay/webrtcIce";
import { el } from "./dom";
import { createDeviceSelect, type DeviceKind } from "./deviceSelect";
import { createMicMeter } from "./micMeter";

function deviceRow(
  label: string, kind: DeviceKind,
  initial: string, onChange: (id: string) => void,
): HTMLElement {
  const row = el<HTMLDivElement>("div", "set-row");
  row.appendChild(el("label", undefined, label));
  const ctrl = el<HTMLDivElement>("div", "set-ctrl");
  ctrl.appendChild(createDeviceSelect(kind, initial, onChange).element);
  row.appendChild(ctrl);
  return row;
}

export function cameraDeviceRow(): HTMLElement {
  return deviceRow(
    "Camera", "videoinput", getSettings().cameraDeviceId,
    (id) => updateSetting("cameraDeviceId", id),
  );
}

export function micDeviceRow(): HTMLElement {
  return deviceRow(
    "Microphone", "audioinput", getSettings().micDeviceId,
    (id) => updateSetting("micDeviceId", id),
  );
}

/** Wraps `acquireMedia` with the boilerplate every preview row needs:
 *  acquire on init, swap when the watched setting changes, stop all
 *  tracks on dispose. `onStream` receives null between acquisitions. */
function createDevicePreview(
  kind: "video" | "audio",
  watch: keyof Pick<Settings, "cameraDeviceId" | "micDeviceId">,
  onStream: (s: MediaStream | null) => void,
): () => void {
  let active: MediaStream | null = null;
  let disposed = false;
  let last = getSettings()[watch];

  async function refresh(): Promise<void> {
    if (disposed) return;
    active?.getTracks().forEach((t) => t.stop());
    active = null;
    onStream(null);
    const stream = await acquireMedia(kind);
    if (disposed) {
      stream?.getTracks().forEach((t) => t.stop());
      return;
    }
    active = stream;
    onStream(stream);
  }

  void refresh();
  const unsub = onSettingsChange((s) => {
    if (s[watch] !== last) {
      last = s[watch];
      void refresh();
    }
  });

  return () => {
    disposed = true;
    unsub();
    active?.getTracks().forEach((t) => t.stop());
    active = null;
    onStream(null);
  };
}

/** Live camera preview. Camera light goes off as soon as `dispose` runs. */
export function camPreviewRow(): { row: HTMLElement; dispose: () => void } {
  const row = el<HTMLDivElement>("div", "set-row");
  row.appendChild(el("label", undefined, "Cam preview"));
  const ctrl = el<HTMLDivElement>("div", "set-ctrl");
  const wrap = el<HTMLDivElement>("div", "cam-preview");
  const video = el<HTMLVideoElement>("video", "cam-preview-video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  const placeholder = el<HTMLDivElement>("div", "cam-preview-placeholder", "no signal");
  wrap.append(video, placeholder);
  ctrl.appendChild(wrap);
  row.appendChild(ctrl);

  const dispose = createDevicePreview("video", "cameraDeviceId", (stream) => {
    video.srcObject = stream;
    placeholder.style.display = stream ? "none" : "";
  });
  return { row, dispose };
}

/** Live mic VU bar with a dedicated preview stream — independent of the
 *  in-game mic toggle so the player can verify their device before
 *  unmuting. */
export function micMeterRow(): { row: HTMLElement; dispose: () => void } {
  const row = el<HTMLDivElement>("div", "set-row");
  row.appendChild(el("label", undefined, "Mic activity"));
  const ctrl = el<HTMLDivElement>("div", "set-ctrl");
  const meter = createMicMeter();
  ctrl.appendChild(meter.element);
  row.appendChild(ctrl);

  const stop = createDevicePreview("audio", "micDeviceId", (stream) => {
    meter.setStream(stream);
  });
  return {
    row,
    dispose: () => { stop(); meter.dispose(); },
  };
}
