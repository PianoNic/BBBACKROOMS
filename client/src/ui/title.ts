/** Title-screen orchestrator. Composes main menu, options, and server browser. */
import { el } from "./dom";
import { buildSettingsList } from "./settingsPanel";
import { buildServerScreen } from "./serverBrowser";
import { buildTutorialScreen } from "./tutorialScreen";

export { getStoredName, getStoredAvatar, getStoredColor } from "./profilePanel";

const API = import.meta.env.VITE_SERVER_URL ?? "";

function buildHeader(root: HTMLElement): void {
  const sysbar = el<HTMLDivElement>("div", "sysbar");
  sysbar.appendChild(el("span", undefined, "SYS://ROOM_INDEX"));
  sysbar.appendChild(el("span", "rec", "REC"));
  root.appendChild(sysbar);
  root.appendChild(el("h1", undefined, "BBBACKROOMS"));
}

let cachedVersion: string | null = null;
async function fetchVersion(): Promise<string> {
  if (cachedVersion !== null) return cachedVersion;
  try {
    const res = await fetch(`${API}/version`);
    const data = (await res.json()) as { version: string };
    cachedVersion = data.version;
  } catch {
    cachedVersion = "offline";
  }
  return cachedVersion;
}

const GITHUB_URL = "https://github.com/PianoNic/BBBACKROOMS";
const DISCORD_URL = "https://discord.gg/EwJ4x2GvvG";

function buildFootnote(): void {
  if (document.querySelector("#title .footnote")) return;
  const root = document.getElementById("title");
  if (!root) return;
  const note = el<HTMLDivElement>("div", "footnote");
  const today = new Date().toISOString().slice(0, 10);
  note.textContent = `BBBKRMS · v… · ${today}`;
  root.appendChild(note);
  fetchVersion().then((v) => {
    note.textContent = `BBBKRMS · v${v} · ${today}`;
  });
}

function buildSocialLinks(): void {
  if (document.querySelector("#title .social-links")) return;
  const root = document.getElementById("title");
  if (!root) return;
  const wrap = el<HTMLDivElement>("div", "social-links");
  const mk = (href: string, label: string, faIcon: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "social-link";
    a.setAttribute("aria-label", label);
    a.title = label;
    const i = document.createElement("i");
    i.className = `fa-brands ${faIcon}`;
    i.setAttribute("aria-hidden", "true");
    a.appendChild(i);
    a.appendChild(el("span", "social-link-label", label));
    return a;
  };
  wrap.appendChild(mk(GITHUB_URL, "GitHub", "fa-github"));
  wrap.appendChild(mk(DISCORD_URL, "Discord", "fa-discord"));
  root.appendChild(wrap);
}

function buildMainMenu(
  root: HTMLElement,
  onPlay: () => void,
  onOptions: () => void,
  onTutorial: () => void,
): void {
  const menu = el<HTMLDivElement>("div", "menu");
  const playBtn = el<HTMLButtonElement>("button", "menu-btn primary", "PLAY");
  playBtn.onclick = onPlay;
  const optBtn = el<HTMLButtonElement>("button", "menu-btn", "OPTIONS");
  optBtn.onclick = onOptions;
  const tutBtn = el<HTMLButtonElement>("button", "menu-btn", "TUTORIAL");
  tutBtn.onclick = onTutorial;
  menu.append(playBtn, optBtn, tutBtn);
  root.appendChild(menu);
}

function buildOptionsScreen(root: HTMLElement, onBack: () => void): void {
  const panel = el<HTMLDivElement>("div", "panel panel-brackets options-panel");
  panel.appendChild(el("h2", undefined, "OPTIONS"));
  const list = buildSettingsList();
  panel.appendChild(list.element);
  const back = el<HTMLButtonElement>("button", "menu-btn back", "← BACK");
  back.onclick = () => { list.dispose(); onBack(); };
  panel.appendChild(back);
  root.appendChild(panel);
}

export type TitleResult = { lobbyId: string; password?: string };

export async function showTitleScreen(): Promise<TitleResult> {
  // Back-to-lobby path: previous game ended and the server flipped the
  // lobby back to "waiting". Skip the title menu and rejoin automatically.
  const resume = sessionStorage.getItem("bbb_lobby_resume");
  if (resume) {
    try {
      const { lobbyId, password } = JSON.parse(resume) as TitleResult;
      if (lobbyId) return { lobbyId, password };
    } catch { /* corrupted — fall through */ }
    sessionStorage.removeItem("bbb_lobby_resume");
  }

  const root = el<HTMLDivElement>("div");
  root.id = "title";
  document.body.appendChild(root);

  const render = (build: (root: HTMLElement) => void) => {
    root.replaceChildren();
    buildHeader(root);
    build(root);
    buildFootnote();
    buildSocialLinks();
  };

  return new Promise<TitleResult>((resolve) => {
    const pick = (id: string, password?: string) => {
      sessionStorage.setItem(
        "bbb_lobby_resume", JSON.stringify({ lobbyId: id, password }),
      );
      root.remove();
      resolve({ lobbyId: id, password });
    };
    const showMain = () => render((r) => buildMainMenu(r, showServers, showOptions, showTutorial));
    const showServers = () => render((r) => buildServerScreen(r, pick, showMain));
    const showOptions = () => render((r) => buildOptionsScreen(r, showMain));
    const showTutorial = () => render((r) => buildTutorialScreen(r, showMain));
    showMain();
  });
}
