import { AMBIENCE } from "../rendering/ambience";
import { getSettings, updateSetting } from "./settings";
import { showBanner } from "../ui/banner";

const WARMUP_SECONDS = 5;
const IGNORE_DT_SECONDS = 0.5;
const SMOOTHING_WINDOW = 12;

export class AutoQuality {
  private elapsed = 0;
  private fired = false;
  private window: number[] = [];
  private overMs = 0;

  sample(dt: number): void {
    if (this.fired) return;
    this.elapsed += dt;
    if (this.elapsed < WARMUP_SECONDS) return;
    if (dt > IGNORE_DT_SECONDS) return;
    const settings = getSettings();
    if (settings.fpsCap > 0) return;
    if (settings.graphicsTier === "niedrig") return;

    this.window.push(dt * 1000);
    if (this.window.length > SMOOTHING_WINDOW) this.window.shift();
    const avgMs = this.window.reduce((a, b) => a + b, 0) / this.window.length;

    if (avgMs > AMBIENCE.autoDrop.frameTimeMs) {
      this.overMs += dt * 1000;
    } else {
      this.overMs = 0;
    }

    if (this.overMs >= AMBIENCE.autoDrop.holdSeconds * 1000) {
      this.fired = true;
      requestAnimationFrame(() => {
        updateSetting("graphicsTier", "niedrig");
        showBanner("Performance low — graphics dropped to Niedrig.", 5000);
      });
    }
  }
}
