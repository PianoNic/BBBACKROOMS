import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { activeScene, plane } from "../rendering/babylon";

const W = 256;
const H = 128;
const COLORS = ["#1d3fa8", "#9a1d1d", "#1d6a2a", "#5a2d8a", "#a0691d"];
const DOODLES = ["3x+2=?", "y=mx+b", "H₂O", "Σ∞", "404", "42", "Σx/n", "f(x)", "π·r²", "<3"];

function drawDoodles(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = "round";
  ctx.lineWidth = 3;

  // random scribbles
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = COLORS[Math.floor(Math.random() * COLORS.length)];
    ctx.beginPath();
    let x = Math.random() * W;
    let y = Math.random() * H;
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // a couple of doodle texts
  ctx.font = "bold 28px monospace";
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = COLORS[Math.floor(Math.random() * COLORS.length)];
    const text = DOODLES[Math.floor(Math.random() * DOODLES.length)];
    ctx.fillText(text, Math.random() * (W - 80), 30 + Math.random() * (H - 50));
  }
  return c;
}

/** A flat doodle plane the size of a whiteboard face, sittting just in front of it. */
export function buildWhiteboardDoodle(): Mesh {
  const c = drawDoodles();
  const tex = new DynamicTexture(
    "whiteboardDoodle", { width: c.width, height: c.height },
    activeScene(), true, Texture.NEAREST_SAMPLINGMODE,
  );
  tex.getContext().drawImage(c, 0, 0);
  tex.update(false);
  const mat = new StandardMaterial("whiteboardDoodle", activeScene());
  mat.diffuseTexture = tex;
  tex.hasAlpha = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.emissiveTexture = tex;
  mat.emissiveColor = Color3.White();
  mat.diffuseColor = Color3.Black();
  mat.disableLighting = true;
  const mesh = plane(2.2, 1.0, mat);
  return mesh;
}
