import type { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { ColorCurves } from "@babylonjs/core/Materials/colorCurves";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";

import { AMBIENCE } from "./ambience";
import { color3 } from "./babylon";

export const HARDWARE_SCALING = 4;

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function expLerp(current: number, target: number, rate: number, dt: number): number {
  const a = 1 - Math.exp(-rate * dt);
  return current + (target - current) * a;
}

export class Ambience {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly canvas: HTMLCanvasElement;
  private readonly imageProcessing: ImageProcessingConfiguration;
  private readonly colorCurves: ColorCurves;

  private fogDensity = AMBIENCE.fog.density;
  private vignetteWeight = AMBIENCE.vignette.weight;
  private saturation = AMBIENCE.tone.saturation;
  private readonly baseExposure = AMBIENCE.tone.exposure;
  private readonly baseContrast = AMBIENCE.tone.contrast;

  private hidden = false;
  private heartPhase = 0;
  private caughtState: "idle" | "flash" | "black" = "idle";
  private caughtTimer = 0;
  private catchAnticipationArmed = false;

  constructor(engine: Engine, scene: Scene, canvas: HTMLCanvasElement) {
    this.engine = engine;
    this.scene = scene;
    this.canvas = canvas;

    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogColor = color3(AMBIENCE.fog.color);
    scene.fogDensity = this.fogDensity;

    const imageProcessing = scene.imageProcessingConfiguration;
    imageProcessing.isEnabled = true;
    imageProcessing.toneMappingEnabled = true;
    imageProcessing.exposure = AMBIENCE.tone.exposure;
    imageProcessing.contrast = AMBIENCE.tone.contrast;
    imageProcessing.vignetteEnabled = true;
    imageProcessing.vignetteWeight = AMBIENCE.vignette.weight;
    imageProcessing.vignetteStretch = AMBIENCE.vignette.stretch;
    imageProcessing.vignetteColor = new Color4(
      ((AMBIENCE.vignette.color >> 16) & 0xff) / 255,
      ((AMBIENCE.vignette.color >> 8) & 0xff) / 255,
      (AMBIENCE.vignette.color & 0xff) / 255,
      1,
    );
    imageProcessing.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;

    const colorCurves = new ColorCurves();
    colorCurves.globalSaturation = AMBIENCE.tone.saturation;
    colorCurves.shadowsHue = AMBIENCE.tone.shadowsHue;
    colorCurves.shadowsDensity = AMBIENCE.tone.shadowsDensity;
    colorCurves.midtonesHue = AMBIENCE.tone.midtonesHue;
    colorCurves.midtonesDensity = AMBIENCE.tone.midtonesDensity;
    colorCurves.highlightsHue = AMBIENCE.tone.highlightsHue;
    colorCurves.highlightsDensity = AMBIENCE.tone.highlightsDensity;
    imageProcessing.colorCurves = colorCurves;
    imageProcessing.colorCurvesEnabled = true;
    this.colorCurves = colorCurves;
    this.imageProcessing = imageProcessing;

    this.applySize();
    window.addEventListener("resize", this.applySize);
  }

  private applySize = (): void => {
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.canvas.style.imageRendering = "pixelated";
    this.engine.setHardwareScalingLevel(HARDWARE_SCALING);
    this.engine.resize(true);
  };

  update(dt: number, elapsed: number, threatDistance: number): void {
    const fog = AMBIENCE.fog;
    const vignette = AMBIENCE.vignette;
    const cues = AMBIENCE.cues;

    const breath = Math.sin(elapsed * 2 * Math.PI * fog.breathHz);
    let fogTarget = fog.density + breath * fog.breathAmount;
    let vignetteTarget = vignette.weight
      + Math.sin(elapsed * 2 * Math.PI * vignette.breathHz) * vignette.breathAmount;

    const t = clamp01((AMBIENCE.chase.radius - threatDistance) / AMBIENCE.chase.radius);
    if (t > 0) {
      fogTarget = fogTarget + (fog.chaseDensity - fogTarget) * t;
      vignetteTarget = vignetteTarget + (vignette.chaseWeight - vignetteTarget) * t;
    }

    let saturationTarget = AMBIENCE.tone.saturation;
    let lerpRate = fog.lerp;
    if (this.hidden) {
      vignetteTarget = cues.hiddenVignette;
      saturationTarget = cues.hiddenSaturation;
      lerpRate = cues.hiddenLerp;
    }

    this.fogDensity = expLerp(this.fogDensity, fogTarget, fog.lerp, dt);
    this.vignetteWeight = this.catchAnticipationArmed
      ? AMBIENCE.vignette.weight
      : expLerp(this.vignetteWeight, vignetteTarget, lerpRate, dt);
    this.saturation = expLerp(this.saturation, saturationTarget, lerpRate, dt);

    this.scene.fogDensity = this.fogDensity;
    this.imageProcessing.vignetteWeight = this.vignetteWeight;
    this.colorCurves.globalSaturation = this.saturation;

    const heartHz = cues.heartPulseHzFar + (cues.heartPulseHzNear - cues.heartPulseHzFar) * t;
    this.heartPhase += dt * 2 * Math.PI * heartHz;
    const heartPulse = t > 0 ? Math.sin(this.heartPhase) * cues.heartPulseAmount * t : 0;

    this.imageProcessing.exposure = this.applyCaught(dt, this.baseExposure + heartPulse);
  }

  private applyCaught(dt: number, baseExposure: number): number {
    if (this.caughtState === "idle") {
      this.imageProcessing.contrast = this.baseContrast;
      return baseExposure;
    }
    this.caughtTimer += dt * 1000;
    const cues = AMBIENCE.cues;
    if (this.caughtState === "flash") {
      this.imageProcessing.contrast = this.baseContrast * 1.6;
      if (this.caughtTimer >= cues.caughtFlashMs) {
        this.caughtState = "black";
        this.caughtTimer = 0;
      }
      return baseExposure + 2.5;
    }
    this.imageProcessing.contrast = this.baseContrast;
    if (this.caughtTimer >= cues.caughtBlackMs) {
      this.caughtState = "idle";
      this.caughtTimer = 0;
      return baseExposure;
    }
    return 0;
  }

  setHidden(on: boolean): void {
    this.hidden = on;
  }

  armCatchAnticipation(): void {
    this.catchAnticipationArmed = true;
  }

  releaseCatchAnticipation(): void {
    this.catchAnticipationArmed = false;
  }

  flashAndCut(): void {
    this.releaseCatchAnticipation();
    this.caughtState = "flash";
    this.caughtTimer = 0;
  }

  dispose(): void {
    window.removeEventListener("resize", this.applySize);
  }
}
