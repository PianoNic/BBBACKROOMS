import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Effect } from "@babylonjs/core/Materials/effect";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import { PassPostProcess } from "@babylonjs/core/PostProcesses/passPostProcess";

import { getSettings, onSettingsChange } from "../core/settings";
import { setActiveScene, color3 } from "./babylon";

const BACKGROUND = 0x111111;
const FOG_NEAR = 8;
const FOG_FAR = 40;
const GRAIN_INTENSITY = 0.55;
const AMBIENT_COLOR = 0x6a6a78;
const AMBIENT_INTENSITY = 0.6;

Effect.ShadersStore.filmGrainFragmentShader = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform float time;
uniform float intensity;
float rand(vec2 uv) {
  const float a = 12.9898, b = 78.233, c = 43758.5453;
  float dt = dot(uv.xy, vec2(a, b));
  float sn = mod(dt, 3.14159265359);
  return fract(sin(sn) * c);
}
void main() {
  vec4 base = texture2D(textureSampler, vUV);
  float noise = rand(fract(vUV + time));
  vec3 col = base.rgb + base.rgb * clamp(0.1 + noise, 0.0, 1.0);
  col = mix(base.rgb, col, intensity);
  gl_FragColor = vec4(col, base.a);
}
`;

export type RenderContext = {
  engine: Engine;
  scene: Scene;
  camera: FreeCamera;
  canvas: HTMLCanvasElement;
  render: (dt: number) => void;
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
  const applySize = (): void => {
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    engine.setSize(window.innerWidth, window.innerHeight);
  };
  applySize();

  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = new Color4(
    ((BACKGROUND >> 16) & 0xff) / 255,
    ((BACKGROUND >> 8) & 0xff) / 255,
    (BACKGROUND & 0xff) / 255,
    1,
  );
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogColor = color3(BACKGROUND);
  scene.fogStart = FOG_NEAR;
  scene.fogEnd = FOG_FAR;
  scene.skipPointerMovePicking = true;
  setActiveScene(scene);

  const camera = new FreeCamera("player", new Vector3(0, 1.7, 0), scene);
  camera.fov = (settings.fov * Math.PI) / 180;
  camera.minZ = 0.1;
  camera.maxZ = 200;
  camera.inputs.clear();
  scene.activeCamera = camera;

  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.diffuse = color3(AMBIENT_COLOR);
  ambient.groundColor = color3(AMBIENT_COLOR);
  ambient.specular = Color3.Black();
  ambient.intensity = AMBIENT_INTENSITY;

  let grainTime = 0;
  let pixelPass: PassPostProcess | null = null;
  let grainPass: PostProcess | null = null;

  const buildPasses = (pixelSize: number): void => {
    pixelPass?.dispose(camera);
    grainPass?.dispose(camera);
    pixelPass = new PassPostProcess(
      "pixelate", 1 / Math.max(1, pixelSize), camera,
      Texture.NEAREST_SAMPLINGMODE, engine, false,
    );
    grainPass = new PostProcess(
      "grain", "filmGrain", ["time", "intensity"], null, 1.0, camera,
      Texture.BILINEAR_SAMPLINGMODE, engine, false,
    );
    grainPass.onApply = (effect) => {
      effect.setFloat("time", grainTime);
      effect.setFloat("intensity", GRAIN_INTENSITY);
    };
  };
  buildPasses(settings.pixelation);

  let currentPixelation = settings.pixelation;

  window.addEventListener("resize", applySize);

  onSettingsChange((s) => {
    if (s.pixelation !== currentPixelation) {
      currentPixelation = s.pixelation;
      buildPasses(s.pixelation);
    }
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
    render: (dt: number) => {
      grainTime += dt;
      scene.render();
    },
    showInspector,
  };
}
