import { closeSettingsOverlay } from "../../../settingsPanel";
import { Button } from "../../components/controls";
import { Heading } from "../../components/layout";
import { Modal, Overlay } from "../../components/Overlay";
import { SettingsBody } from "./SettingsBody";

export function SettingsOverlay() {
  return (
    <Overlay id="settings-overlay" onClose={closeSettingsOverlay}>
      <Modal class="settings-overlay-modal">
        <Heading>OPTIONS</Heading>
        <div class="bb-scroll settings-overlay-scroll">
          <SettingsBody mode="accordion" />
        </div>
        <Button variant="back" onClick={closeSettingsOverlay}>← RESUME</Button>
      </Modal>
    </Overlay>
  );
}
