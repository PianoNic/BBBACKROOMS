/** Tiny self-contained THREE viewer used in the tutorial showcase.
 *  Spins a model around the Y axis. Returns a dispose fn so the title
 *  screen can release the WebGL contexts when leaving the tutorial. */
import * as THREE from "three";

export type MiniViewer = {
  canvas: HTMLCanvasElement;
  dispose: () => void;
};

export function createItemViewer(
  model: THREE.Group, size = 140,
): MiniViewer {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(size, size, false);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(2, 3, 2);
  scene.add(dir);

  // Center the model on its bounding box so rotation looks balanced.
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const span = box.getSize(new THREE.Vector3()).length();
  model.position.sub(center);
  const wrapper = new THREE.Group();
  wrapper.add(model);
  scene.add(wrapper);

  const cam = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  const dist = Math.max(span * 1.5, 0.9);
  cam.position.set(0, span * 0.35, dist);
  cam.lookAt(0, 0, 0);

  let raf = 0;
  let disposed = false;
  let last = performance.now();
  function tick(now: number): void {
    if (disposed) return;
    const dt = (now - last) / 1000;
    last = now;
    wrapper.rotation.y += dt * 0.9;
    renderer.render(scene, cam);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    canvas,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      renderer.forceContextLoss();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat && "dispose" in mat) (mat as THREE.Material).dispose();
      });
    },
  };
}
