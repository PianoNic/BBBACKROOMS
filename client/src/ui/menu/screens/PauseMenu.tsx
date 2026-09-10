import { useState } from "preact/hooks";
import { MenuButton } from "../components/controls";
import { Heading } from "../components/layout";
import { Modal, Overlay } from "../components/Overlay";
import { pauseMenu } from "../state/overlays";
import { showSettingsOverlay } from "../../settingsPanel";
import type { PauseMenuOptions } from "../state/overlays";

export function PauseMenu(props: { options: PauseMenuOptions }) {
  const { options } = props;
  const [busy, setBusy] = useState(false);
  const [micLabel, setMicLabel] = useState(
    options.mic ? (options.mic.isOn() ? "MIC OFF" : "MIC ON") : "",
  );
  const [camLabel, setCamLabel] = useState(
    options.cam ? (options.cam.isOn() ? "CAM OFF" : "CAM ON") : "",
  );

  const close = () => { pauseMenu.value = null; };

  return (
    <Overlay
      id="pause-overlay"
      closeOnBackdrop={false}
      onClose={() => { close(); options.onResume(); }}
    >
      <Modal class="pause-modal">
        <Heading>PAUSED</Heading>
        <div class="menu">
          <MenuButton class="primary" onClick={() => { close(); options.onResume(); }}>
            RESUME
          </MenuButton>
          {options.mic ? (
            <MenuButton
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await options.mic!.toggle();
                setMicLabel(options.mic!.isOn() ? "MIC OFF" : "MIC ON");
                setBusy(false);
              }}
            >
              {micLabel}
            </MenuButton>
          ) : null}
          {options.cam ? (
            <MenuButton
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await options.cam!.toggle();
                setCamLabel(options.cam!.isOn() ? "CAM OFF" : "CAM ON");
                setBusy(false);
              }}
            >
              {camLabel}
            </MenuButton>
          ) : null}
          <MenuButton
            onClick={() => {
              close();
              showSettingsOverlay(() => { pauseMenu.value = options; });
            }}
          >
            OPTIONS
          </MenuButton>
          <MenuButton onClick={() => { close(); options.onLeave(); }}>LEAVE</MenuButton>
        </div>
      </Modal>
    </Overlay>
  );
}
