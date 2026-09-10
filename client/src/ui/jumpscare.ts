import { playSfx, playJumpscareStinger, duckMusicForJumpscare } from "../core/audio";
import { getSettings } from "../core/settings";
import { imagePreloader } from "../core/imagePreload";
import { pickJumpscareVariant, totalDurationMs, type JumpscareVariant } from "./jumpscareTiming";

const SCREAM_URL = "/sounds/jumpscare/scream.wav";

const REDUCED_BLACK_MS = 120;
const REDUCED_ENTRY_MS = 260;
const REDUCED_HOLD_MS = 1400;
const REDUCED_FADE_MS = 260;

export function preloadJumpscareImages(urls: string[]): void {
  imagePreloader.warm(urls);
}

let styleInjected = false;

function ensureStyle(): void {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
    #jumpscare {
      position: fixed; inset: 0; z-index: 100; pointer-events: none;
      background: #000; overflow: hidden;
    }
    #jumpscare .frame {
      position: absolute; inset: 0;
    }
    #jumpscare .face {
      position: absolute; inset: 0; width: 100%; height: 100%;
      object-fit: cover; object-position: 50% 38%;
      transform-origin: center center;
      opacity: 0;
      filter: contrast(1.35) saturate(0.8) brightness(1.18);
      transform: scale(var(--entry-scale, 1.3));
    }
    #jumpscare .face.chroma {
      mix-blend-mode: screen;
      opacity: 0;
      transform: translate(2px, 0) scale(var(--entry-scale, 1.3));
      filter: contrast(1.4) saturate(3) hue-rotate(150deg) brightness(0.85);
    }
    #jumpscare .vignette {
      position: absolute; inset: 0;
      background: radial-gradient(circle at 50% 45%,
        rgba(120,0,0,0) 35%, rgba(150,0,0,0.55) 75%, rgba(0,0,0,0.92) 100%);
      opacity: 0;
    }
    #jumpscare .label {
      position: absolute; left: 50%; bottom: 6vh;
      transform: translateX(-50%);
      color: #ffdcdc; font-family: 'VT323', monospace;
      font-size: clamp(28px, 4vh, 48px); letter-spacing: 0.08em;
      text-align: center;
      text-shadow: 0 0 12px rgba(255,0,0,0.75), 0 2px 8px rgba(0,0,0,0.95);
      padding: 2px 26px 6px;
      background: radial-gradient(ellipse at center, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 78%);
      opacity: 0;
      transition: opacity 200ms ease-out;
    }
    #jumpscare .label .sub {
      display: block; font-size: 0.55em; color: #ffb0b0;
      letter-spacing: 0.22em; margin-top: 4px;
    }
    #jumpscare.stage-entry .label,
    #jumpscare.stage-shake .label,
    #jumpscare.stage-hold .label {
      opacity: 1;
    }
    #jumpscare.stage-fade .label {
      opacity: 0;
      transition: opacity var(--fade-ms, 300ms) ease-out;
    }

    #jumpscare.stage-entry .face {
      animation: jumpscare-slam-in var(--entry-ms, 120ms) cubic-bezier(.16,1,.3,1) forwards;
    }
    #jumpscare.stage-entry.creep .face {
      animation: jumpscare-creep-in var(--entry-ms, 420ms) linear forwards;
    }
    #jumpscare.stage-entry.creep .face.chroma {
      animation: jumpscare-creep-in-chroma var(--entry-ms, 420ms) linear forwards;
    }
    #jumpscare.stage-entry .vignette,
    #jumpscare.stage-shake .vignette,
    #jumpscare.stage-hold .vignette,
    #jumpscare.stage-fade .vignette {
      opacity: 1;
    }
    #jumpscare.stage-shake .face,
    #jumpscare.stage-hold .face,
    #jumpscare.stage-fade .face {
      opacity: 1;
      transform: scale(1);
    }
    #jumpscare.stage-shake .face.chroma,
    #jumpscare.stage-hold .face.chroma,
    #jumpscare.stage-fade .face.chroma {
      opacity: 0.55;
      transform: translate(2px, 0) scale(1);
    }
    @keyframes jumpscare-slam-in {
      0%   { opacity: 0; transform: scale(var(--entry-scale, 1.3)); }
      55%  { opacity: 1; }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes jumpscare-creep-in {
      0%   { opacity: 0; transform: scale(var(--entry-scale, 1.6)); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes jumpscare-creep-in-chroma {
      0%   { opacity: 0; transform: translate(2px, 0) scale(var(--entry-scale, 1.6)); }
      100% { opacity: 0.55; transform: translate(2px, 0) scale(1); }
    }

    #jumpscare.stage-shake .frame {
      animation: jumpscare-shake var(--shake-ms, 400ms) cubic-bezier(.36,.07,.19,.97) forwards;
    }
    @keyframes jumpscare-shake {
      0%   { transform: translate(3%, -3%); }
      12%  { transform: translate(-3%, 2.4%); }
      24%  { transform: translate(2.4%, -2%); }
      36%  { transform: translate(-1.8%, 1.6%); }
      48%  { transform: translate(1.4%, -1.2%); }
      62%  { transform: translate(-0.9%, 0.8%); }
      76%  { transform: translate(0.5%, -0.5%); }
      90%  { transform: translate(-0.2%, 0.2%); }
      100% { transform: translate(0, 0); }
    }

    #jumpscare.stage-hold .frame {
      animation: jumpscare-drift var(--hold-ms, 1500ms) ease-in-out forwards;
    }
    @keyframes jumpscare-drift {
      0%   { transform: scale(1); }
      100% { transform: scale(1.06); }
    }
    #jumpscare.stage-hold .vignette {
      animation: jumpscare-pulse 1.4s ease-in-out infinite;
    }
    @keyframes jumpscare-pulse {
      0%, 100% { opacity: 0.75; }
      50%      { opacity: 1; }
    }

    #jumpscare.stage-cut .face,
    #jumpscare.stage-cut .vignette,
    #jumpscare.stage-cut .label {
      opacity: 0 !important;
      animation: none !important;
      transition: none !important;
    }

    #jumpscare.stage-fade {
      animation: jumpscare-fade-out var(--fade-ms, 300ms) ease-out forwards;
    }
    @keyframes jumpscare-fade-out {
      from { opacity: 1; }
      to   { opacity: 0; }
    }

    #jumpscare.reduced .face {
      animation: none !important;
      transform: scale(1);
      transition: opacity var(--entry-ms, 260ms) ease-in-out;
    }
    #jumpscare.reduced .face.chroma {
      display: none;
    }
    #jumpscare.reduced .frame {
      animation: none !important;
    }
    #jumpscare.reduced .vignette {
      animation: none !important;
      transition: opacity var(--entry-ms, 260ms) ease-in-out;
    }
    #jumpscare.reduced.stage-entry .face,
    #jumpscare.reduced.stage-hold .face,
    #jumpscare.reduced.stage-fade .face {
      opacity: 1;
    }
    #jumpscare.reduced.stage-entry .vignette,
    #jumpscare.reduced.stage-hold .vignette,
    #jumpscare.reduced.stage-fade .vignette {
      opacity: 0.6;
    }
    #jumpscare.reduced.stage-fade {
      animation: jumpscare-fade-out var(--fade-ms, 260ms) ease-out forwards;
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

