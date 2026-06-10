import type { Grid } from "../net/protocol";

const DISPLAY = 200;
const ZOOM = 8;
const DOT_SIZE = 5;
const FACING_LEN = 10;

export type RemoteDot = { x: number; z: number; color: string };
export type WorldPos = { x: number; z: number };

/** Round, player-centred minimap. */
export class Minimap {
  readonly element: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly base: HTMLCanvasElement;
  private readonly grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;

    this.element = document.createElement("canvas");
    this.element.width = DISPLAY;
    this.element.height = DISPLAY;
    this.element.style.cssText = `
      position: fixed; top: 12px; right: 12px;
      width: ${DISPLAY}px; height: ${DISPLAY}px;
      border-radius: 50%;
      border: 2px solid #444;
      background: black;
      image-rendering: pixelated;
      pointer-events: none;
    `;
    this.ctx = this.element.getContext("2d")!;

    this.base = document.createElement("canvas");
    this.base.width = grid.width * ZOOM;
    this.base.height = grid.height * ZOOM;
    const b = this.base.getContext("2d")!;
    b.fillStyle = "black";
    b.fillRect(0, 0, this.base.width, this.base.height);
    b.fillStyle = "white";
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.cells[y * grid.width + x] === 1) {
          b.fillRect(x * ZOOM, y * ZOOM, ZOOM, ZOOM);
        }
      }
    }
  }

  update(
    worldX: number, worldZ: number, yaw: number,
    remotes: RemoteDot[] = [],
    tracked: {
      items: WorldPos[];
      tasks: WorldPos[];
      teachers: WorldPos[];
      pings?: RemoteDot[];
    } = { items: [], tasks: [], teachers: [] },
  ): void {
    const ctx = this.ctx;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, DISPLAY, DISPLAY);

    const px = (worldX / this.grid.cellSize) * ZOOM;
    const py = (worldZ / this.grid.cellSize) * ZOOM;
    ctx.drawImage(this.base, DISPLAY / 2 - px, DISPLAY / 2 - py);

    // tracked tasks (yellow) — under players so dots stay readable
    this.drawDots(ctx, worldX, worldZ, tracked.tasks, "#ffd54a", 4);
    // tracked items (cyan)
    this.drawDots(ctx, worldX, worldZ, tracked.items, "#5adef0", 4);
    // tracked teachers (red) — biggest so they stand out
    this.drawDots(ctx, worldX, worldZ, tracked.teachers, "#ff3a3a", 6);

    // teammate pings — pulsing ring in the pinger's colour
    const pulse = 4 + 2 * Math.abs(Math.sin(performance.now() / 250));
    for (const p of tracked.pings ?? []) {
      const x = DISPLAY / 2 + ((p.x - worldX) / this.grid.cellSize) * ZOOM;
      const y = DISPLAY / 2 + ((p.z - worldZ) / this.grid.cellSize) * ZOOM;
      const dx = x - DISPLAY / 2;
      const dy = y - DISPLAY / 2;
      if (dx * dx + dy * dy > (DISPLAY / 2) * (DISPLAY / 2)) continue;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // remote players (relative to self)
    for (const r of remotes) {
      const rx = DISPLAY / 2 + ((r.x - worldX) / this.grid.cellSize) * ZOOM;
      const ry = DISPLAY / 2 + ((r.z - worldZ) / this.grid.cellSize) * ZOOM;
      ctx.fillStyle = r.color;
      ctx.fillRect(rx - DOT_SIZE / 2, ry - DOT_SIZE / 2, DOT_SIZE, DOT_SIZE);
    }

    // self
    const cx = DISPLAY / 2;
    const cy = DISPLAY / 2;
    ctx.fillStyle = "red";
    ctx.fillRect(cx - DOT_SIZE / 2, cy - DOT_SIZE / 2, DOT_SIZE, DOT_SIZE);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - Math.sin(yaw) * FACING_LEN, cy - Math.cos(yaw) * FACING_LEN);
    ctx.stroke();
  }

  private drawDots(
    ctx: CanvasRenderingContext2D,
    worldX: number, worldZ: number,
    points: WorldPos[], color: string, size: number,
  ): void {
    ctx.fillStyle = color;
    for (const p of points) {
      const x = DISPLAY / 2 + ((p.x - worldX) / this.grid.cellSize) * ZOOM;
      const y = DISPLAY / 2 + ((p.z - worldZ) / this.grid.cellSize) * ZOOM;
      // Skip dots clearly outside the round viewport.
      const dx = x - DISPLAY / 2;
      const dy = y - DISPLAY / 2;
      if (dx * dx + dy * dy > (DISPLAY / 2) * (DISPLAY / 2)) continue;
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
