import type { Engine } from "@babylonjs/core/Engines/engine";
import type { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Scene } from "@babylonjs/core/scene";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { SSAO2RenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline";
import { VolumetricLightScatteringPostProcess } from "@babylonjs/core/PostProcesses/volumetricLightScatteringPostProcess";
import { ColorCurves } from "@babylonjs/core/Materials/colorCurves";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";

import { AMBIENCE, tierFeatures, type GraphicsTier } from "./ambience";
import { getSettings, onSettingsChange } from "../core/settings";
import { color3 } from "./babylon";

let currentGlowLayer: GlowLayer | null = null;
const pendingGlowMeshes: AbstractMesh[] = [];

export function registerGlowMesh(mesh: AbstractMesh): void {
  if (mesh.isDisposed()) return;
  pendingGlowMeshes.push(mesh);
  if (currentGlowLayer) currentGlowLayer.addIncludedOnlyMesh(mesh as Mesh);
}

function applyGlowQueue(layer: GlowLayer): void {
  for (let i = pendingGlowMeshes.length - 1; i >= 0; i--) {
    if (pendingGlowMeshes[i].isDisposed()) {
      pendingGlowMeshes.splice(i, 1);
      continue;
    }
    layer.addIncludedOnlyMesh(pendingGlowMeshes[i] as Mesh);
  }
}

let currentAmbience: Ambience | null = null;
let pendingVolumetricMesh: AbstractMesh | null = null;

export function registerVolumetricEmitter(mesh: AbstractMesh): void {
  if (mesh.isDisposed()) return;
  pendingVolumetricMesh = mesh;
  currentAmbience?.attachVolumetricEmitter(mesh);
}

export function clearVolumetricEmitter(): void {
  pendingVolumetricMesh = null;
  currentAmbience?.detachVolumetricEmitter();
}

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
  private ssaoPipeline: SSAO2RenderingPipeline | null = null;
  private volumetric: VolumetricLightScatteringPostProcess | null = null;
  private glowLayer: GlowLayer | null = null;
  private colorCurves!: ColorCurves;
  private tier: GraphicsTier;
  private unsubscribe: (() => void)[] = [];

  private fogDensity = AMBIENCE.fog.density;
  private vignetteWeight = AMBIENCE.vignette.weight;
  private aberrationAmount = AMBIENCE.aberration.idle;
  private saturation = AMBIENCE.tone.saturation;
  private readonly baseExposure = AMBIENCE.tone.exposure;
  private readonly baseContrast = AMBIENCE.tone.contrast;
  private currentPixelation: number;

  private hidden = false;
  private heartPhase = 0;
  private caughtState: "idle" | "flash" | "black" = "idle";
  private caughtTimer = 0;

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

    this.ssaoPipeline = this.buildSSAO(this.tier);
    this.renderPipeline = this.buildPipeline(this.tier);
    this.buildGlow(this.tier);
    this.volumetric = this.buildVolumetric(this.tier, pendingVolumetricMesh);

    this.applySize();
    window.addEventListener("resize", this.applySize);

    this.unsubscribe.push(onSettingsChange((s) => {
      if (s.pixelation !== this.currentPixelation) {
        this.currentPixelation = s.pixelation;
        this.applySize();
      }
      if (s.graphicsTier !== this.tier) this.setTier(s.graphicsTier);
    }));

    currentAmbience = this;
  }

  private buildSSAO(tier: GraphicsTier): SSAO2RenderingPipeline | null {
    const features = tierFeatures(tier);
    if (!features.ssao) return null;
    const ssao = AMBIENCE.ssao;
    const pipeline = new SSAO2RenderingPipeline(
      "ambienceSSAO", this.scene, features.ssaoRatio, [this.camera],
    );
    pipeline.radius = ssao.radius;
    pipeline.totalStrength = ssao.totalStrength;
    pipeline.base = ssao.base;
    pipeline.samples = ssao.samples;
    pipeline.maxZ = ssao.maxZ;
    pipeline.minZAspect = ssao.minZAspect;
    return pipeline;
  }

  private buildVolumetric(
    tier: GraphicsTier, mesh: AbstractMesh | null,
  ): VolumetricLightScatteringPostProcess | null {
    if (!tierFeatures(tier).volumetric) return null;
    if (!mesh || mesh.isDisposed()) return null;
    const v = AMBIENCE.volumetric;
    const vls = new VolumetricLightScatteringPostProcess(
      "ambienceVolumetric",
      { postProcessRatio: 1, passRatio: v.ratio },
      this.camera, mesh as Mesh, v.samples,
      Texture.NEAREST_SAMPLINGMODE,
    );
    vls.exposure = v.exposure;
    vls.decay = v.decay;
    vls.weight = v.weight;
    vls.density = v.density;
    return vls;
  }

  attachVolumetricEmitter(mesh: AbstractMesh): void {
    if (mesh.isDisposed()) return;
    if (!tierFeatures(this.tier).volumetric) return;
    this.volumetric?.dispose(this.camera);
    this.volumetric = this.buildVolumetric(this.tier, mesh);
  }

  detachVolumetricEmitter(): void {
    this.volumetric?.dispose(this.camera);
    this.volumetric = null;
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
    this.colorCurves = colorCurves;

    return pipeline;
  }

  private buildGlow(tier: GraphicsTier): void {
    this.glowLayer = tierFeatures(tier).glow
      ? new GlowLayer("ambienceGlow", this.scene)
      : null;
    if (this.glowLayer) {
      this.glowLayer.intensity = AMBIENCE.glow.intensity;
      this.glowLayer.blurKernelSize = AMBIENCE.glow.blurKernelSize;
      applyGlowQueue(this.glowLayer);
    }
    currentGlowLayer = this.glowLayer;
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
    const cues = AMBIENCE.cues;

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

    let saturationTarget = AMBIENCE.tone.saturation;
    let lerpRate = fog.lerp;
    if (this.hidden) {
      vignetteTarget = cues.hiddenVignette;
      saturationTarget = cues.hiddenSaturation;
      lerpRate = cues.hiddenLerp;
    }

    this.fogDensity = expLerp(this.fogDensity, fogTarget, fog.lerp, dt);
    this.vignetteWeight = expLerp(this.vignetteWeight, vignetteTarget, lerpRate, dt);
    this.aberrationAmount = expLerp(this.aberrationAmount, aberrationTarget, fog.lerp, dt);
    this.saturation = expLerp(this.saturation, saturationTarget, lerpRate, dt);

    this.scene.fogDensity = this.fogDensity;
    this.renderPipeline.imageProcessing.vignetteWeight = this.vignetteWeight;
    this.renderPipeline.chromaticAberration.aberrationAmount = this.aberrationAmount;
    this.colorCurves.globalSaturation = this.saturation;

    const heartHz = cues.heartPulseHzFar + (cues.heartPulseHzNear - cues.heartPulseHzFar) * t;
    this.heartPhase += dt * 2 * Math.PI * heartHz;
    const heartPulse = t > 0 ? Math.sin(this.heartPhase) * cues.heartPulseAmount * t : 0;

    this.renderPipeline.imageProcessing.exposure = this.applyCaught(dt, this.baseExposure + heartPulse);
  }

  private applyCaught(dt: number, baseExposure: number): number {
    const ip = this.renderPipeline.imageProcessing;
    if (this.caughtState === "idle") {
      ip.contrast = this.baseContrast;
      return baseExposure;
    }
    this.caughtTimer += dt * 1000;
    const cues = AMBIENCE.cues;
    if (this.caughtState === "flash") {
      ip.contrast = this.baseContrast * 1.6;
      if (this.caughtTimer >= cues.caughtFlashMs) {
        this.caughtState = "black";
        this.caughtTimer = 0;
      }
      return baseExposure + 2.5;
    }
    ip.contrast = this.baseContrast;
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

  flashAndCut(): void {
    this.caughtState = "flash";
    this.caughtTimer = 0;
  }

  setTier(tier: GraphicsTier): void {
    this.tier = tier;
    this.renderPipeline.dispose();
    this.ssaoPipeline?.dispose();
    this.ssaoPipeline = this.buildSSAO(tier);
    this.renderPipeline = this.buildPipeline(tier);
    this.glowLayer?.dispose();
    this.buildGlow(tier);
    this.volumetric?.dispose(this.camera);
    this.volumetric = this.buildVolumetric(tier, pendingVolumetricMesh);
  }

  get pipeline(): DefaultRenderingPipeline {
    return this.renderPipeline;
  }

  dispose(): void {
    window.removeEventListener("resize", this.applySize);
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
    this.renderPipeline.dispose();
    this.ssaoPipeline?.dispose();
    this.volumetric?.dispose(this.camera);
    this.glowLayer?.dispose();
    if (currentGlowLayer === this.glowLayer) currentGlowLayer = null;
    if (currentAmbience === this) currentAmbience = null;
  }
}
