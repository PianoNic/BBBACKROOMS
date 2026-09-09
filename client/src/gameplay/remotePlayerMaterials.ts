/** Material factories for the remote-player voxel cube.
 *
 *  Babylon's box builder lays its six faces out as [+Z, -Z, +X, -X, +Y,
 *  -Y]. A player facing yaw=0 walks toward -Z, so others see their -Z
 *  face → put avatar or video texture on FRONT_FACE (index 1); pick a
 *  complementary side colour for the other five faces so the cube isn't a
 *  flat block. */
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MultiMaterial } from "@babylonjs/core/Materials/multiMaterial";
import { SubMesh } from "@babylonjs/core/Meshes/subMesh";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { VideoTexture } from "@babylonjs/core/Materials/Textures/videoTexture";
import {
  activeScene, basicMaterial, box, cone, cylinder, group, lambertMaterial, sphere, torus,
} from "../rendering/babylon";

export const FRONT_FACE = 1;

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

function sampleCorner(img: HTMLImageElement): Color3 {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const cx = c.getContext("2d")!;
  cx.drawImage(img, img.width - 1, img.height - 1, 1, 1, 0, 0, 1, 1);
  const [r, g, b] = cx.getImageData(0, 0, 1, 1).data;
  return new Color3(r / 255, g / 255, b / 255);
}

export function makeColorMaterial(color: string): StandardMaterial {
  return lambertMaterial(Color3.FromHexString(color));
}

/** Box with `front` material on the player-facing face and `sideColor`
 *  on the other five faces. Shared by static avatar and live webcam. */
export function makeFaceMaterials(
  front: StandardMaterial, sideColor: Color3,
): StandardMaterial[] {
  const side = () => lambertMaterial(sideColor);
  const mats: StandardMaterial[] = [
    side(), side(), side(), side(), side(), side(),
  ];
  mats[FRONT_FACE] = front;
  return mats;
}

function textureFromImage(img: HTMLImageElement): DynamicTexture {
  const tex = new DynamicTexture(
    "avatar", { width: img.width, height: img.height },
    activeScene(), true, Texture.NEAREST_SAMPLINGMODE,
  );
  tex.getContext().drawImage(img, 0, 0);
  tex.update(false);
  return tex;
}

export async function makeAvatarMaterials(
  dataUrl: string,
): Promise<StandardMaterial[]> {
  const img = await loadImage(dataUrl);
  const front = lambertMaterial(Color3.White());
  front.diffuseTexture = textureFromImage(img);
  return makeFaceMaterials(front, sampleCorner(img));
}

export function buildVoxelMesh(
  w: number, h: number, d: number, mat: StandardMaterial | StandardMaterial[],
): Mesh {
  const mesh = box(w, h, d);
  const multi = new MultiMaterial("voxel", activeScene());
  multi.subMaterials = Array.isArray(mat) ? mat : [mat, mat, mat, mat, mat, mat];
  mesh.material = multi;
  mesh.subMeshes = [];
  for (let i = 0; i < 6; i++) new SubMesh(i, i * 4, 4, i * 6, 6, mesh);
  return mesh;
}

export function setVoxelMaterial(
  mesh: Mesh, mat: StandardMaterial | StandardMaterial[],
): void {
  const multi = mesh.material as MultiMaterial;
  const old = multi.subMaterials.slice() as StandardMaterial[];
  multi.subMaterials = Array.isArray(mat) ? mat : [mat, mat, mat, mat, mat, mat];
  disposeMaterial(old);
}

export function disposeVoxelMaterial(mesh: Mesh): void {
  const multi = mesh.material as MultiMaterial;
  disposeMaterial(multi.subMaterials as StandardMaterial[]);
  multi.dispose();
}

/** Procedural cosmetic hat, attached as a child of the voxel so it inherits
 *  position + yaw and survives material swaps. The cube's local top is +0.85
 *  (height 1.7, centred), so hats sit a little above that. */
