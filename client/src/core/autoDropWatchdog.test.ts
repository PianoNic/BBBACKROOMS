import { describe, it, expect } from "vitest";
import { AutoDropWatchdog, type AutoDropConfig } from "./autoDropWatchdog";

const CONFIG: AutoDropConfig = {
  frameTimeMs: 33,
  windowFrames: 60,
  sustainedWindows: 2,
  hitchMs: 250,
  sceneChangeGraceSeconds: 3,
  cooldownSeconds: 30,
};

describe("AutoDropWatchdog", () => {
  it("drops after steady 40ms frames sustain over two windows, once within 30s", () => {
    const watchdog = new AutoDropWatchdog(CONFIG);
    let drops = 0;
    let dropAtFrame = -1;
    const totalFrames = CONFIG.windowFrames * CONFIG.sustainedWindows + 200;
    for (let i = 0; i < totalFrames; i++) {
      if (watchdog.sample(0.04)) {
        drops++;
        if (dropAtFrame < 0) dropAtFrame = i;
      }
    }
    expect(drops).toBe(1);
    const expectedFrame = CONFIG.windowFrames * CONFIG.sustainedWindows - 1;
    expect(dropAtFrame).toBe(expectedFrame);
  });

  it("never drops on steady 12ms frames with a single 300ms spike", () => {
    const watchdog = new AutoDropWatchdog(CONFIG);
    let drops = 0;
    for (let i = 0; i < 600; i++) {
      const dt = i === 300 ? 0.3 : 0.012;
      if (watchdog.sample(dt)) drops++;
    }
    expect(drops).toBe(0);
  });

  it("does not drop during the scene-change grace period", () => {
    const watchdog = new AutoDropWatchdog(CONFIG);
    watchdog.noteSceneChange();
    let drops = 0;
    const dt = 0.04;
    const safeGraceFrames = Math.floor(CONFIG.sceneChangeGraceSeconds / dt) - 5;
    for (let i = 0; i < safeGraceFrames; i++) {
      if (watchdog.sample(dt)) drops++;
    }
    expect(drops).toBe(0);

    for (let i = 0; i < CONFIG.windowFrames * CONFIG.sustainedWindows + 200; i++) {
      if (watchdog.sample(dt)) drops++;
    }
    expect(drops).toBe(1);
  });

  it("drops at most once within cooldownSeconds, then drops again after cooldown", () => {
    const watchdog = new AutoDropWatchdog(CONFIG);
    const dt = 0.04;
    let drops = 0;
    const framesUntilFirstDrop = CONFIG.windowFrames * CONFIG.sustainedWindows;
    for (let i = 0; i < framesUntilFirstDrop; i++) {
      if (watchdog.sample(dt)) drops++;
    }
    expect(drops).toBe(1);

    const roundSeconds = CONFIG.windowFrames * dt;
    const roundsForCooldown = Math.ceil(CONFIG.cooldownSeconds / roundSeconds);
    const framesForCooldown = CONFIG.windowFrames * roundsForCooldown;

    for (let i = 0; i < framesForCooldown - CONFIG.windowFrames; i++) {
      if (watchdog.sample(dt)) drops++;
    }
    expect(drops).toBe(1);

    for (let i = 0; i < CONFIG.windowFrames; i++) {
      if (watchdog.sample(dt)) drops++;
    }
    expect(drops).toBe(2);
  });
});
