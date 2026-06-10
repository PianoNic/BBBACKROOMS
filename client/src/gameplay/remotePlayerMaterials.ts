/** Material factories for the remote-player voxel cube.
 *
 *  Box face groups are (0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z, 5=-Z). A player
 *  facing yaw=0 walks toward -Z, so others see their -Z face → put avatar
 *  or video texture on FRONT_FACE; pick a complementary side colour for
 *  the other five faces so the cube isn't a flat block. */
import * as THREE from "three";

export const FRONT_FACE = 5;

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

function sampleCorner(img: HTMLImageElement): THREE.Color {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const cx = c.getContext("2d")!;
  cx.drawImage(img, img.width - 1, img.height - 1, 1, 1, 0, 0, 1, 1);
  const [r, g, b] = cx.getImageData(0, 0, 1, 1).data;
  return new THREE.Color(r / 255, g / 255, b / 255);
}

export function makeColorMaterial(
  color: THREE.ColorRepresentation,
): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) });
}

/** Box with `front` material on the player-facing face and `sideColor`
 *  on the other five faces. Shared by static avatar and live webcam. */
export function makeFaceMaterials(
  front: THREE.MeshLambertMaterial, sideColor: THREE.Color,
): THREE.MeshLambertMaterial[] {
  const side = () => new THREE.MeshLambertMaterial({ color: sideColor });
  const mats: THREE.MeshLambertMaterial[] = [
    side(), side(), side(), side(), side(), side(),
  ];
  mats[FRONT_FACE] = front;
  return mats;
}

export async function makeAvatarMaterials(
  dataUrl: string,
): Promise<THREE.MeshLambertMaterial[]> {
  const img = await loadImage(dataUrl);
  const tex = new THREE.Texture(img);
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return makeFaceMaterials(
    new THREE.MeshLambertMaterial({ map: tex }), sampleCorner(img),
  );
}

/** Procedural cosmetic hat, attached as a child of the voxel so it inherits
 *  position + yaw and survives material swaps. The cube's local top is +0.85
 *  (height 1.7, centred), so hats sit a little above that. */
