import { AMBIENCE } from "../rendering/ambience";
import { getSettings, updateSetting, onSettingsChange } from "./settings";
import { showToast } from "../ui/toast";
import { AutoDropWatchdog } from "./autoDropWatchdog";

const WARMUP_SECONDS = 5;

export class AutoQuality {
  private elapsed = 0;
  private readonly watchdog = new AutoDropWatchdog(AMBIENCE.autoDrop);
  private lastTier = getSettings().graphicsTier;
  private lastPixelation = getSettings().pixelation;
  private readonly unsubscribe: () => void;

  constructor() {
    this.unsubscribe = onSettingsChange((s) => {
      if (s.graphicsTier !== this.lastTier || s.pixelation !== this.lastPixelation) {
        this.lastTier = s.graphicsTier;
        this.lastPixelation = s.pixelation;
        this.watchdog.noteSceneChange();
      }
    });
  }

  sample(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed < WARMUP_SECONDS) return;

    const settings = getSettings();
    if (settings.fpsCap > 0) return;
    if (settings.graphicsTier === "niedrig") return;

    if (this.watchdog.sample(dt)) {
      const previousTier = getSettings().graphicsTier;
      requestAnimationFrame(() => {
        updateSetting("graphicsTier", "niedrig");
        showToast("Grafik auf Niedrig gesetzt (Leistung)", {
          label: "Rückgängig (Z)",
          key: "KeyZ",
          run: () => {
            updateSetting("graphicsTier", previousTier);
            this.watchdog.noteSceneChange();
          },
        });
      });
    }
  }

  dispose(): void {
    this.unsubscribe();
  }
}
