/** DOM/CSS-side visuals for teacher abilities — overlays, filters, popups.
 *  Pure side-effects on the page; no Three.js. */
import * as THREE from "three";
import { showBanner } from "../ui/banner";

let overlayEl: HTMLDivElement | null = null;
export function flashOverlay(color: string, ms: number): void {
  if (!overlayEl) {
    overlayEl = document.createElement("div");
    overlayEl.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:90;transition:opacity 0.2s";
    document.body.appendChild(overlayEl);
  }
  overlayEl.style.background = color;
  overlayEl.style.opacity = "1";
  setTimeout(() => { if (overlayEl) overlayEl.style.opacity = "0"; }, ms);
}

let filterTimer: number | null = null;
export function screenFilter(filter: string, ms: number, banner?: string): void {
  const app = document.getElementById("app");
  if (!app) return;
  app.style.filter = filter;
  if (filterTimer !== null) clearTimeout(filterTimer);
  filterTimer = window.setTimeout(() => {
    app.style.filter = ""; filterTimer = null;
  }, ms);
  if (banner) showBanner(banner, ms);
}

export function flipGravity(
  camera: THREE.PerspectiveCamera, ms: number, banner: string,
): void {
  const start = performance.now();
  showBanner(banner, ms);
  const tick = (): void => {
    const t = (performance.now() - start) / ms;
    if (t >= 1) { camera.rotation.z = 0; return; }
    camera.rotation.z = Math.sin(t * Math.PI) * Math.PI;
    requestAnimationFrame(tick);
  };
  tick();
}

const FRENCH_MAP: Record<string, string> = {
  TASKS: "DEVOIRS",
  STAMINA: "ÉNERGIE",
  RESUME: "REPRENDRE",
  OPTIONS: "OPTIONS",
  LEAVE: "QUITTER",
};
export function frenchifyTasks(ms: number, banner: string): void {
  showBanner(banner, ms);
  const board = document.getElementById("taskboard");
  if (!board) return;
  const originals: { node: Text; was: string }[] = [];
  const walker = document.createTreeWalker(board, NodeFilter.SHOW_TEXT);
  let n: Node | null = walker.nextNode();
  while (n) {
    const text = n.nodeValue ?? "";
    const next = walker.nextNode();
    const key = text.trim().toUpperCase();
    if (FRENCH_MAP[key]) {
      originals.push({ node: n as Text, was: text });
      (n as Text).nodeValue = text.replace(new RegExp(key, "i"), FRENCH_MAP[key]);
    }
    n = next;
  }
  setTimeout(() => {
    for (const o of originals) o.node.nodeValue = o.was;
  }, ms);
}

export function corruptTasks(ms: number): void {
  const board = document.getElementById("taskboard");
  if (!board) return;
  board.classList.add("corrupted");
  setTimeout(() => board.classList.remove("corrupted"), ms);
}

export function fakePing(): void {
  const minimap = document.getElementById("minimap");
  if (!minimap) return;
  const ping = document.createElement("div");
  ping.style.cssText = `
    position: absolute; left: ${20 + Math.random() * 60}%;
    top: ${20 + Math.random() * 60}%;
    width: 10px; height: 10px; border-radius: 50%;
    background: #ff4040; box-shadow: 0 0 8px 2px rgba(255,64,64,0.9);
    pointer-events: none;
    animation: fakeping-pulse 1.2s ease-in-out infinite;
  `;
  minimap.appendChild(ping);
  setTimeout(() => ping.remove(), 8000);
}

export function flickerWorldLights(): void {
  const app = document.getElementById("app");
  if (!app) return;
  let count = 0;
  const id = window.setInterval(() => {
    app.style.filter = count % 2 === 0 ? "brightness(0.2)" : "brightness(1)";
    count++;
    if (count > 14) {
      window.clearInterval(id);
      app.style.filter = "";
    }
  }, 110);
}

let mathOpen = false;
export function showMathPopup(teacherName: string): void {
  if (mathOpen) return;
  mathOpen = true;
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  const answer = a * b;
  document.exitPointerLock?.();
  const root = document.createElement("div");
  root.style.cssText = `
    position: fixed; inset: 0; z-index: 95;
    background: rgba(0,0,0,0.88); color: #ffd86b;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'VT323', monospace; font-size: 36px; letter-spacing: 0.06em;
    text-shadow: 0 0 18px rgba(255,216,107,0.4);
  `;
  const title = document.createElement("div");
  title.textContent = `${teacherName}: SCHRIFTLICHE PRÜFUNG`;
  title.style.cssText =
    "font-size:22px;letter-spacing:0.22em;margin-bottom:24px;color:#cfae45";
  const q = document.createElement("div");
  q.textContent = `${a} × ${b} = ?`;
  q.style.fontSize = "56px";
  const input = document.createElement("input");
  input.style.cssText = `
    margin-top: 24px; background: transparent; border: 1px solid #cfae45;
    color: #ffd86b; font-family: inherit; font-size: 36px; text-align: center;
    width: 200px; letter-spacing: 0.1em; outline: none; padding: 6px;
  `;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim() === String(answer)) {
      mathOpen = false;
      root.remove();
    }
  });
  root.append(title, q, input);
  document.body.appendChild(root);
  input.focus();
  setTimeout(() => { if (mathOpen) { mathOpen = false; root.remove(); } }, 8000);
}
