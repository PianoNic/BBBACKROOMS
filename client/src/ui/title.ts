import { preloadFootsteps } from "../core/audio";
import { music } from "../core/music";
import { playIntro } from "./introSplash";
import { mountMenuApp } from "./menu/mount";
import { navigate } from "./menu/routes";
import { awaitLobbyPick, readResume } from "./menu/state/titleFlow";
import type { TitleResult } from "./menu/state/titleFlow";

export { getStoredName, getStoredAvatar, getStoredColor } from "./menu/state/profile";
export type { TitleResult };

export async function showTitleScreen(): Promise<TitleResult> {
  const resume = readResume();
  if (resume) return resume;

  mountMenuApp();
  preloadFootsteps();
  navigate("title", "back");
  void playIntro().then(() => music.setState("title"));

  return awaitLobbyPick();
}
