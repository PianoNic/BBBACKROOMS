/** Tiny self-contained Babylon viewer used in the tutorial showcase.
 *  Spins a model around the Y axis. Returns a dispose fn so the title
 *  screen can release the WebGL contexts when leaving the tutorial. */
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Group, setCameraOrientation, withScene } from "../rendering/babylon";

export type MiniViewer = {
  canvas: HTMLCanvasElement;
  dispose: () => void;
};

export function createItemViewer(
  build: () => TransformNode, size = 140,
): MiniViewer {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const canvas = document.createElement("canvas");
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const engine = new Engine(canvas, true, { alpha: true, stencil: false }, false);
  engine.setSize(size * dpr, size * dpr);

  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = new Color4(0, 0, 0, 0);

  const ambient = new HemisphericLight("amb", new Vector3(0, 1, 0), scene);
  ambient.diffuse = Color3.White();
  ambient.groundColor = Color3.White();
  ambient.specular = Color3.Black();
  ambient.intensity = 0.65;
  const dir = new DirectionalLight("dir", new Vector3(-2, -3, -2).normalize(), scene);
  dir.diffuse = Color3.White();
  dir.specular = Color3.Black();
  dir.intensity = 0.9;

  const wrapper = new Group("viewerWrapper", scene);
  const model = withScene(scene, build);
  model.parent = wrapper;
  wrapper.computeWorldMatrix(true);

  // Center the model on its bounding box so rotation looks balanced.
  const bounds = wrapper.getHierarchyBoundingVectors(true);
  const cx = (bounds.min.x + bounds.max.x) / 2;
  const cy = (bounds.min.y + bounds.max.y) / 2;
  const cz = (bounds.min.z + bounds.max.z) / 2;
  const span = bounds.max.subtract(bounds.min).length();
  model.position.set(
    model.position.x - cx, model.position.y - cy, model.position.z - cz,
  );

  const cam = new FreeCamera("viewer", new Vector3(0, 0, 0), scene);
  cam.fov = (35 * Math.PI) / 180;
  cam.minZ = 0.05;
  cam.maxZ = 100;
  cam.inputs.clear();
  const dist = Math.max(span * 1.5, 0.9);
  const camY = span * 0.35;
  cam.position.set(0, camY, dist);
  setCameraOrientation(cam, 0, Math.atan2(-camY, dist));
  scene.activeCamera = cam;

  let raf = 0;
  let disposed = false;
  let last = performance.now();
  function tick(now: number): void {
    if (disposed) return;
    const dt = (now - last) / 1000;
    last = now;
    wrapper.rotation.y += dt * 0.9;
    scene.render();
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    canvas,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      scene.dispose();
      engine.dispose();
    },
  };
}
