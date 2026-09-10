import { navigate } from "../routes";
import { prefersReducedMotion } from "../../screenTransition";
import { DURATION } from "../transition/keyframes";
import { LOBBY_RESUME_KEY } from "./storageKeys";

export type TitleResult = { lobbyId: string; password?: string };

let resolver: ((result: TitleResult) => void) | null = null;

export function awaitLobbyPick(): Promise<TitleResult> {
  return new Promise<TitleResult>((resolve) => { resolver = resolve; });
}

export function pickLobby(lobbyId: string, password?: string): void {
  sessionStorage.setItem(LOBBY_RESUME_KEY, JSON.stringify({ lobbyId, password }));
  const done = resolver;
  resolver = null;
  navigate(null, "forward");
  const delay = prefersReducedMotion() ? 0 : DURATION;
  setTimeout(() => done?.({ lobbyId, password }), delay);
}

export function readResume(): TitleResult | null {
  const raw = sessionStorage.getItem(LOBBY_RESUME_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TitleResult;
    if (parsed.lobbyId) return parsed;
  } catch {
    /* corrupted */
  }
  sessionStorage.removeItem(LOBBY_RESUME_KEY);
  return null;
}
