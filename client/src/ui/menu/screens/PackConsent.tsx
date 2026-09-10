import { useState } from "preact/hooks";
import { Button, Checkbox } from "../components/controls";
import { Heading } from "../components/layout";
import { Modal, Overlay } from "../components/Overlay";

let consentAccepted = false;

export function isConsentAccepted(): boolean {
  return consentAccepted;
}

export function PackConsent(props: { onAccept: () => void; onCancel: () => void }) {
  const [checked, setChecked] = useState(false);

  return (
    <Overlay id="pack-consent" onClose={props.onCancel} closeOnBackdrop={false}>
      <Modal class="pack-consent-modal">
        <Heading>HINWEIS</Heading>
        <p class="pack-consent-text">
          Nur eigene Bilder oder Bilder mit Einwilligung der abgebildeten Person. Packs mit
          Bildern oder Namen realer Personen ohne deren Einwilligung sind nicht erlaubt.
        </p>
        <Checkbox id="pack-consent-check" checked={checked} onToggle={setChecked}>
          Ich versichere, dass ich die Bildrechte habe.
        </Checkbox>
        <div class="pack-consent-actions">
          <Button onClick={props.onCancel}>Abbrechen</Button>
          <Button
            id="pack-consent-accept"
            variant="primary"
            disabled={!checked}
            onClick={() => {
              if (!checked) return;
              consentAccepted = true;
              props.onAccept();
            }}
          >
            Verstanden
          </Button>
        </div>
      </Modal>
    </Overlay>
  );
}
