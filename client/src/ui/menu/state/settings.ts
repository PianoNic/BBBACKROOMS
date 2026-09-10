import { signal } from "@preact/signals";
import {
  getSettings, onSettingsChange, resetSettings, updateSetting,
} from "../../../core/settings";
import type { Settings } from "../../../core/settings";

export const settings = signal<Settings>(getSettings());

onSettingsChange((s) => { settings.value = { ...s }; });

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  updateSetting(key, value);
  settings.value = { ...getSettings() };
}

export function resetAll(): void {
  resetSettings();
  settings.value = { ...getSettings() };
}
