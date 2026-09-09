import "@babylonjs/core/Particles/webgl2ParticleSystem";
import type { Scene } from "@babylonjs/core/scene";
import type { IParticleSystem } from "@babylonjs/core/Particles/IParticleSystem";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { GPUParticleSystem } from "@babylonjs/core/Particles/gpuParticleSystem";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AMBIENCE, tierFeatures, type GraphicsTier } from "./ambience";
import { getSettings, onSettingsChange } from "../core/settings";

const DOT_SIZE = 32;

function hexToColor4(hex: number, alpha: number): Color4 {
  return new Color4(
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
    alpha,
  );
}

function buildDotTexture(scene: Scene): DynamicTexture {
  const tex = new DynamicTexture(
    "particleDot", DOT_SIZE, scene, false, Texture.TRILINEAR_SAMPLINGMODE,
  );
  const ctx = tex.getContext();
  const r = DOT_SIZE / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.6, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.clearRect(0, 0, DOT_SIZE, DOT_SIZE);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, DOT_SIZE, DOT_SIZE);
  tex.update(false);
  tex.hasAlpha = true;
  return tex;
}

function makeSystem(
  name: string, capacity: number, scene: Scene,
): IParticleSystem {
  if (capacity <= 0) capacity = 1;
  if (GPUParticleSystem.IsSupported) {
    return new GPUParticleSystem(name, { capacity }, scene);
  }
  return new ParticleSystem(name, capacity, scene);
}

export class AmbienceParticles {
  private scene: Scene;
  private dotTexture: DynamicTexture;
  private dust: IParticleSystem | null = null;
  private dustOrigin = new Vector3();
  private lastPos = new Vector3();
  private puff: IParticleSystem | null = null;
  private tier: GraphicsTier;
  private unsubscribe: () => void;

  constructor(scene: Scene) {
    this.scene = scene;
    this.dotTexture = buildDotTexture(scene);
    this.tier = getSettings().graphicsTier;
    this.rebuildPuff(this.tier);
    this.rebuildDust(this.tier);
    this.unsubscribe = onSettingsChange((s) => {
      if (s.graphicsTier !== this.tier) this.setTier(s.graphicsTier);
    });
  }

  private buildPuffSystem(): IParticleSystem {
    const count = AMBIENCE.particles.puffCount;
    const sys = makeSystem("dustPuff", count, this.scene);
    sys.particleTexture = this.dotTexture;
    sys.emitter = new Vector3();
    sys.createBoxEmitter(
      new Vector3(-0.6, 0.8, -0.6), new Vector3(0.6, 1.4, 0.6),
      new Vector3(-0.15, 0, -0.15), new Vector3(0.15, 0.05, 0.15),
    );
    sys.color1 = hexToColor4(AMBIENCE.particles.dustColor, AMBIENCE.particles.dustAlpha * 1.5);
    sys.color2 = hexToColor4(AMBIENCE.particles.dustColor, AMBIENCE.particles.dustAlpha);
    sys.colorDead = hexToColor4(AMBIENCE.particles.dustColor, 0);
    sys.minSize = AMBIENCE.particles.dustMinSize * 1.5;
    sys.maxSize = AMBIENCE.particles.dustMaxSize * 2;
    sys.minLifeTime = 0.4;
    sys.maxLifeTime = 0.9;
    sys.minEmitPower = 0.6;
    sys.maxEmitPower = 1.4;
    sys.gravity = new Vector3(0, -2, 0);
    sys.blendMode = ParticleSystem.BLENDMODE_ADD;
    sys.emitRate = 0;
    sys.disposeOnStop = false;
    sys.targetStopDuration = 0.15;
    sys.isBillboardBased = true;
    return sys;
  }

  private buildDustSystem(count: number): IParticleSystem {
    const sys = makeSystem("dustMotes", count, this.scene);
    sys.particleTexture = this.dotTexture;
    sys.emitter = this.dustOrigin;
    const r = AMBIENCE.particles.dustRadius;
    sys.createBoxEmitter(
      new Vector3(-1, -0.3, -1), new Vector3(1, 0.1, 1),
      new Vector3(-r, -r, -r), new Vector3(r, r, r),
    );
    sys.color1 = hexToColor4(AMBIENCE.particles.dustColor, AMBIENCE.particles.dustAlpha);
    sys.color2 = hexToColor4(AMBIENCE.particles.dustColor, AMBIENCE.particles.dustAlpha * 0.6);
    sys.colorDead = hexToColor4(AMBIENCE.particles.dustColor, 0);
    sys.minSize = AMBIENCE.particles.dustMinSize;
    sys.maxSize = AMBIENCE.particles.dustMaxSize;
    sys.minLifeTime = 6;
    sys.maxLifeTime = 11;
    sys.minEmitPower = AMBIENCE.particles.dustSpeed * 0.5;
    sys.maxEmitPower = AMBIENCE.particles.dustSpeed;
    sys.gravity = new Vector3(0, -0.01, 0);
    sys.blendMode = ParticleSystem.BLENDMODE_ADD;
    sys.emitRate = count / 8;
    sys.isBillboardBased = true;
    sys.preWarmCycles = 60;
    sys.preWarmStepOffset = 5;
    sys.start();
    return sys;
  }

  private rebuildPuff(tier: GraphicsTier): void {
    if (this.puff) {
      this.puff.dispose();
      this.puff = null;
    }
    if (tierFeatures(tier).particleScale <= 0) return;
    this.puff = this.buildPuffSystem();
  }

  private rebuildDust(tier: GraphicsTier): void {
    if (this.dust) {
      this.dust.dispose();
      this.dust = null;
    }
    const scale = tierFeatures(tier).particleScale;
    if (scale <= 0) return;
    const count = Math.round(AMBIENCE.particles.dustCount * scale);
    if (count <= 0) return;
    this.dust = this.buildDustSystem(count);
    this.dustOrigin.copyFrom(this.lastPos);
  }

  update(px: number, py: number, pz: number): void {
    this.lastPos.set(px, py, pz);
    if (this.dust) this.dustOrigin.set(px, py, pz);
  }

  puffAt(x: number, y: number, z: number): void {
    if (!this.puff) return;
    (this.puff.emitter as Vector3).set(x, y, z);
    this.puff.manualEmitCount = AMBIENCE.particles.puffCount;
    this.puff.start();
  }

  setTier(tier: GraphicsTier): void {
    this.tier = tier;
    this.rebuildDust(tier);
    this.rebuildPuff(tier);
  }

  dispose(): void {
    this.unsubscribe();
    if (this.dust) this.dust.dispose();
    if (this.puff) this.puff.dispose();
    this.dotTexture.dispose();
  }
}
