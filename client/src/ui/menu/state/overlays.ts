import { signal } from "@preact/signals";

export type CamControl = { isOn: () => boolean; toggle: () => Promise<void> };
export type MicControl = { isOn: () => boolean; toggle: () => Promise<void> };

export type PauseMenuOptions = {
  onResume: () => void;
  onLeave: () => void;
  cam?: CamControl;
  mic?: MicControl;
};

export const pauseMenu = signal<PauseMenuOptions | null>(null);
export const settingsOverlay = signal<(() => void) | null>(null);

export type Endgame = "won" | "lost";

export type EndgameState = {
  kind: Endgame;
  scoreboard: import("../../../net/protocol").ScoreboardData | null;
  selfId: string | null;
  net: import("../../../net/client").NetClient | null;
};

export const endgame = signal<EndgameState | null>(null);