function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const STAGE_CLASSES = ["stage-black", "stage-entry", "stage-shake", "stage-hold", "stage-fade"];

class JumpscareSequence {
  private readonly root: HTMLDivElement;
  private readonly timers: ReturnType<typeof setTimeout>[] = [];

  constructor(imageUrl: string, name?: string, subject?: string) {
    this.root = document.createElement("div");
    this.root.id = "jumpscare";

    const frame = document.createElement("div");
    frame.className = "frame";
    const face = document.createElement("img");
    face.className = "face";
    face.src = imageUrl;
    const chroma = document.createElement("img");
    chroma.className = "face chroma";
    chroma.src = imageUrl;
    frame.appendChild(face);
    frame.appendChild(chroma);

    const vignette = document.createElement("div");
    vignette.className = "vignette";

    this.root.appendChild(frame);
    this.root.appendChild(vignette);

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
      this.root.appendChild(label);
    }
  }

  run(): void {
    document.body.appendChild(this.root);
    document.body.classList.add("jumpscare-shake");
    const volume = getSettings().jumpscareVolume;
    playSfx(SCREAM_URL, volume);
    playJumpscareStinger(volume);
    duckMusicForJumpscare();

    if (prefersReducedMotion()) {
      this.root.classList.add("reduced");
      this.runReduced();
      return;
    }
    this.runVariant(pickJumpscareVariant());
  }

  private setStage(stage: string): void {
    for (const c of STAGE_CLASSES) this.root.classList.remove(c);
    this.root.classList.add(stage);
  }

  private after(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private runVariant(variant: JumpscareVariant): void {
    const style = this.root.style;
    style.setProperty("--entry-ms", `${variant.entryMs}ms`);
    style.setProperty("--entry-scale", `${variant.entryScale}`);
    style.setProperty("--shake-ms", `${variant.shakeMs}ms`);
    const shakeEndMs = variant.blackMs + variant.entryMs + variant.shakeMs;
    const holdMs = Math.max(variant.holdEndMs - shakeEndMs, 0);
    style.setProperty("--hold-ms", `${holdMs}ms`);
    style.setProperty("--fade-ms", `${variant.fadeMs}ms`);
    if (variant.entry === "creep") this.root.classList.add("creep");

    this.setStage("stage-black");
    this.after(variant.blackMs, () => this.setStage("stage-entry"));
    this.after(variant.blackMs + variant.entryMs, () => this.setStage("stage-shake"));
    this.after(shakeEndMs, () => this.setStage("stage-hold"));
    for (const at of variant.flickerAtMs) {
      this.after(at, () => this.root.classList.add("stage-cut"));
      this.after(at + variant.flickerMs, () => this.root.classList.remove("stage-cut"));
    }
    this.after(variant.holdEndMs, () => this.setStage("stage-fade"));
    this.after(totalDurationMs(variant), () => this.finish());
  }

  private runReduced(): void {
    const style = this.root.style;
    style.setProperty("--entry-ms", `${REDUCED_ENTRY_MS}ms`);
    style.setProperty("--entry-scale", "1");
    style.setProperty("--fade-ms", `${REDUCED_FADE_MS}ms`);

    const entryStartMs = REDUCED_BLACK_MS;
    const holdStartMs = entryStartMs + REDUCED_ENTRY_MS;
    const fadeStartMs = holdStartMs + REDUCED_HOLD_MS;

    this.setStage("stage-black");
    this.after(entryStartMs, () => this.setStage("stage-entry"));
    this.after(holdStartMs, () => this.setStage("stage-hold"));
    this.after(fadeStartMs, () => this.setStage("stage-fade"));
    this.after(fadeStartMs + REDUCED_FADE_MS, () => this.finish());
  }

  private finish(): void {
    if (activeSequence === this) activeSequence = null;
    this.root.remove();
    document.body.classList.remove("jumpscare-shake");
  }

  cancel(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers.length = 0;
    if (activeSequence === this) activeSequence = null;
    this.root.remove();
    document.body.classList.remove("jumpscare-shake");
  }
}

let activeSequence: JumpscareSequence | null = null;

export function jumpscare(imageUrl: string, name?: string, subject?: string): void {
  ensureStyle();
  activeSequence?.cancel();
  const sequence = new JumpscareSequence(imageUrl, name, subject);
  activeSequence = sequence;
  sequence.run();
}
