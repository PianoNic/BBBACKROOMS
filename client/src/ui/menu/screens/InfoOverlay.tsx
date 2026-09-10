import { Button } from "../components/controls";
import { Heading } from "../components/layout";
import { Modal, Overlay } from "../components/Overlay";
import { infoOpen } from "../routes";

export function InfoOverlay() {
  const close = () => { infoOpen.value = false; };
  return (
    <Overlay id="info-overlay" onClose={close}>
      <Modal class="info-panel">
        <Heading>INFO</Heading>
        <p class="info-project">Backrooms Baden</p>
        <p class="info-disclaimer">
          Privates Hobbyprojekt ohne Verbindung zu einer realen Schule. Alle Lehrpersonen und
          Namen sind frei erfunden.
        </p>
        <a class="info-legal-link" href="/datenschutz.html" target="_blank" rel="noopener noreferrer">
          Datenschutz
        </a>
        <Button onClick={close}>SCHLIESSEN</Button>
      </Modal>
    </Overlay>
  );
}
