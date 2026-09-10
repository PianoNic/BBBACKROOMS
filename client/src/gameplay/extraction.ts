import type { Mesh, StandardMaterial, TransformNode } from "../rendering/babylon";
import {
  basicMaterial, box, group, lambertMaterial, plane,
} from "../rendering/babylon";

const GRATE_COLOR = 0x2a2a30;
const FRAME_COLOR = 0x4a4a55;
const GLOW_COLOR = 0x6ed8ff;

export class ExtractionPortal {
  readonly group = group("extractionPortal");
  private readonly glow: Mesh;
  private readonly visuals: TransformNode[] = [];
  private active = false;

  constructor(x: number, z: number, radius: number) {
    // Visual size is fixed-ish and decoupled from the trigger radius; the gameplay
    // proximity check still uses `radius`, but the vent shouldn't span the whole atrium.
    const size = Math.min(Math.max(radius * 0.55, 1.6), 2.2);
    const half = size / 2;

    // Recessed dark pit so the vent reads as an opening, not just a texture.
    const pit = box(size, 0.6, size, lambertMaterial(0x05050a));
    pit.position.y = -0.3;
    this.group.add(pit);
    this.visuals.push(pit);

    // Glow at the bottom of the pit.
    const glowMat = basicMaterial(GLOW_COLOR);
    glowMat.alpha = 0.55;
    this.glow = plane(size * 0.92, size * 0.92, glowMat);
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.005;
    this.group.add(this.glow);
    this.visuals.push(this.glow);

    // Outer metal frame around the vent (4 thin bars forming a border).
    const frameMat = lambertMaterial(FRAME_COLOR);
    const frameThickness = 0.12;
    const frameHeight = 0.06;
    const mkFrame = (w: number, d: number, ox: number, oz: number): void => {
      const m = box(w, frameHeight, d, frameMat);
      m.position.set(ox, frameHeight / 2 + 0.001, oz);
      this.group.add(m);
      this.visuals.push(m);
    };
    mkFrame(size, frameThickness, 0, -half + frameThickness / 2);
    mkFrame(size, frameThickness, 0,  half - frameThickness / 2);
    mkFrame(frameThickness, size, -half + frameThickness / 2, 0);
    mkFrame(frameThickness, size,  half - frameThickness / 2, 0);

    // Grate bars across the opening (parallel slats with gaps).
    const barMat = lambertMaterial(GRATE_COLOR);
    const barCount = Math.max(5, Math.floor(size / 0.35));
    const slotPitch = (size - frameThickness * 2) / barCount;
    const barWidth = slotPitch * 0.55;
    const barLen = size - frameThickness * 2;
    for (let i = 0; i < barCount; i++) {
      const bar = box(barWidth, 0.05, barLen, barMat);
      const x0 = -half + frameThickness + slotPitch * (i + 0.5);
      bar.position.set(x0, 0.025, 0);
      this.group.add(bar);
      this.visuals.push(bar);
    }

    this.group.position.set(x, 0, z);
    // Group stays in the scene; only the visible meshes are hidden initially.
    for (const v of this.visuals) {
      v.visible = false;
      (v as Mesh).alwaysSelectAsActiveMesh = true;
    }
  }

  show(): void {
    this.active = true;
    for (const v of this.visuals) v.visible = true;
  }

  hide(): void {
    this.active = false;
    for (const v of this.visuals) v.visible = false;
  }

  update(elapsed: number): void {
    if (!this.active) return;
    const t = (Math.sin(elapsed * 2.0) + 1) * 0.5;
    (this.glow.material as StandardMaterial).alpha = 0.4 + t * 0.35;
  }
}
