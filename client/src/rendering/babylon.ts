import type { Node } from "@babylonjs/core/node";
import type { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { CreateIcoSphere } from "@babylonjs/core/Meshes/Builders/icoSphereBuilder";
import { CreatePolyhedron } from "@babylonjs/core/Meshes/Builders/polyhedronBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Material } from "@babylonjs/core/Materials/material";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";
import { AMBIENCE } from "./ambience";
import { invalidateActiveMeshes } from "./activeMeshes";

declare module "@babylonjs/core/Meshes/transformNode" {
  interface TransformNode {
    add(...children: Node[]): this;
    remove(...children: Node[]): this;
    clear(): this;
    traverse(visit: (node: Node) => void): void;
    visible: boolean;
  }
}

TransformNode.prototype.add = function add(this: TransformNode, ...children: Node[]) {
  for (const c of children) c.parent = this;
  return this;
};

TransformNode.prototype.remove = function remove(this: TransformNode, ...children: Node[]) {
  for (const c of children) {
    if (c.parent === this) c.parent = null;
  }
  return this;
};

TransformNode.prototype.clear = function clear(this: TransformNode) {
  for (const c of this.getChildren()) c.parent = null;
  return this;
};

TransformNode.prototype.traverse = function traverse(
  this: TransformNode, visit: (node: Node) => void,
) {
  visit(this);
  for (const c of this.getDescendants(false)) visit(c);
};

Object.defineProperty(TransformNode.prototype, "visible", {
  configurable: true,
  get(this: TransformNode): boolean { return this.isEnabled(false); },
  set(this: TransformNode, v: boolean) {
    if (this.isEnabled(false) === v) return;
    this.setEnabled(v);
    invalidateActiveMeshes();
  },
});

let current: Scene | null = null;

export function setActiveScene(scene: Scene): void {
  current = scene;
}

export function activeScene(): Scene {
  if (!current) throw new Error("no active Babylon scene");
  return current;
}

export function withScene<T>(scene: Scene, fn: () => T): T {
  const prev = current;
  current = scene;
  try {
    return fn();
  } finally {
    current = prev;
  }
}

export class Group extends TransformNode {
  constructor(name = "group", scene: Scene = activeScene()) {
    super(name, scene, true);
  }
}

export function group(name = "group"): Group {
  return new Group(name);
}

function finish(mesh: Mesh, mat: Material | null | undefined): Mesh {
  if (mat) mesh.material = mat;
  mesh.isPickable = false;
  return mesh;
}

export function box(
  w: number, h: number, d: number, mat?: Material | null, name = "box",
): Mesh {
  return finish(
    CreateBox(name, { width: w, height: h, depth: d }, activeScene()), mat,
  );
}

export function cylinder(
  radiusTop: number, radiusBottom: number, height: number,
  segments = 12, mat?: Material | null, name = "cyl",
): Mesh {
  return finish(CreateCylinder(name, {
    diameterTop: radiusTop * 2, diameterBottom: radiusBottom * 2,
    height, tessellation: segments,
  }, activeScene()), mat);
}

export function cone(
  radius: number, height: number, segments = 12,
  mat?: Material | null, name = "cone",
): Mesh {
  return cylinder(0, radius, height, segments, mat, name);
}

export function plane(
  w: number, h: number, mat?: Material | null,
  doubleSided = false, name = "plane",
): Mesh {
  const mesh = CreatePlane(name, {
    width: w, height: h,
    sideOrientation: doubleSided ? Mesh.DOUBLESIDE : Mesh.BACKSIDE,
  }, activeScene());
  return finish(mesh, mat);
}

export function disc(
  radius: number, segments = 24, mat?: Material | null,
  doubleSided = false, name = "disc",
): Mesh {
  const mesh = CreateDisc(name, {
    radius, tessellation: segments,
    sideOrientation: doubleSided ? Mesh.DOUBLESIDE : Mesh.BACKSIDE,
  }, activeScene());
  return finish(mesh, mat);
}

export function ring(
  innerRadius: number, outerRadius: number, segments = 24,
  mat?: Material | null, doubleSided = false, name = "ring",
): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    positions.push(c * innerRadius, s * innerRadius, 0);
    positions.push(c * outerRadius, s * outerRadius, 0);
    normals.push(0, 0, 1, 0, 0, 1);
    uvs.push(i / segments, 0, i / segments, 1);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
  }
  const mesh = new Mesh(name, activeScene());
  const data = new VertexData();
  data.positions = positions;
  data.normals = normals;
  data.uvs = uvs;
  data.indices = indices;
  data.applyToMesh(mesh);
  if (doubleSided) mesh.sideOrientation = Mesh.DOUBLESIDE;
  return finish(mesh, mat);
}

