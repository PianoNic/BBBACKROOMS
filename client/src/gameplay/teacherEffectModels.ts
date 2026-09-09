/** Small Babylon.js mesh factories for thrown teacher-ability projectiles
 *  (balls, lawbooks, acid flasks). Each returns a TransformNode plus a
 *  matching dispose() so the owning class can free GPU resources. */
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import {
  activeScene, basicMaterial, box, cone, cylinder, disc, group, lambertMaterial,
  plane, sphere, torus,
} from "../rendering/babylon";

export type Projectile = { obj: TransformNode; dispose: () => void };

export function buildBall(
  color: number, radius: number, withSeams = false,
): Projectile {
  const mat = lambertMaterial(color);
  const sphereMesh = sphere(radius, 14, mat);
  const disposes: (() => void)[] = [() => mat.dispose()];
  if (withSeams) {
    // Basketball — two crossed black rings to suggest panel seams.
    const seamMat = basicMaterial(0x1a1a1a);
    const ringA = torus(radius * 1.01, radius * 0.04, 24, seamMat);
    const ringB = torus(radius * 1.01, radius * 0.04, 24, seamMat);
    ringB.rotation.y = Math.PI / 2;
    sphereMesh.add(ringA, ringB);
    disposes.push(
      () => seamMat.dispose(),
      () => ringA.dispose(false, false),
      () => ringB.dispose(false, false),
    );
  }
  return { obj: sphereMesh, dispose: () => disposes.forEach((f) => f()) };
}

let lawbookTex: Texture | null = null;
function getLawbookTexture(): Texture {
  if (!lawbookTex) lawbookTex = new Texture("/projectiles/lawbook.jpg", activeScene());
  return lawbookTex;
}

export function buildLawbook(): Projectile {
  const tex = getLawbookTexture();
  const mat = new StandardMaterial("lawbook", activeScene());
  mat.diffuseTexture = tex;
  tex.hasAlpha = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.emissiveTexture = tex;
  mat.emissiveColor = Color3.White();
  mat.diffuseColor = Color3.Black();
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  const mesh = plane(0.6, 0.8, mat);
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  return { obj: mesh, dispose: () => mat.dispose() };
}

export function buildFlask(): Projectile {
  // Tiny conical flask: glass body + dark stopper + a glowing acid sphere.
  const g = group("flask");
  const glassMat = lambertMaterial(0x6fcf3a);
  glassMat.alpha = 0.85;
  const corkMat = lambertMaterial(0x6b4a1f);
  const haloMat = basicMaterial(0xc8ff8a);
  haloMat.alpha = 0.45;
  const body = cone(0.14, 0.28, 12, glassMat);
  body.rotation.x = Math.PI; // tip-down so the stopper sits up top
  body.position.y = 0.0;
  g.add(body);
  const stopper = cylinder(0.05, 0.05, 0.06, 10, corkMat);
  stopper.position.y = 0.17;
  g.add(stopper);
  const halo = sphere(0.18, 12, haloMat);
  g.add(halo);
  return {
    obj: g,
    dispose: () => { glassMat.dispose(); corkMat.dispose(); haloMat.dispose(); },
  };
}

export function buildScissors(): Projectile {
  // Two crossed silver blades + tiny dark handles.
  const g = group("scissors");
  const bladeMat = lambertMaterial(0xd0d4dc);
  const handleMat = lambertMaterial(0x222226);
  const blades: Mesh[] = [];
  const handles: Mesh[] = [];
  for (const side of [-1, 1]) {
    const blade = box(0.04, 0.18, 0.01, bladeMat);
    blade.position.x = 0.02 * side;
    blade.rotation.z = 0.18 * side;
    g.add(blade);
    blades.push(blade);
    const handle = torus(0.04, 0.012, 12, handleMat);
    handle.position.set(0.05 * side, -0.10, 0);
    g.add(handle);
    handles.push(handle);
  }
  return {
    obj: g,
    dispose: () => {
      bladeMat.dispose(); handleMat.dispose();
      for (const b of blades) b.dispose(false, false);
      for (const h of handles) h.dispose(false, false);
    },
  };
}

export function buildPlate(): Projectile {
  // White ceramic disc.
  const mat = lambertMaterial(0xf2eee5);
  const plateMesh = cylinder(0.14, 0.14, 0.012, 16, mat);
  plateMesh.rotation.x = Math.PI / 2;
  return { obj: plateMesh, dispose: () => { mat.dispose(); plateMesh.dispose(false, false); } };
}

export function buildWrench(): Projectile {
  // Heavy chrome wrench: shaft + jaw.
  const g = group("wrench");
  const mat = lambertMaterial(0x9aa0a8);
  const shaft = box(0.04, 0.24, 0.025, mat);
  g.add(shaft);
  const jaw = box(0.10, 0.06, 0.025, mat);
  jaw.position.y = 0.13;
  g.add(jaw);
  return {
    obj: g,
    dispose: () => {
      mat.dispose();
      shaft.dispose(false, false);
      jaw.dispose(false, false);
    },
  };
}

export function buildBowl(color: number): Projectile {
  // Half-sphere bowl (soup or oil) — used for soup_splash / oil_slick.
  const liquidMat = lambertMaterial(color);
  liquidMat.alpha = 0.85;
  const bowlMat = lambertMaterial(0x33332e);
  const g = group("bowl");
  const bowlMesh = CreateSphere("bowl", { diameter: 0.28, segments: 14, slice: 0.5 }, activeScene());
  bowlMesh.rotation.x = Math.PI;
  bowlMesh.material = bowlMat;
  bowlMesh.isPickable = false;
  g.add(bowlMesh);
  const top = disc(0.13, 16, liquidMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.001;
  g.add(top);
  return {
    obj: g,
    dispose: () => { liquidMat.dispose(); bowlMat.dispose(); },
  };
}