export function buildHat(key: string): TransformNode | null {
  const root = group("hat");
  const GOLD = 0xffd24a, DARK = 0x222222, PARTY = 0xff5fa2;
  const add = (
    build: (mat: StandardMaterial) => Mesh, color: number, y: number,
    opts: { basic?: boolean; double?: boolean } = {},
  ): Mesh => {
    const mat = opts.basic ? basicMaterial(color) : lambertMaterial(color);
    if (opts.double) mat.backFaceCulling = false;
    const m = build(mat);
    m.position.y = y;
    root.add(m);
    return m;
  };

  if (key === "cone") {
    add((mat) => cone(0.26, 0.5, 16, mat), PARTY, 1.12);
  } else if (key === "halo") {
    const m = add((mat) => torus(0.22, 0.045, 24, mat), GOLD, 1.18, { basic: true });
    m.rotation.x = Math.PI / 2;
  } else if (key === "gradcap") {
    add((mat) => box(0.55, 0.05, 0.55, mat), DARK, 0.95);
    const tassel = add((mat) => sphere(0.04, 8, mat), GOLD, 0.9);
    tassel.position.x = 0.22;
  } else if (key === "crown") {
    add((mat) => cylinder(0.25, 0.25, 0.14, 16, mat), GOLD, 0.98, { double: true });
    for (let i = 0; i < 4; i++) {
      const spike = add((mat) => cone(0.05, 0.12, 6, mat), GOLD, 1.08);
      const a = (i / 4) * Math.PI * 2;
      spike.position.x = Math.cos(a) * 0.19;
      spike.position.z = Math.sin(a) * 0.19;
    }
  } else if (key === "beret") {
    const dome = add((mat) => sphere(0.3, 16, mat), 0xc0392b, 0.92);
    dome.scaling.y = 0.35;
    dome.position.x = 0.04;
    add((mat) => sphere(0.04, 8, mat), 0x8e2330, 1.04).position.x = 0.04;
  } else if (key === "propeller") {
    add((mat) => cylinder(0.24, 0.26, 0.12, 16, mat), 0xe74c3c, 0.93);
    add((mat) => cylinder(0.02, 0.02, 0.12, 8, mat), DARK, 1.04);
    add((mat) => box(0.46, 0.02, 0.07, mat), 0x3498db, 1.11);
    add((mat) => box(0.07, 0.02, 0.46, mat), 0xf1c40f, 1.11);
  } else if (key === "viking") {
    add((mat) => cylinder(0.27, 0.27, 0.14, 16, mat), 0x7d7d85, 0.95, { double: true });
    for (const side of [-1, 1]) {
      const horn = add((mat) => cone(0.07, 0.28, 10, mat), 0xf3e9d2, 1.05);
      horn.position.x = side * 0.29;
      horn.rotation.z = -side * 0.85;
    }
  } else if (key === "sombrero") {
    add((mat) => cylinder(0.45, 0.45, 0.03, 20, mat), 0xd8a24a, 0.92);
    add((mat) => cone(0.2, 0.3, 16, mat), 0xd8a24a, 1.08);
    add((mat) => cylinder(0.205, 0.205, 0.06, 16, mat), 0xc0392b, 0.97);
  } else if (key === "headset") {
    // Half-torus band over the head, earcups on the cube's upper sides.
    add((mat) => torus(0.34, 0.04, 24, mat), DARK, 0.5);
    for (const side of [-1, 1]) {
      const cup = add((mat) => cylinder(0.1, 0.1, 0.07, 12, mat), DARK, 0.5);
      cup.position.x = side * 0.34;
      cup.rotation.z = Math.PI / 2;
    }
  } else if (key === "tophat") {
    add((mat) => cylinder(0.34, 0.34, 0.03, 20, mat), 0x161616, 0.92);
    add((mat) => cylinder(0.22, 0.22, 0.4, 16, mat), 0x161616, 1.13);
    add((mat) => cylinder(0.225, 0.225, 0.07, 16, mat), 0x8e2330, 0.99);
  } else if (key === "antenna") {
    add((mat) => cylinder(0.018, 0.018, 0.32, 8, mat), 0x444444, 1.0);
    add((mat) => sphere(0.07, 10, mat), 0x6bff5a, 1.18, { basic: true });
  } else if (key === "wizard") {
    add((mat) => cylinder(0.36, 0.36, 0.03, 20, mat), 0x5b2d91, 0.92);
    add((mat) => cone(0.24, 0.65, 16, mat), 0x5b2d91, 1.27);
    add((mat) => cylinder(0.245, 0.245, 0.06, 16, mat), 0xd4a017, 0.97);
  } else {
    return null;
  }
  return root;
}

export function disposeHat(hat: TransformNode): void {
  hat.traverse((o) => {
    const m = o as Mesh;
    m.dispose?.(true, false);
    if (m.material) disposeMaterial(m.material as StandardMaterial);
  });
}

/** Face-pattern materials from a catalog texture path. Resolves to null on a
 *  missing/404 asset so the caller falls back to the body colour. */
export async function makeFacePatternMaterials(
  url: string,
): Promise<StandardMaterial[] | null> {
  try {
    return await makeAvatarMaterials(url);
  } catch {
    return null;
  }
}

export function disposeMaterial(m: StandardMaterial | StandardMaterial[]): void {
  const list = Array.isArray(m) ? m : [m];
  const seen = new Set<StandardMaterial>();
  for (const x of list) {
    if (seen.has(x)) continue;
    seen.add(x);
    x.diffuseTexture?.dispose();
    x.dispose();
  }
}

/** Wire a MediaStream to a video element + VideoTexture, returning the
 *  resulting face-material list. Callers replace mesh.material with this. */
export function makeVideoMaterials(
  stream: MediaStream, existing: HTMLVideoElement | null, sideColor: Color3,
): { mats: StandardMaterial[]; video: HTMLVideoElement; tex: VideoTexture } {
  const video = existing ?? document.createElement("video");
  if (!existing) {
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
  }
  video.srcObject = stream;
  video.play().catch(() => { /* autoplay-muted is allowed */ });
  const tex = new VideoTexture("remoteVideo", video, activeScene(), false, true);
  const front = lambertMaterial(Color3.White());
  front.diffuseTexture = tex;
  const mats = makeFaceMaterials(front, sideColor);
  return { mats, video, tex };
}
