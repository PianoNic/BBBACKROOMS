export type AutoDropConfig = {
  frameTimeMs: number;
  windowFrames: number;
  sustainedWindows: number;
  hitchMs: number;
  sceneChangeGraceSeconds: number;
  cooldownSeconds: number;
};

export class AutoDropWatchdog {
  private readonly config: AutoDropConfig;
  private now = 0;
  private graceDeadline = 0;
  private window: number[] = [];
  private streak = 0;
  private lastDropAt: number | null = null;

  constructor(config: AutoDropConfig) {
    this.config = config;
  }

  noteSceneChange(): void {
    this.graceDeadline = this.now + this.config.sceneChangeGraceSeconds;
    this.window = [];
    this.streak = 0;
  }

  sample(dtSeconds: number): boolean {
    this.now += dtSeconds;

    const dtMs = dtSeconds * 1000;
    if (dtMs > this.config.hitchMs) return false;
    if (this.now < this.graceDeadline) return false;

    this.window.push(dtMs);
    if (this.window.length < this.config.windowFrames) return false;

    const median = medianOf(this.window);
    this.window = [];

    if (median > this.config.frameTimeMs) {
      this.streak += 1;
    } else {
      this.streak = 0;
      return false;
    }

    if (this.streak < this.config.sustainedWindows) return false;

    const cooldownElapsed = this.lastDropAt === null
      || this.now - this.lastDropAt >= this.config.cooldownSeconds;
    if (!cooldownElapsed) return false;

    this.lastDropAt = this.now;
    this.streak = 0;
    return true;
  }
}

function medianOf(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}
