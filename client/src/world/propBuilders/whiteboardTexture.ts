/** Canvas-based scribble texture for "dirty" whiteboards.
 *
 *  Only whiteboards selected by the wipe-quest (variant >= 1) carry
 *  scribbles; the rest use the plain material. Lines + doodles are
 *  generated deterministically from the prop's world coords so the
 *  same room looks the same every reload. */
import * as THREE from "three";
import { mulberry32 } from "./_common";

const SCRIBBLE_LINES = [
  "f(x) = ax² + bx + c", "∫ x dx = x²/2 + C", "v = s / t",
  "U = R · I", "a² + b² = c²", "Goethe: Faust I",
  "HA: S. 47–52", "Probe am Freitag!", "sin² + cos² = 1",
  "TODO: Vortrag", "E = m·c²", "Prüfung: Kap. 3–5",
  "Σ k = n(n+1)/2", "lim x→0 sin(x)/x = 1", "if (x) { return y; }",
  "ax² + bx + c = 0", "F = m · a", "p · V = n · R · T",
  "HA bis Mi.!", "Klausur 2 Wo.", "Vokabeln S. 12",
];
const SCRIBBLE_COLORS = ["#1a1a1a", "#1a3a8c", "#8c1a1a", "#1a6020"];
const HAND_FONT = "'Caveat', 'Patrick Hand', 'Comic Sans MS', cursive";


function drawScribble(c: HTMLCanvasElement, seed: number): void {
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#eae6d2";
  ctx.fillRect(0, 0, c.width, c.height);
  const rand = mulberry32(Math.floor(seed));
  const lines = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < lines; i++) {
    const text = SCRIBBLE_LINES[Math.floor(rand() * SCRIBBLE_LINES.length)];
    const color = SCRIBBLE_COLORS[Math.floor(rand() * SCRIBBLE_COLORS.length)];
    ctx.fillStyle = color;
    ctx.font = `${58 + Math.floor(rand() * 18)}px ${HAND_FONT}`;
    const x = 30 + rand() * 60;
    const y = 90 + i * (75 + rand() * 18);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rand() - 0.5) * 0.06);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 3;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    const x0 = 50 + rand() * 800;
    const y0 = 80 + rand() * 380;
    ctx.moveTo(x0, y0);
    for (let s = 0; s < 18; s++) {
      ctx.lineTo(x0 + s * 6 + rand() * 4, y0 + Math.sin(s * 0.5) * 14 + rand() * 4);
    }
    ctx.stroke();
  }
}


export function makeWhiteboardTexture(seed: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  drawScribble(c, seed);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // Webfonts may not be ready on first paint — redraw once they load.
  if ("fonts" in document) {
    document.fonts.load(`48px Caveat`).then(() => {
      drawScribble(c, seed);
      tex.needsUpdate = true;
    });
  }
  return tex;
}
