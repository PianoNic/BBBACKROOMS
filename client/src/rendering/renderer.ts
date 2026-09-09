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

  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.diffuse = color3(AMBIENCE.ambientLight.color);
  ambient.groundColor = color3(AMBIENCE.ambientLight.color);
  ambient.specular = Color3.Black();
  ambient.intensity = AMBIENCE.ambientLight.intensity;

  const ambience = new Ambience(engine, scene, camera, canvas);

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