export function sphere(
  radius: number, segments = 16, mat?: Material | null, name = "sphere",
): Mesh {
  return finish(CreateSphere(name, {
    diameter: radius * 2, segments,
  }, activeScene()), mat);
}

export function torus(
  radius: number, tube: number, segments = 16,
  mat?: Material | null, name = "torus",
): Mesh {
  const mesh = CreateTorus(name, {
    diameter: radius * 2, thickness: tube * 2, tessellation: segments,
  }, activeScene());
  mesh.bakeTransformIntoVertices(Matrix.RotationX(Math.PI / 2));
  return finish(mesh, mat);
}

const ICO_RADIUS = 0.8506508083520399;

export function icosahedron(
  radius: number, mat?: Material | null, name = "ico",
): Mesh {
  return finish(CreateIcoSphere(name, {
    radius: radius / ICO_RADIUS, subdivisions: 1, flat: true,
  }, activeScene()), mat);
}

export function octahedron(
  radius: number, mat?: Material | null, name = "octa",
): Mesh {
  return finish(CreatePolyhedron(name, {
    type: 1, size: radius / Math.SQRT2,
  }, activeScene()), mat);
}

export function color3(hex: number): Color3 {
  return new Color3(
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  );
}

export function lambertMaterial(
  color: Color3 | number, name = "lambert", scene: Scene = activeScene(),
): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = typeof color === "number" ? color3(color) : color;
  mat.specularColor = color3(AMBIENCE.surfaces.propSpecularColor);
  mat.specularPower = AMBIENCE.surfaces.propSpecularPower;
  mat.maxSimultaneousLights = 1;
  return mat;
}

export function basicMaterial(
  color: Color3 | number, name = "basic", scene: Scene = activeScene(),
): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.emissiveColor = typeof color === "number" ? color3(color) : color;
  mat.disableLighting = true;
  return mat;
}

/** Caches are per scene: a Babylon material belongs to the scene it was
 *  created in, and the tutorial item viewer builds the very same models in
 *  its own throwaway scene. Sharing one cache across both would hand a
 *  preview mesh a material from the game scene. */
function sceneCache(
  store: WeakMap<Scene, Map<number, StandardMaterial>>,
): Map<number, StandardMaterial> {
  const scene = activeScene();
  let byColor = store.get(scene);
  if (!byColor) {
    byColor = new Map();
    store.set(scene, byColor);
  }
  return byColor;
}

const LAMBERT_CACHE = new WeakMap<Scene, Map<number, StandardMaterial>>();

export function M(color: number): StandardMaterial {
  const byColor = sceneCache(LAMBERT_CACHE);
  let mat = byColor.get(color);
  if (!mat) {
    mat = lambertMaterial(color, `lambert_${color.toString(16)}`);
    byColor.set(color, mat);
  }
  return mat;
}

const BASIC_CACHE = new WeakMap<Scene, Map<number, StandardMaterial>>();

export function Basic(color: number): StandardMaterial {
  const byColor = sceneCache(BASIC_CACHE);
  let mat = byColor.get(color);
  if (!mat) {
    mat = basicMaterial(color, `basic_${color.toString(16)}`);
    byColor.set(color, mat);
  }
  return mat;
}

/** In a right-handed scene a Babylon `TargetCamera` ends up with the same
 *  basis three.js used — local -Z forward, +X right, positive pitch up —
 *  so the game's yaw/pitch pair maps straight onto `rotation`. */
export function setCameraOrientation(
  camera: TargetCamera, yaw: number, pitch: number,
): void {
  camera.rotation.set(pitch, yaw, 0);
}

/** World-space view direction for a yaw/pitch pair, matching what
 *  `THREE.Camera.getWorldDirection` returned for the same angles. */
export function cameraForward(
  yaw: number, pitch: number, out = new Vector3(),
): Vector3 {
  const cp = Math.cos(pitch);
  out.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
  return out;
}

/** View direction read straight off the camera's view matrix, so it stays
 *  correct however the camera was oriented (yaw/pitch or `setTarget`). */
export function viewForward(camera: TargetCamera, out = new Vector3()): Vector3 {
  const m = camera.getViewMatrix().m;
  out.set(-m[2], -m[6], -m[10]);
  return out;
}

export function setEulerXYZ(
  node: TransformNode, x: number, y: number, z: number,
): void {
  node.rotationQuaternion = Quaternion.FromRotationMatrix(
    Matrix.RotationZ(z).multiply(Matrix.RotationY(y)).multiply(Matrix.RotationX(x)),
  );
}

export { Mesh, TransformNode, StandardMaterial, Color3 };
