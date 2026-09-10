/** Device + mic-meter rows used inside the settings panel.
 *
 *  Pulled out of `settingsPanel.ts` so that file stays focused on generic
 *  row builders (sliders / toggles / segmented buttons). */
import { useEffect, useRef, useState } from "preact/hooks";
import {
  getSettings, onSettingsChange, updateSetting, type Settings,
} from "../core/settings";
import { acquireMedia } from "../gameplay/webrtcIce";
import { DeviceSelect, type DeviceKind } from "./deviceSelect";
import { MicMeter } from "./micMeter";

export function CameraDeviceRow() {
  return (
    <div class="set-row">
      <label>Camera</label>
      <div class="set-ctrl">
        <DeviceSelect
          kind={"videoinput" as DeviceKind}
          initial={getSettings().cameraDeviceId}
          onChange={(id) => updateSetting("cameraDeviceId", id)}
        />
      </div>
    </div>
  );
}

export function MicDeviceRow() {
  return (
    <div class="set-row">
      <label>Microphone</label>
      <div class="set-ctrl">
        <DeviceSelect
          kind={"audioinput" as DeviceKind}
          initial={getSettings().micDeviceId}
          onChange={(id) => updateSetting("micDeviceId", id)}
        />
      </div>
    </div>
  );
}

/** Wraps `acquireMedia` with the boilerplate every preview row needs:
 *  acquire on init, swap when the watched setting changes, stop all
 *  tracks on dispose. Returns null between acquisitions. */
function useDevicePreview(
  kind: "video" | "audio",
  watch: keyof Pick<Settings, "cameraDeviceId" | "micDeviceId">,
): MediaStream | null {
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let active: MediaStream | null = null;
    let disposed = false;
    let last = getSettings()[watch];

    async function refresh(): Promise<void> {
      if (disposed) return;
      active?.getTracks().forEach((t) => t.stop());
      active = null;
      setStream(null);
      const s = await acquireMedia(kind);
      if (disposed) {
        s?.getTracks().forEach((t) => t.stop());
        return;
      }
      active = s;
      setStream(s);
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
      setStream(null);
    };
  }, [kind, watch]);

  return stream;
}

/** Live camera preview. Camera light goes off as soon as the row unmounts. */
export function CamPreviewRow() {
  const stream = useDevicePreview("video", "cameraDeviceId");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div class="set-row">
      <label>Cam preview</label>
      <div class="set-ctrl">
        <div class="cam-preview">
          <video ref={videoRef} class="cam-preview-video" autoPlay muted playsInline />
          <div class="cam-preview-placeholder" style={{ display: stream ? "none" : "" }}>
            no signal
          </div>
        </div>
      </div>
    </div>
  );
}

/** Live mic VU bar with a dedicated preview stream — independent of the
 *  in-game mic toggle so the player can verify their device before
 *  unmuting. */
export function MicMeterRow() {
  const stream = useDevicePreview("audio", "micDeviceId");
  return (
    <div class="set-row">
      <label>Mic activity</label>
      <div class="set-ctrl">
        <MicMeter stream={stream} />
      </div>
    </div>
  );
}
