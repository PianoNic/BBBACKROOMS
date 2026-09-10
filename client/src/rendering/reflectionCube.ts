import { RawCubeTexture } from "@babylonjs/core/Materials/Textures/rawCubeTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Constants } from "@babylonjs/core/Engines/constants";
import { activeScene } from "./babylon";

const FACE_SIZE = 16;
const TOP_COLOR: [number, number, number] = [46, 58, 48];
const SIDE_COLOR: [number, number, number] = [10, 13, 11];
const BOTTOM_COLOR: [number, number, number] = [4, 5, 4];
const SHEEN_LEVEL = 0.16;

function paintFace(color: [number, number, number]): Uint8Array {
  const canvas = document.createElement("canvas");
  canvas.width = FACE_SIZE;
  canvas.height = FACE_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE);
  const { data } = ctx.getImageData(0, 0, FACE_SIZE, FACE_SIZE);
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

let cached: RawCubeTexture | null = null;

export function getFloorSheenTexture(): RawCubeTexture {
  if (cached) return cached;
  const faces = [
    SIDE_COLOR, SIDE_COLOR, TOP_COLOR, BOTTOM_COLOR, SIDE_COLOR, SIDE_COLOR,
  ].map(paintFace);
  const tex = new RawCubeTexture(
    activeScene(), faces, FACE_SIZE,
    Constants.TEXTUREFORMAT_RGBA, Constants.TEXTURETYPE_UNSIGNED_BYTE,
    false, false, Texture.BILINEAR_SAMPLINGMODE,
  );
  tex.coordinatesMode = Texture.CUBIC_MODE;
  tex.level = SHEEN_LEVEL;
  cached = tex;
  return cached;
}
