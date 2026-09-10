import type { Quests } from "../gameplay/quests";
import type { Objective } from "../net/protocol";
import { compassEnabled, compassLabel } from "./hud/state";

const SIZE = 110;

const ITEM_LABEL: Record<string, string> = {
  sponge: "WHITEBOARD",
  eye: "PAINTING",
  notebook: "NOTEBOOK",
  pencil_case: "PENCIL CASE",
  papers: "PAPERS",
  calculator: "CALCULATOR",
  textbook: "TEXTBOOK",
  mug: "MUG",
  key: "KEY",
  phone: "PHONE",
  toilet_paper: "TOILET PAPER",
  gloves: "GLOVES",
  envelope: "ENVELOPE",
};

function targetLabel(o: Objective): string {
  if (o.item === null) return "LAPTOP";
  return ITEM_LABEL[o.item] ?? o.item.toUpperCase();
}

let publishedCtx: CanvasRenderingContext2D | null = null;

export function setCompassCanvas(ctx: CanvasRenderingContext2D | null): void {
  publishedCtx = ctx;
}

/** Just an arrow pointing to the nearest unfinished objective, with a
 *  label below saying WHAT that target is. Hidden until the player picks
 *  up a compass. */
export class TaskCompass {
  private readonly quests: Quests;
  private enabled = false;

  constructor(quests: Quests) {
    this.quests = quests;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    compassEnabled.value = on;
  }

  private nearestObjective(px: number, pz: number): {
    obj: Objective; x: number; z: number; dist: number;
  } | null {
    let best: { obj: Objective; x: number; z: number; dist: number } | null = null;
    for (const obj of this.quests.list()) {
      if (obj.done) continue;
      for (const s of obj.spots) {
        if (s.done) continue;
        const d = Math.hypot(s.x - px, s.z - pz);
        if (!best || d < best.dist) best = { obj, x: s.x, z: s.z, dist: d };
      }
    }
    return best;
  }

  update(playerX: number, playerZ: number, yaw: number): void {
    if (!this.enabled) return;
    const ctx = publishedCtx;
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const target = this.nearestObjective(playerX, playerZ);
    if (!target) {
      if (compassLabel.value !== "ALL DONE") compassLabel.value = "ALL DONE";
      return;
    }

    const dx = target.x - playerX;
    const dz = target.z - playerZ;
    const sin = Math.sin(-yaw);
    const cos = Math.cos(-yaw);
    const tx = dx * cos - dz * sin;
    const tz = dx * sin + dz * cos;
    const angle = Math.atan2(tx, -tz);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const len = SIZE * 0.38;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = "#e8c44a";
    ctx.strokeStyle = "#e8c44a";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    // Shaft.
    ctx.beginPath();
    ctx.moveTo(0, len * 0.45);
    ctx.lineTo(0, -len * 0.5);
    ctx.stroke();
    // Head.
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(-len * 0.35, -len * 0.45);
    ctx.lineTo(len * 0.35, -len * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const label = `${targetLabel(target.obj)} • ${Math.round(target.dist)}m`;
    if (compassLabel.value !== label) compassLabel.value = label;
  }
}
