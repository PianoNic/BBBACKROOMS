import * as THREE from "three";

const W = 256;
const H = 128;
const COLORS = ["#1d3fa8", "#9a1d1d", "#1d6a2a", "#5a2d8a", "#a0691d"];
const DOODLES = ["3x+2=?", "y=mx+b", "H₂O", "Σ∞", "404", "BBB", "Σx/n", "f(x)", "π·r²", "<3"];

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
export function buildWhiteboardDoodle(): THREE.Mesh {
  const tex = new THREE.CanvasTexture(drawDoodles());
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const geom = new THREE.PlaneGeometry(2.2, 1.0);
  const mesh = new THREE.Mesh(geom, mat);
  return mesh;
}
