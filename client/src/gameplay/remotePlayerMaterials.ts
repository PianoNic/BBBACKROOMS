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
