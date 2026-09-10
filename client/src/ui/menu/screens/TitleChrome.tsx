import { useEffect, useState } from "preact/hooks";
import { BUILD_DATE } from "../../../core/buildInfo";
import { infoOpen } from "../routes";

const API = import.meta.env.VITE_SERVER_URL ?? "";
const GITHUB_URL = "https://github.com/PianoNic/BackroomsBaden";
const DISCORD_URL = "https://discord.gg/EwJ4x2GvvG";

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

export function Sysbar() {
  return (
    <div class="sysbar">
      <span class="sysbar-label">SYS://ROOM_INDEX</span>
      <span class="rec">REC</span>
    </div>
  );
}

export function Footnote() {
  const [version, setVersion] = useState<string>("…");
  useEffect(() => { void fetchVersion().then(setVersion); }, []);
  return <div class="footnote">{`BACKROOMS BADEN · v${version} · ${BUILD_DATE}`}</div>;
}

export function SocialLinks() {
  return (
    <div class="social-links">
      <a
        class="social-link"
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub"
        title="GitHub"
      >
        <i class="fa-brands fa-github" aria-hidden="true" />
        <span class="social-link-label">GitHub</span>
      </a>
      <a
        class="social-link"
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Discord"
        title="Discord"
      >
        <i class="fa-brands fa-discord" aria-hidden="true" />
        <span class="social-link-label">Discord</span>
      </a>
      <button
        type="button"
        class="social-link info-link"
        aria-label="Info"
        title="Info"
        onClick={() => { infoOpen.value = true; }}
      >
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        <span class="social-link-label">Info</span>
      </button>
    </div>
  );
}
