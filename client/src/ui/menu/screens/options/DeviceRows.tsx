import { useEffect, useMemo } from "preact/hooks";
import { camPreviewRow, cameraDeviceRow, micDeviceRow, micMeterRow } from "../../../settingsDevices";
import { DomNode } from "../../components/DomNode";

export function CameraDeviceRow() {
  const node = useMemo(() => cameraDeviceRow(), []);
  return <DomNode node={node} />;
}

export function MicDeviceRow() {
  const node = useMemo(() => micDeviceRow(), []);
  return <DomNode node={node} />;
}

export function CamPreviewRow() {
  const built = useMemo(() => camPreviewRow(), []);
  useEffect(() => built.dispose, [built]);
  return <DomNode node={built.row} />;
}

export function MicMeterRow() {
  const built = useMemo(() => micMeterRow(), []);
  useEffect(() => built.dispose, [built]);
  return <DomNode node={built.row} />;
}
