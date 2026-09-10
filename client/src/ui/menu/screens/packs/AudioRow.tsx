import type { SoundDefinition } from "../../../../core/soundRegistry";
import type { RosterEntry } from "../../../../net/protocol";
import { Button } from "../../components/controls";
import { basenameOf } from "./audioProcessing";

export type AudioRowUi = { fileName: string | null; sizeLabel: string; error: string | null };

export function AudioRow(props: {
  def: SoundDefinition;
  ui: AudioRowUi;
  disabled: boolean;
  playingDefault: boolean;
  playingReplacement: boolean;
  onPlayDefault: () => void;
  onPlayReplacement: () => void;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const { def, ui } = props;
  const hasDefault = def.defaults.length > 0;

  return (
    <div class="pack-audio-row" id={`pack-audio-row-${def.id}`}>
      <div class="pack-audio-row-info">
        <div class="pack-audio-row-label">{def.label}</div>
        <div class="pack-audio-row-default-name">
          {hasDefault ? basenameOf(def.defaults[0]) : "kein Standard-Sound"}
        </div>
      </div>
      <div class="pack-audio-row-controls">
        <Button
          small
          id={`pack-audio-default-${def.id}`}
          disabled={!hasDefault}
          onClick={props.onPlayDefault}
        >
          {props.playingDefault ? "■ STANDARD" : "▶ STANDARD"}
        </Button>
        <label class="bb-btn small pack-audio-row-picker">
          Datei wählen
          <input
            type="file"
            id={`pack-audio-file-${def.id}`}
            class="pack-audio-row-input"
            accept="audio/*"
            hidden
            disabled={props.disabled}
            onChange={(e) => {
              const input = e.target as HTMLInputElement;
              const file = input.files?.[0];
              input.value = "";
              if (file) props.onFile(file);
            }}
          />
        </label>
        {ui.fileName ? (
          <Button small id={`pack-audio-preview-${def.id}`} onClick={props.onPlayReplacement}>
            {props.playingReplacement ? "■ ERSATZ" : "▶ ERSATZ"}
          </Button>
        ) : null}
        {ui.fileName ? (
          <span class="pack-audio-row-size">{ui.sizeLabel}</span>
        ) : null}
        {ui.fileName ? (
          <Button small class="pack-audio-row-remove" onClick={props.onRemove}>
            Entfernen
          </Button>
        ) : null}
      </div>
      {ui.fileName ? <div class="pack-audio-row-filename">{ui.fileName}</div> : null}
      {ui.error ? <div class="pack-audio-row-error error">{ui.error}</div> : null}
    </div>
  );
}

export function TeacherTauntRow(props: {
  entry: RosterEntry;
  index: number;
  ui: AudioRowUi;
  disabled: boolean;
  playingReplacement: boolean;
  onPlayReplacement: () => void;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const { entry, index, ui } = props;

  return (
    <div class="pack-audio-row" id={`pack-audio-teacher-row-${index}`}>
      <div class="pack-audio-row-info">
        <div class="pack-audio-row-label">{entry.name}</div>
        <div class="pack-audio-row-default-name">{entry.subject}</div>
      </div>
      <div class="pack-audio-row-controls">
        <label class="bb-btn small pack-audio-row-picker">
          Datei wählen
          <input
            type="file"
            id={`pack-audio-teacher-file-${index}`}
            class="pack-audio-row-input"
            accept="audio/*"
            hidden
            disabled={props.disabled}
            onChange={(e) => {
              const input = e.target as HTMLInputElement;
              const file = input.files?.[0];
              input.value = "";
              if (file) props.onFile(file);
            }}
          />
        </label>
        {ui.fileName ? (
          <Button small id={`pack-audio-teacher-preview-${index}`} onClick={props.onPlayReplacement}>
            {props.playingReplacement ? "■ ERSATZ" : "▶ ERSATZ"}
          </Button>
        ) : null}
        {ui.fileName ? (
          <span class="pack-audio-row-size">{ui.sizeLabel}</span>
        ) : null}
        {ui.fileName ? (
          <Button small class="pack-audio-row-remove" onClick={props.onRemove}>
            Entfernen
          </Button>
        ) : null}
      </div>
      {ui.fileName ? <div class="pack-audio-row-filename">{ui.fileName}</div> : null}
      {ui.error ? <div class="pack-audio-row-error error">{ui.error}</div> : null}
    </div>
  );
}
