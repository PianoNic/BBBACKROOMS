import { useRef } from "preact/hooks";
import type { RosterEntry } from "../../../../net/protocol";
import { Button, TextInput } from "../../components/controls";

export type SlotUi = { ready: boolean; sizeLabel: string; error: string | null; nameOverride: string };

export function SlotCard(props: {
  entry: RosterEntry;
  index: number;
  ui: SlotUi;
  disabled: boolean;
  onFile: (index: number, file: File) => void;
  onRemove: (index: number) => void;
  onNameInput: (index: number, value: string) => void;
  registerCanvas: (index: number, canvas: HTMLCanvasElement | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { entry, index, ui } = props;

  return (
    <div class="pack-slot" id={`pack-slot-${index}`} data-ready={ui.ready ? "true" : "false"}>
      <div class="pack-slot-preview">
        <img class="pack-slot-default" src={`/teachers/${entry.image}`} alt={entry.name} hidden={ui.ready} />
        <canvas
          class="pack-slot-canvas"
          id={`pack-slot-preview-${index}`}
          hidden={!ui.ready}
          ref={(node) => props.registerCanvas(index, node)}
        />
      </div>
      <div class="pack-slot-name">{entry.name}</div>
      <div class="pack-slot-subject">{entry.subject}</div>
      <div class="pack-slot-actions">
        <Button small disabled={props.disabled} onClick={() => fileRef.current?.click()}>
          Bild wählen
        </Button>
        {ui.ready ? (
          <Button small class="pack-slot-remove" onClick={() => props.onRemove(index)}>
            Entfernen
          </Button>
        ) : null}
      </div>
      <input
        type="file"
        class="slot-file"
        id={`pack-slot-file-${index}`}
        accept="image/*"
        hidden
        disabled={props.disabled}
        ref={fileRef}
        onChange={(e) => {
          const input = e.target as HTMLInputElement;
          const file = input.files?.[0];
          input.value = "";
          if (file) props.onFile(index, file);
        }}
      />
      <TextInput
        id={`pack-slot-name-${index}`}
        class="pack-slot-name-input"
        placeholder="Name überschreiben"
        value={ui.nameOverride}
        onInput={(e) => props.onNameInput(index, (e.target as HTMLInputElement).value)}
      />
      <div class="pack-slot-size">{ui.sizeLabel}</div>
      {ui.error ? <div class="pack-slot-error error">{ui.error}</div> : null}
    </div>
  );
}
