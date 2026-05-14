/** Full-screen jumpscare: scaled+shaking face, red vignette, harsh screech. */
import { playSfx } from "../core/audio";
import { getSettings } from "../core/settings";

const DURATION_MS = 2400;
const SCREAM_URL = "/sounds/jumpscare/scream.wav";

const preloaded = new Map<string, HTMLImageElement>();

/** Preload the face images so the overlay doesn't stutter on first show. */
export function preloadJumpscareImages(urls: string[]): void {
  for (const url of urls) {
    if (preloaded.has(url)) continue;
    const img = new Image();
    img.src = url;
    preloaded.set(url, img);
  }
}

let styleInjected = false;

function ensureStyle(): void {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
    #jumpscare {
      position: fixed; inset: 0; z-index: 100; pointer-events: none;
      background: radial-gradient(circle at center, rgba(70,0,0,0.85) 0%, rgba(0,0,0,1) 75%);
      animation: jumpscare-flash 2.4s ease-out forwards;
    }
    #jumpscare .face {
      position: absolute; left: 50%; top: 50%;
      width: 95vmin; height: 95vmin;
      transform: translate(-50%, -50%) scale(0.6);
      object-fit: cover;
      filter: contrast(1.6) saturate(1.4) brightness(0.95) hue-rotate(-10deg);
      animation: jumpscare-zoom 2.4s cubic-bezier(.2,1.4,.4,1) forwards,
                 jumpscare-shake 0.18s linear infinite;
      box-shadow: 0 0 120px 40px rgba(255,0,0,0.6);
    }
    #jumpscare .label {
      position: absolute; left: 50%; bottom: 6vh;
      transform: translateX(-50%);
      color: #ffdcdc; font-family: 'VT323', monospace;
      font-size: clamp(28px, 4vh, 48px); letter-spacing: 0.08em;
      text-align: center; text-shadow: 0 0 12px rgba(255,0,0,0.7);
      animation: jumpscare-label 2.4s ease-out forwards;
    }
    #jumpscare .label .sub {
      display: block; font-size: 0.55em; color: #ffb0b0;
      letter-spacing: 0.22em; margin-top: 4px;
    }
    @keyframes jumpscare-label {
      0%, 8%   { opacity: 0; }
      14%, 80% { opacity: 1; }
      100%     { opacity: 0; }
    }
    @keyframes jumpscare-zoom {
      0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
      4%   { transform: translate(-50%, -50%) scale(1.45); opacity: 1; }
      40%  { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
      85%  { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1.0);  opacity: 0; }
    }
    @keyframes jumpscare-flash {
      0%   { background-color: rgba(255,255,255,1); }
      5%   { background-color: rgba(140,0,0,0.95); }
      85%  { background-color: rgba(40,0,0,0.85); opacity: 1; }
      100% { background-color: rgba(0,0,0,0); opacity: 0; }
    }
    @keyframes jumpscare-shake {
      0%   { margin-left: 0; margin-top: 0; }
      25%  { margin-left: -8px; margin-top: 4px; }
      50%  { margin-left: 6px; margin-top: -5px; }
      75%  { margin-left: -4px; margin-top: 7px; }
      100% { margin-left: 0; margin-top: 0; }
    }
    body.jumpscare-shake #app { animation: world-shake 0.7s ease-out; }
    @keyframes world-shake {
      0%, 100% { transform: translate(0,0); }
      10% { transform: translate(-10px, 6px); }
      20% { transform: translate(8px, -8px); }
      30% { transform: translate(-6px, 10px); }
      40% { transform: translate(8px, 4px); }
      50% { transform: translate(-12px, -4px); }
      60% { transform: translate(10px, 8px); }
      70% { transform: translate(-4px, -10px); }
      80% { transform: translate(6px, 6px); }
      90% { transform: translate(-3px, -3px); }
    }
  `;
  const s = document.createElement("style");
  s.textContent = css;
  document.head.appendChild(s);
}

export function jumpscare(imageUrl: string, name?: string, subject?: string): void {
  ensureStyle();
  const root = document.createElement("div");
  root.id = "jumpscare";
  const img = document.createElement("img");
  img.className = "face";
  img.src = imageUrl;
  root.appendChild(img);
  if (name) {
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = name;
    if (subject) {
      const sub = document.createElement("span");
      sub.className = "sub";
      sub.textContent = subject.toUpperCase();
      label.appendChild(sub);
    }
    root.appendChild(label);
  }
  document.body.appendChild(root);
  document.body.classList.add("jumpscare-shake");
  playSfx(SCREAM_URL, getSettings().jumpscareVolume);
  setTimeout(() => {
    root.remove();
    document.body.classList.remove("jumpscare-shake");
  }, DURATION_MS);
}
