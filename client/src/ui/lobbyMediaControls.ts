/** Mic + cam buttons and the LobbyVoice activity monitor.
 *
 *  Owns the lobby's voice lifecycle: auto-enables the mic on mount,
 *  wires remote audio into the speaking-detector, and exposes the
 *  current speaking set + a change callback so the player list can
 *  re-render a speaker icon next to whoever is talking. */
import { getSettings, onSettingsChange, updateSetting } from "../core/settings";
import { createLobbyVoice, LOCAL_KEY } from "../gameplay/lobbyVoice";
import type { WebcamMesh } from "../gameplay/webcam";
import { el } from "./dom";

export type LobbyMediaControls = {
  micBtn: HTMLButtonElement;
  camBtn: HTMLButtonElement;
  isSpeaking(playerId: string, selfId: string): boolean;
  /** Set a peer's playback volume. Slider value is -200..+200, mapped to
   *  a linear gain of (1 + v/100), floored at 0. */
  setPeerVolume(playerId: string, sliderValue: number): void;
  /** Last slider value set for a peer (-200..+200). 0 = normal. */
  getPeerVolume(playerId: string): number;
  onChange(cb: () => void): void;
  dispose(): void;
};

export function createLobbyMediaControls(
  webcam: WebcamMesh | undefined,
): LobbyMediaControls {
  const micBtn = el<HTMLButtonElement>("button", "menu-btn", "MIC ON");
  const camBtn = el<HTMLButtonElement>("button", "menu-btn", "CAM ON");
  if (!webcam) {
    micBtn.style.display = "none";
    camBtn.style.display = "none";
    return {
      micBtn, camBtn,
      isSpeaking: () => false,
      setPeerVolume: () => undefined,
      getPeerVolume: () => 0,
      onChange: () => undefined,
      dispose: () => undefined,
    };
  }

  const speakingIds = new Set<string>();
  let onChangeCb: (() => void) | null = null;
  const notify = (): void => onChangeCb?.();

  const voice = createLobbyVoice((peerId, speaking) => {
    if (speaking) speakingIds.add(peerId);
    else speakingIds.delete(peerId);
    notify();
  });

  function syncLabels(): void {
    micBtn.textContent =
      getSettings().voiceMode === "open" ? "MIC OFF" : "MIC ON";
    if (getSettings().cameraMode === "off") {
      camBtn.textContent = "CAM OFF";
    } else {
      camBtn.textContent = webcam!.isLocalEnabled() ? "CAM OFF" : "CAM ON";
    }
  }

  webcam.onRemoteAudio((id, stream) => voice.setRemote(id, stream));
  webcam.onLocalState(() => { syncLabels(); notify(); });
  const unsubSettings = onSettingsChange(syncLabels);
  syncLabels();

  // Auto-enable mic in the lobby so voice is live right away (unless the
  // user explicitly set it to off).
  void (async () => {
    if (getSettings().voiceMode === "off") return;
    if (getSettings().voiceMode === "ptt") {
      // PTT doesn't fire pre-game (no pointer lock); flip to always-on.
      updateSetting("voiceMode", "open");
    }
    await webcam.setMicEnabled(true);
    voice.setLocal(webcam.getLocalAudioStream());
  })();

  micBtn.onclick = async () => {
    micBtn.disabled = true;
    const open = getSettings().voiceMode === "open";
    updateSetting("voiceMode", open ? "off" : "open");
    await webcam.setMicEnabled(!open);
    voice.setLocal(open ? null : webcam.getLocalAudioStream());
    micBtn.disabled = false;
  };
  camBtn.onclick = async () => {
    camBtn.disabled = true;
    if (getSettings().cameraMode === "off") {
      updateSetting("cameraMode", "on");
    }
    await webcam.setLocalEnabled(!webcam.isLocalEnabled());
    camBtn.disabled = false;
  };

  /** Per-peer slider values, scale -200..+200. Defaults to 0 (normal). */
  const sliderValues = new Map<string, number>();

  return {
    micBtn, camBtn,
    isSpeaking: (playerId, selfId) =>
      playerId === selfId ? speakingIds.has(LOCAL_KEY) : speakingIds.has(playerId),
    setPeerVolume: (playerId, value) => {
      const clamped = Math.max(-200, Math.min(200, value));
      sliderValues.set(playerId, clamped);
      // Linear: -100% → 0 gain, 0% → 1.0, +200% → 3.0. Below -100 stays
      // muted (negative gain doesn't make sense).
      voice.setVolume(playerId, Math.max(0, 1 + clamped / 100));
    },
    getPeerVolume: (playerId) => sliderValues.get(playerId) ?? 0,
    onChange: (cb) => { onChangeCb = cb; },
    dispose: () => { unsubSettings(); voice.dispose(); },
  };
}
