import type { ComponentChildren } from "preact";
import type { Settings } from "../../../../core/settings";
import { Accordion } from "../../components/Accordion";
import { Button } from "../../components/controls";
import { resetAll, setSetting, settings } from "../../state/settings";
import { CamPreviewRow, CameraDeviceRow, MicDeviceRow, MicMeterRow } from "./DeviceRows";
import { SelectRow, SliderRow, ToggleRow } from "./rows";
import { TexturePackSection } from "./TexturePackSection";

export type SectionId = "display" | "input" | "audio" | "voice" | "devices" | "texturepacks";

export const SECTION_TITLES: Record<SectionId, string> = {
  display: "DISPLAY",
  input: "INPUT",
  audio: "AUDIO",
  voice: "VOICE",
  devices: "DEVICES",
  texturepacks: "TEXTURE PACKS",
};

export const SECTION_ORDER: SectionId[] = ["display", "input", "audio", "voice", "devices", "texturepacks"];

const FPS_CAP_OPTIONS: { label: string; value: number }[] = [
  { label: "30", value: 30 },
  { label: "60", value: 60 },
  { label: "120", value: 120 },
  { label: "144", value: 144 },
  { label: "OFF", value: 0 },
];

const VOICE_MODE_OPTIONS: { label: string; value: Settings["voiceMode"] }[] = [
  { label: "Off", value: "off" },
  { label: "Push-to-talk (V)", value: "ptt" },
  { label: "Always on", value: "open" },
];

const CAMERA_MODE_OPTIONS: { label: string; value: Settings["cameraMode"] }[] = [
  { label: "Off", value: "off" },
  { label: "On", value: "on" },
];

function Section(props: { id: SectionId; mode: "nav" | "accordion"; first?: boolean; children: ComponentChildren }) {
  const title = SECTION_TITLES[props.id];
  if (props.mode === "accordion") {
    return (
      <div id={`options-section-${props.id}`} class="options-section">
        <Accordion title={title} collapsible defaultOpen={!!props.first}>
          {props.children}
        </Accordion>
      </div>
    );
  }
  return (
    <section id={`options-section-${props.id}`} class="options-section">
      <div class="bb-subheading">{title}</div>
      {props.children}
    </section>
  );
}

export function SettingsBody(props: { mode: "nav" | "accordion" }) {
  const s = settings.value;
  return (
    <div class="options-body">
      <Section id="display" mode={props.mode} first>
        <SliderRow
          label="Field of view" value={s.fov} min={60} max={110} step={1}
          format={(v) => `${v}°`} onChange={(v) => setSetting("fov", v)}
        />
        <SelectRow
          label="FPS cap" value={s.fpsCap} options={FPS_CAP_OPTIONS}
          onChange={(v) => setSetting("fpsCap", v)}
        />
        <ToggleRow label="VSync" note="browser default" value={s.vsync} onChange={(v) => setSetting("vsync", v)} />
        <ToggleRow label="Show FPS" value={s.showFps} onChange={(v) => setSetting("showFps", v)} />
      </Section>

      <Section id="input" mode={props.mode}>
        <SliderRow
          label="Mouse sensitivity" value={s.mouseSensitivity} min={0.2} max={3.0} step={0.05}
          format={(v) => `${v.toFixed(2)}x`} onChange={(v) => setSetting("mouseSensitivity", v)}
        />
        <SliderRow
          label="Arrow-key turn speed" value={s.arrowTurnRate} min={0.5} max={6.0} step={0.1}
          format={(v) => `${Math.round(v * (180 / Math.PI))}°/s`}
          onChange={(v) => setSetting("arrowTurnRate", v)}
        />
      </Section>

      <Section id="audio" mode={props.mode}>
        <SliderRow
          label="Music" value={s.musicVolume} min={0} max={1} step={0.01}
          format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setSetting("musicVolume", v)}
        />
        <SliderRow
          label="Sound" value={s.sfxVolume} min={0} max={1} step={0.01}
          format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setSetting("sfxVolume", v)}
        />
        <SliderRow
          label="Jumpscare" value={s.jumpscareVolume} min={0} max={1} step={0.01}
          format={(v) => (v === 0 ? "MUTED" : `${Math.round(v * 100)}%`)}
          onChange={(v) => setSetting("jumpscareVolume", v)}
        />
      </Section>

      <Section id="voice" mode={props.mode}>
        <SelectRow
          label="Voice activation" value={s.voiceMode} options={VOICE_MODE_OPTIONS}
          onChange={(v) => setSetting("voiceMode", v)}
        />
        <ToggleRow
          label="Noise gate" note="silences quiet background" value={s.noiseGate}
          onChange={(v) => setSetting("noiseGate", v)}
        />
        <SliderRow
          label="Gate threshold" value={s.noiseGateThresholdDb} min={-70} max={-20} step={1}
          format={(v) => `${v} dB`} onChange={(v) => setSetting("noiseGateThresholdDb", v)}
        />
        <SliderRow
          label="PS1 voice filter" value={s.ps1VoiceAmount} min={0} max={1} step={0.01}
          format={(v) => (v === 0 ? "OFF" : `${Math.round(v * 100)}%`)}
          onChange={(v) => setSetting("ps1VoiceAmount", v)}
        />
      </Section>

      <Section id="devices" mode={props.mode}>
        <SelectRow
          label="Camera" value={s.cameraMode} options={CAMERA_MODE_OPTIONS}
          onChange={(v) => setSetting("cameraMode", v)}
        />
        <CameraDeviceRow />
        <CamPreviewRow />
        <MicDeviceRow />
        <MicMeterRow />
      </Section>

      <Section id="texturepacks" mode={props.mode}>
        <TexturePackSection />
      </Section>

      <Button class="options-reset" onClick={resetAll}>RESET TO DEFAULTS</Button>
    </div>
  );
}
