/** Device dropdown for camera or microphone selection.
 *
 *  Browsers expose labels only after at least one permission grant — before
 *  that, devices have empty `label` strings. We force a one-time silent
 *  getUserMedia probe so labels are visible on first paint of the settings
 *  page. */
import { useEffect, useState } from "preact/hooks";

export type DeviceKind = "videoinput" | "audioinput";

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

export function DeviceSelect(props: {
  kind: DeviceKind;
  initial: string;
  onChange: (deviceId: string) => void;
}) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function refresh(): Promise<void> {
      await ensureLabelsUnlocked(props.kind);
      const all = await navigator.mediaDevices.enumerateDevices();
      if (cancelled) return;
      setDevices(all.filter((d) => d.kind === props.kind));
    }
    void refresh();
    return () => { cancelled = true; };
  }, [props.kind]);

  return (
    <select
      class="device-select"
      value={props.initial}
      onChange={(e) => props.onChange((e.target as HTMLSelectElement).value)}
    >
      <option value="">System default</option>
      {devices.map((d) => (
        <option key={d.deviceId} value={d.deviceId}>
          {d.label || `${props.kind} ${d.deviceId.slice(0, 6)}`}
        </option>
      ))}
    </select>
  );
}