export function buildHat(key: string): THREE.Object3D | null {
  const group = new THREE.Group();
  const GOLD = 0xffd24a, DARK = 0x222222, PARTY = 0xff5fa2;
  const add = (
    geom: THREE.BufferGeometry, color: number, y: number,
    opts: { basic?: boolean; double?: boolean } = {},
  ): THREE.Mesh => {
    const mat = opts.basic
      ? new THREE.MeshBasicMaterial({ color })
      : new THREE.MeshLambertMaterial({
        color, side: opts.double ? THREE.DoubleSide : THREE.FrontSide,
      });
    const m = new THREE.Mesh(geom, mat);
    m.position.y = y;
    group.add(m);
    return m;
  };

  if (key === "cone") {
    add(new THREE.ConeGeometry(0.26, 0.5, 16), PARTY, 1.12);
  } else if (key === "halo") {
    const m = add(
      new THREE.TorusGeometry(0.22, 0.045, 8, 24), GOLD, 1.18, { basic: true },
    );
    m.rotation.x = Math.PI / 2;
  } else if (key === "gradcap") {
    add(new THREE.BoxGeometry(0.55, 0.05, 0.55), DARK, 0.95);
    const tassel = add(new THREE.SphereGeometry(0.04, 8, 8), GOLD, 0.9);
    tassel.position.x = 0.22;
  } else if (key === "crown") {
    add(
      new THREE.CylinderGeometry(0.25, 0.25, 0.14, 16, 1, true), GOLD, 0.98,
      { double: true },
    );
    for (let i = 0; i < 4; i++) {
      const spike = add(new THREE.ConeGeometry(0.05, 0.12, 6), GOLD, 1.08);
      const a = (i / 4) * Math.PI * 2;
      spike.position.x = Math.cos(a) * 0.19;
      spike.position.z = Math.sin(a) * 0.19;
    }
  } else if (key === "beret") {
    const dome = add(new THREE.SphereGeometry(0.3, 16, 12), 0xc0392b, 0.92);
    dome.scale.y = 0.35;
    dome.position.x = 0.04;
    add(new THREE.SphereGeometry(0.04, 8, 8), 0x8e2330, 1.04).position.x = 0.04;
  } else if (key === "propeller") {
    add(new THREE.CylinderGeometry(0.24, 0.26, 0.12, 16), 0xe74c3c, 0.93);
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8), DARK, 1.04);
    add(new THREE.BoxGeometry(0.46, 0.02, 0.07), 0x3498db, 1.11);
    add(new THREE.BoxGeometry(0.07, 0.02, 0.46), 0xf1c40f, 1.11);
  } else if (key === "viking") {
    add(
      new THREE.CylinderGeometry(0.27, 0.27, 0.14, 16, 1, true), 0x7d7d85, 0.95,
      { double: true },
    );
    for (const side of [-1, 1]) {
      const horn = add(new THREE.ConeGeometry(0.07, 0.28, 10), 0xf3e9d2, 1.05);
      horn.position.x = side * 0.29;
      horn.rotation.z = -side * 0.85;
    }
  } else if (key === "sombrero") {
    add(new THREE.CylinderGeometry(0.45, 0.45, 0.03, 20), 0xd8a24a, 0.92);
    add(new THREE.ConeGeometry(0.2, 0.3, 16), 0xd8a24a, 1.08);
    add(new THREE.CylinderGeometry(0.205, 0.205, 0.06, 16), 0xc0392b, 0.97);
  } else if (key === "headset") {
    // Half-torus band over the head, earcups on the cube's upper sides.
    add(new THREE.TorusGeometry(0.34, 0.04, 8, 24, Math.PI), DARK, 0.5);
    for (const side of [-1, 1]) {
      const cup = add(
        new THREE.CylinderGeometry(0.1, 0.1, 0.07, 12), DARK, 0.5,
      );
      cup.position.x = side * 0.34;
      cup.rotation.z = Math.PI / 2;
    }
  } else if (key === "tophat") {
    add(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 20), 0x161616, 0.92);
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 16), 0x161616, 1.13);
    add(new THREE.CylinderGeometry(0.225, 0.225, 0.07, 16), 0x8e2330, 0.99);
  } else if (key === "antenna") {
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 8), 0x444444, 1.0);
    add(new THREE.SphereGeometry(0.07, 10, 10), 0x6bff5a, 1.18, { basic: true });
  } else if (key === "wizard") {
    add(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 20), 0x5b2d91, 0.92);
    add(new THREE.ConeGeometry(0.24, 0.65, 16), 0x5b2d91, 1.27);
    add(new THREE.CylinderGeometry(0.245, 0.245, 0.06, 16), 0xd4a017, 0.97);
  } else {
    return null;
  }
  return group;
}

export function disposeHat(hat: THREE.Object3D): void {
  hat.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    if (m.material) disposeMaterial(m.material as THREE.Material);
  });
}

/** Face-pattern materials from a catalog texture path. Resolves to null on a
 *  missing/404 asset so the caller falls back to the body colour. */
export async function makeFacePatternMaterials(
  url: string,
): Promise<THREE.MeshLambertMaterial[] | null> {
  try {
    return await makeAvatarMaterials(url);
  } catch {
    return null;
  }
}

export function disposeMaterial(m: THREE.Material | THREE.Material[]): void {
  const list = Array.isArray(m) ? m : [m];
  for (const x of list) {
    (x as THREE.MeshLambertMaterial).map?.dispose();
    x.dispose();
  }
}

/** Wire a MediaStream to a video element + VideoTexture, returning the
 *  resulting face-material list. Callers replace mesh.material with this. */
export function makeVideoMaterials(
  stream: MediaStream, existing: HTMLVideoElement | null, sideColor: THREE.Color,
): { mats: THREE.MeshLambertMaterial[]; video: HTMLVideoElement; tex: THREE.VideoTexture } {
  const video = existing ?? document.createElement("video");
  if (!existing) {
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
  }
  video.srcObject = stream;
  video.play().catch(() => { /* autoplay-muted is allowed */ });
  const tex = new THREE.VideoTexture(video);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const mats = makeFaceMaterials(
    new THREE.MeshLambertMaterial({ map: tex }), sideColor,
  );
  return { mats, video, tex };
}
