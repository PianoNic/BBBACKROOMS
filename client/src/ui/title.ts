/** Title-screen orchestrator. Composes main menu, options, and server browser. */
import { el } from "./dom";
import { buildSettingsList } from "./settingsPanel";
import { buildServerScreen } from "./serverBrowser";
import { buildTutorialScreen } from "./tutorialScreen";
import { buildShopScreen } from "./shopScreen";
import { getMe, getProviders, loginUrl, logout } from "../net/auth";

export { getStoredName, getStoredAvatar, getStoredColor } from "./profilePanel";

const API = import.meta.env.VITE_SERVER_URL ?? "";

/** Read the ?login=ok|error the OAuth callback appended, then scrub it from the
 *  URL so a refresh doesn't re-show it. Returns the status once. */
function consumeLoginStatus(): "ok" | "error" | null {
  const params = new URLSearchParams(location.search);
  const status = params.get("login");
  if (status !== "ok" && status !== "error") return null;
  params.delete("login");
  const qs = params.toString();
  history.replaceState(null, "", location.pathname + (qs ? `?${qs}` : "") + location.hash);
  return status;
}

const loginStatus = consumeLoginStatus();

/** Fill the given wrapper with login buttons (logged out) or an account chip
 *  with sign-out (logged in). Rendered async; empty if no provider configured.
 *  Lives in the sysbar (top-right) so it persists across title screens. */
function fillAccountWidget(wrap: HTMLElement): void {
  wrap.replaceChildren();
  void (async () => {
    const [account, providers] = await Promise.all([getMe(), getProviders()]);
    wrap.replaceChildren();

    if (account) {
      const chip = el<HTMLDivElement>("div", "account-chip");
      chip.appendChild(el("span", "acc-name", account.displayName || "Signed in"));
      chip.appendChild(el("span", "acc-stats", `Lv ${account.level} · ${account.coins}₵`));
      const out = el<HTMLButtonElement>("button", "acc-signout", "Sign out");
      out.onclick = async () => { await logout(); fillAccountWidget(wrap); };
      chip.appendChild(out);
      wrap.appendChild(chip);
      return;
    }

    if (loginStatus === "error") {
      wrap.appendChild(el("span", "acc-note error", "Sign-in failed"));
    }
    if (!providers.google && !providers.microsoft) return;
    const mk = (provider: "google" | "microsoft", label: string) => {
      const b = el<HTMLButtonElement>("button", `acc-login ${provider}`, label);
      b.onclick = () => { location.href = loginUrl(provider); };
      return b;
    };
    if (providers.google) wrap.appendChild(mk("google", "Sign in with Google"));
    if (providers.microsoft) wrap.appendChild(mk("microsoft", "Sign in with Microsoft"));
  })();
}

function buildHeader(root: HTMLElement): void {
  const sysbar = el<HTMLDivElement>("div", "sysbar");
  sysbar.appendChild(el("span", "sysbar-label", "SYS://ROOM_INDEX"));
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
  onShop: () => void,
  onOptions: () => void,
  onTutorial: () => void,
): void {
  const menu = el<HTMLDivElement>("div", "menu");
  const playBtn = el<HTMLButtonElement>("button", "menu-btn primary", "PLAY");
  playBtn.onclick = onPlay;
  const shopBtn = el<HTMLButtonElement>("button", "menu-btn", "SHOP");
  shopBtn.onclick = onShop;
  const optBtn = el<HTMLButtonElement>("button", "menu-btn", "OPTIONS");
  optBtn.onclick = onOptions;
  const tutBtn = el<HTMLButtonElement>("button", "menu-btn", "TUTORIAL");
  tutBtn.onclick = onTutorial;
  menu.append(playBtn, shopBtn, optBtn, tutBtn);
  const account = el<HTMLDivElement>("div", "account-widget");
  fillAccountWidget(account);
  menu.appendChild(account);
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
    const showMain = () => render((r) => buildMainMenu(r, showServers, showShop, showOptions, showTutorial));
    const showServers = () => render((r) => buildServerScreen(r, pick, showMain));
    const showShop = () => render((r) => buildShopScreen(r, showMain));
    const showOptions = () => render((r) => buildOptionsScreen(r, showMain));
    const showTutorial = () => render((r) => buildTutorialScreen(r, showMain));
    showMain();
  });
}
