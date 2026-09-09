import type { Engine } from "@babylonjs/core/Engines/engine";
import type { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Scene } from "@babylonjs/core/scene";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { ColorCurves } from "@babylonjs/core/Materials/colorCurves";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";

import { AMBIENCE, tierFeatures, type GraphicsTier } from "./ambience";
import { getSettings, onSettingsChange } from "../core/settings";
import { color3 } from "./babylon";

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
  private readonly camera: FreeCamera;
  private readonly canvas: HTMLCanvasElement;
  private renderPipeline: DefaultRenderingPipeline;
  private tier: GraphicsTier;
  private unsubscribe: (() => void)[] = [];

  private fogDensity = AMBIENCE.fog.density;
  private vignetteWeight = AMBIENCE.vignette.weight;
  private aberrationAmount = AMBIENCE.aberration.idle;
  private currentPixelation: number;

  constructor(engine: Engine, scene: Scene, camera: FreeCamera, canvas: HTMLCanvasElement) {
    this.engine = engine;
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.tier = getSettings().graphicsTier;
    this.currentPixelation = getSettings().pixelation;

    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogColor = color3(AMBIENCE.fog.color);
    scene.fogDensity = this.fogDensity;

    this.renderPipeline = this.buildPipeline(this.tier);

    this.applySize();
    window.addEventListener("resize", this.applySize);

    this.unsubscribe.push(onSettingsChange((s) => {
      if (s.pixelation !== this.currentPixelation) {
        this.currentPixelation = s.pixelation;
        this.applySize();
      }
      if (s.graphicsTier !== this.tier) this.setTier(s.graphicsTier);
    }));
  }

  private buildPipeline(tier: GraphicsTier): DefaultRenderingPipeline {
    const features = tierFeatures(tier);
    const pipeline = new DefaultRenderingPipeline("ambience", true, this.scene, [this.camera]);

    pipeline.bloomEnabled = features.bloom;
    pipeline.bloomThreshold = AMBIENCE.bloom.threshold;
    pipeline.bloomWeight = AMBIENCE.bloom.weight;
    pipeline.bloomKernel = features.bloomKernel;
    pipeline.bloomScale = AMBIENCE.bloom.scale;

    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = AMBIENCE.aberration.idle;
    pipeline.chromaticAberration.radialIntensity = 1.4;

    pipeline.grainEnabled = true;
    pipeline.grain.intensity = AMBIENCE.grain.intensity;
    pipeline.grain.animated = true;

    pipeline.sharpenEnabled = false;
    pipeline.fxaaEnabled = features.fxaa;

    pipeline.imageProcessingEnabled = true;
    const imageProcessing = pipeline.imageProcessing;
    imageProcessing.exposure = AMBIENCE.tone.exposure;
    imageProcessing.contrast = AMBIENCE.tone.contrast;
    imageProcessing.toneMappingEnabled = true;
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

    return pipeline;
  }

  private applySize = (): void => {
    const scale = Math.max(1, getSettings().pixelation);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.canvas.style.imageRendering = "pixelated";
    this.engine.setHardwareScalingLevel(scale);
    this.engine.resize(true);
  };

  update(dt: number, elapsed: number, threatDistance: number): void {
    const fog = AMBIENCE.fog;
    const vignette = AMBIENCE.vignette;
    const aberration = AMBIENCE.aberration;

    const breath = Math.sin(elapsed * 2 * Math.PI * fog.breathHz);
    let fogTarget = fog.density + breath * fog.breathAmount;
    let vignetteTarget = vignette.weight
      + Math.sin(elapsed * 2 * Math.PI * vignette.breathHz) * vignette.breathAmount;
    let aberrationTarget = aberration.idle;

    const t = clamp01((AMBIENCE.chase.radius - threatDistance) / AMBIENCE.chase.radius);
    if (t > 0) {
      fogTarget = fogTarget + (fog.chaseDensity - fogTarget) * t;
      vignetteTarget = vignetteTarget + (vignette.chaseWeight - vignetteTarget) * t;
      aberrationTarget = aberrationTarget + (aberration.chase - aberrationTarget) * t;
    }

    this.fogDensity = expLerp(this.fogDensity, fogTarget, fog.lerp, dt);
    this.vignetteWeight = expLerp(this.vignetteWeight, vignetteTarget, fog.lerp, dt);
    this.aberrationAmount = expLerp(this.aberrationAmount, aberrationTarget, fog.lerp, dt);

    this.scene.fogDensity = this.fogDensity;
    this.renderPipeline.imageProcessing.vignetteWeight = this.vignetteWeight;
    this.renderPipeline.chromaticAberration.aberrationAmount = this.aberrationAmount;
  }

  setTier(tier: GraphicsTier): void {
    this.tier = tier;
    this.renderPipeline.dispose();
    this.renderPipeline = this.buildPipeline(tier);
  }

  get pipeline(): DefaultRenderingPipeline {
    return this.renderPipeline;
  }

  dispose(): void {
    window.removeEventListener("resize", this.applySize);
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
    this.renderPipeline.dispose();
  }
}
