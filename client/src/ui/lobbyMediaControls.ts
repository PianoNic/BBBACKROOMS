import { signal, type Signal } from "@preact/signals";
import { getSettings, onSettingsChange, updateSetting } from "../core/settings";
import { createLobbyVoice, LOCAL_KEY } from "../gameplay/lobbyVoice";
import type { WebcamMesh } from "../gameplay/webcam";

export type LobbyMediaControls = {
  available: boolean;
  micOn: Signal<boolean>;
  camOn: Signal<boolean>;
  micBusy: Signal<boolean>;
  camBusy: Signal<boolean>;
  speaking: Signal<Set<string>>;
  toggleMic(): Promise<void>;
  toggleCam(): Promise<void>;
  isSpeaking(playerId: string, selfId: string): boolean;
  setPeerVolume(playerId: string, sliderValue: number): void;
  getPeerVolume(playerId: string): number;
  dispose(): void;
};

export function createLobbyMediaControls(
  webcam: WebcamMesh | undefined,
): LobbyMediaControls {
  if (!webcam) {
    return {
      available: false,
      micOn: signal(false),
      camOn: signal(false),
      micBusy: signal(false),
      camBusy: signal(false),
      speaking: signal(new Set()),
      toggleMic: async () => undefined,
      toggleCam: async () => undefined,
      isSpeaking: () => false,
      setPeerVolume: () => undefined,
      getPeerVolume: () => 0,
      dispose: () => undefined,
    };
  }

  const mesh = webcam;
  const micOn = signal(getSettings().voiceMode === "open");
  const camOn = signal(mesh.isLocalEnabled());
  const micBusy = signal(false);
  const camBusy = signal(false);
  const speaking = signal<Set<string>>(new Set());

  const voice = createLobbyVoice((peerId, isSpeaking) => {
    const next = new Set(speaking.value);
    if (isSpeaking) next.add(peerId);
    else next.delete(peerId);
    speaking.value = next;
  });

  function syncState(): void {
    micOn.value = getSettings().voiceMode === "open";
    camOn.value = getSettings().cameraMode !== "off" && mesh.isLocalEnabled();
  }

  mesh.onRemoteAudio((id, stream) => voice.setRemote(id, stream));
  mesh.onLocalState(syncState);
  const unsubSettings = onSettingsChange(syncState);
  syncState();

  void (async () => {
    if (getSettings().voiceMode === "off") return;
    if (getSettings().voiceMode === "ptt") {
      updateSetting("voiceMode", "open");
    }
    await mesh.setMicEnabled(true);
    voice.setLocal(mesh.getLocalAudioStream());
  })();

  async function toggleMic(): Promise<void> {
    micBusy.value = true;
    const open = getSettings().voiceMode === "open";
    updateSetting("voiceMode", open ? "off" : "open");
    await mesh.setMicEnabled(!open);
    voice.setLocal(open ? null : mesh.getLocalAudioStream());
    micBusy.value = false;
  }

  async function toggleCam(): Promise<void> {
    camBusy.value = true;
    if (getSettings().cameraMode === "off") {
      updateSetting("cameraMode", "on");
    }
    await mesh.setLocalEnabled(!mesh.isLocalEnabled());
    camBusy.value = false;
  }

  const sliderValues = new Map<string, number>();

  return {
    available: true,
    micOn, camOn, micBusy, camBusy, speaking,
    toggleMic, toggleCam,
    isSpeaking: (playerId, selfId) =>
      playerId === selfId ? speaking.value.has(LOCAL_KEY) : speaking.value.has(playerId),
    setPeerVolume: (playerId, value) => {
      const clamped = Math.max(-200, Math.min(200, value));
      sliderValues.set(playerId, clamped);
      voice.setVolume(playerId, Math.max(0, 1 + clamped / 100));
    },
    getPeerVolume: (playerId) => sliderValues.get(playerId) ?? 0,
    dispose: () => { unsubSettings(); voice.dispose(); },
  };
}
