/** Device dropdown for camera or microphone selection.
 *
 *  Browsers expose labels only after at least one permission grant — before
 *  that, devices have empty `label` strings. We force a one-time silent
 *  getUserMedia probe so labels are visible on first paint of the settings
 *  page. */
import { el } from "./dom";

export type DeviceKind = "videoinput" | "audioinput";

export function createDeviceSelect(
  kind: DeviceKind, initial: string,
  onChange: (deviceId: string) => void,
): { element: HTMLElement } {
  const select = el<HTMLSelectElement>("select", "device-select");
  const defaultOpt = el<HTMLOptionElement>("option", undefined, "System default");
  defaultOpt.value = "";
  select.appendChild(defaultOpt);
  if (initial === "") defaultOpt.selected = true;

  async function refresh(): Promise<void> {
    await ensureLabelsUnlocked(kind);
    const devices = await navigator.mediaDevices.enumerateDevices();
    const wanted = devices.filter((d) => d.kind === kind);
    while (select.children.length > 1) select.removeChild(select.lastChild!);
    for (const d of wanted) {
      const opt = el<HTMLOptionElement>("option", undefined, d.label || `${kind} ${d.deviceId.slice(0, 6)}`);
      opt.value = d.deviceId;
      if (d.deviceId === initial) opt.selected = true;
      select.appendChild(opt);
    }
  }

  select.onchange = () => onChange(select.value);
  void refresh();

  return { element: select };
}

let videoUnlocked = false;
let audioUnlocked = false;

async function ensureLabelsUnlocked(kind: DeviceKind): Promise<void> {
  if (kind === "videoinput" && videoUnlocked) return;
  if (kind === "audioinput" && audioUnlocked) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia(
      kind === "videoinput" ? { video: true } : { audio: true },
    );
    stream.getTracks().forEach((t) => t.stop());
    if (kind === "videoinput") videoUnlocked = true;
    else audioUnlocked = true;
  } catch {
    // Permission denied — labels stay blank but ids still work.
  }
}
