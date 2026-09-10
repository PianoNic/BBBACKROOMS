/** Shared-context Babylon viewer pool used by the tutorial showcase.
 *  One offscreen Engine/Scene renders every tile's model on its own
 *  camera layer mask, then blits into each tile's own 2D canvas, so the
 *  showcase never opens more than a single WebGL context. */
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Group, setCameraOrientation, withScene } from "../rendering/babylon";

export type MiniViewer = {
  canvas: HTMLCanvasElement;
  dispose: () => void;
};

export type ItemViewerPool = {
  add(build: () => TransformNode): MiniViewer;
  dispose(): void;
};

const MAX_LAYERS = 30;

type Entry = {
  wrapper: Group;
  camera: FreeCamera;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
};

export function createItemViewerPool(size = 140): ItemViewerPool {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const backing = size * dpr;

  const engineCanvas = document.createElement("canvas");
  engineCanvas.width = backing;
  engineCanvas.height = backing;

  const engine = new Engine(engineCanvas, true, { alpha: true, stencil: false }, false);
  engine.setSize(backing, backing);

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

  const entries = new Set<Entry>();
  let nextLayer = 0;
  let raf = 0;
  let running = false;
  let last = performance.now();

  function tick(now: number): void {
    const dt = (now - last) / 1000;
    last = now;
    for (const entry of entries) entry.wrapper.rotation.y += dt * 0.9;
    for (const entry of entries) {
      scene.activeCamera = entry.camera;
      scene.render();
      entry.ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
      entry.ctx.drawImage(engineCanvas, 0, 0, entry.canvas.width, entry.canvas.height);
    }
    if (entries.size > 0) {
      raf = requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }

  function ensureLoop(): void {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function add(build: () => TransformNode): MiniViewer {
    const canvas = document.createElement("canvas");
    canvas.width = backing;
    canvas.height = backing;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d")!;

    const layer = nextLayer % MAX_LAYERS;
    nextLayer++;
    const mask = 1 << layer;

    const wrapper = new Group("viewerWrapper", scene);
    const model = withScene(scene, build);
    model.parent = wrapper;
    wrapper.computeWorldMatrix(true);

    const bounds = wrapper.getHierarchyBoundingVectors(true);
    const cx = (bounds.min.x + bounds.max.x) / 2;
    const cy = (bounds.min.y + bounds.max.y) / 2;
    const cz = (bounds.min.z + bounds.max.z) / 2;
    const span = bounds.max.subtract(bounds.min).length();
    model.position.set(
      model.position.x - cx, model.position.y - cy, model.position.z - cz,
    );

    for (const mesh of wrapper.getChildMeshes(false)) mesh.layerMask = mask;
    if ("layerMask" in model) (model as unknown as AbstractMesh).layerMask = mask;

    const cam = new FreeCamera(`viewer${layer}`, new Vector3(0, 0, 0), scene);
    cam.fov = (35 * Math.PI) / 180;
    cam.minZ = 0.05;
    cam.maxZ = 100;
    cam.inputs.clear();
    const dist = Math.max(span * 1.5, 0.9);
    const camY = span * 0.35;
    cam.position.set(0, camY, dist);
    setCameraOrientation(cam, 0, Math.atan2(-camY, dist));
    cam.layerMask = mask;

    const entry: Entry = { wrapper, camera: cam, canvas, ctx };
    entries.add(entry);
    ensureLoop();

    return {
      canvas,
      dispose: () => {
        entries.delete(entry);
        cam.dispose();
        wrapper.dispose(false, true);
      },
    };
  }

  function dispose(): void {
    for (const entry of Array.from(entries)) {
      entries.delete(entry);
      entry.camera.dispose();
      entry.wrapper.dispose(false, true);
    }
    cancelAnimationFrame(raf);
    running = false;
    scene.dispose();
    engine.dispose();
  }

  return { add, dispose };
}
