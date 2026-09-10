import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";

import { getSettings, onSettingsChange } from "../core/settings";
import { setActiveScene, color3 } from "./babylon";
import { AMBIENCE } from "./ambience";
import { Ambience } from "./pipeline";

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function expLerp(current: number, target: number, rate: number, dt: number): number {
  const a = 1 - Math.exp(-rate * dt);
  return current + (target - current) * a;
}

export class AmbientLights {
  readonly ambient: HemisphericLight;
  private current: number;

  constructor(scene: Scene) {
    const up = new Vector3(0, 1, 0);
    const sky = color3(AMBIENCE.ambientLight.skyColor);

    this.ambient = new HemisphericLight("ambient", up, scene);
    this.ambient.diffuse = sky.clone();
    this.ambient.groundColor = sky.clone();
    this.ambient.specular = Color3.Black();
    this.current = AMBIENCE.ambientLight.intensity;
    this.ambient.intensity = this.current;
  }

  update(dt: number, flickerFactor: number): void {
    const cfg = AMBIENCE.ambientLight;
    const target = cfg.intensity * (cfg.minFactor + (1 - cfg.minFactor) * clamp01(flickerFactor));
    this.current = expLerp(this.current, target, cfg.lerp, dt);
    this.ambient.intensity = this.current;
  }
}

export type RenderContext = {
  engine: Engine;
  scene: Scene;
  camera: FreeCamera;
  canvas: HTMLCanvasElement;
  ambience: Ambience;
  render: () => void;
  showInspector: (on: boolean) => void;
};

export function createRenderContext(mount: HTMLElement): RenderContext {
  const settings = getSettings();
  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  mount.appendChild(canvas);

  const engine = new Engine(canvas, false, {
    preserveDrawingBuffer: false,
    stencil: false,
    powerPreference: "high-performance",
  }, false);
  engine.disableUniformBuffers = true;

  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = new Color4(
    ((AMBIENCE.clearColor >> 16) & 0xff) / 255,
    ((AMBIENCE.clearColor >> 8) & 0xff) / 255,
    (AMBIENCE.clearColor & 0xff) / 255,
    1,
  );
  scene.skipPointerMovePicking = true;
  setActiveScene(scene);

  const camera = new FreeCamera("player", new Vector3(0, 1.7, 0), scene);
  camera.fov = (settings.fov * Math.PI) / 180;
  camera.minZ = 0.1;
  camera.maxZ = 200;
  camera.inputs.clear();
  scene.activeCamera = camera;

  const ambience = new Ambience(engine, scene, canvas);

  onSettingsChange((s) => {
    const rad = (s.fov * Math.PI) / 180;
    if (Math.abs(camera.fov - rad) > 1e-6) camera.fov = rad;
  });

  const showInspector = (on: boolean): void => {
    void import("@babylonjs/core/Debug/debugLayer").then(() => {
      if (on) void scene.debugLayer.show({ embedMode: true });
      else void scene.debugLayer.hide();
    });
  };

  return {
    engine,
    scene,
    camera,
    canvas,
    ambience,
    render: () => {
      scene.render();
    },
    showInspector,
  };
}
