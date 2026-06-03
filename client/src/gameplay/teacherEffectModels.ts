/** Small Three.js mesh factories for thrown teacher-ability projectiles
 *  (balls, lawbooks, acid flasks). Each returns an Object3D plus a
 *  matching dispose() so the owning class can free GPU resources. */
import * as THREE from "three";

const LAWBOOK_TEX = new THREE.TextureLoader().load("/projectiles/lawbook.jpg");

export type Projectile = { obj: THREE.Object3D; dispose: () => void };

export function buildBall(
  color: number, radius: number, withSeams = false,
): Projectile {
  const mat = new THREE.MeshLambertMaterial({ color });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), mat);
  const disposes: (() => void)[] = [() => mat.dispose()];
  if (withSeams) {
    // Basketball — two crossed black rings to suggest panel seams.
    const seamMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const ringGeo = new THREE.TorusGeometry(radius * 1.01, radius * 0.04, 6, 24);
    const ringA = new THREE.Mesh(ringGeo, seamMat);
    const ringB = new THREE.Mesh(ringGeo, seamMat);
    ringB.rotation.y = Math.PI / 2;
    sphere.add(ringA, ringB);
    disposes.push(() => seamMat.dispose(), () => ringGeo.dispose());
  }
  return { obj: sphere, dispose: () => disposes.forEach((f) => f()) };
}

export function buildLawbook(): Projectile {
  const mat = new THREE.SpriteMaterial({ map: LAWBOOK_TEX, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.6, 0.8, 1);
  return { obj: sprite, dispose: () => mat.dispose() };
}

export function buildFlask(): Projectile {
  // Tiny conical flask: glass body + dark stopper + a glowing acid sphere.
  const g = new THREE.Group();
  const glassMat = new THREE.MeshLambertMaterial({
    color: 0x6fcf3a, transparent: true, opacity: 0.85,
  });
  const corkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a1f });
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xc8ff8a, transparent: true, opacity: 0.45,
  });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 12), glassMat);
  body.rotation.x = Math.PI; // tip-down so the stopper sits up top
  body.position.y = 0.0;
  g.add(body);
  const stopper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), corkMat,
  );
  stopper.position.y = 0.17;
  g.add(stopper);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), haloMat);
  g.add(halo);
  return {
    obj: g,
    dispose: () => { glassMat.dispose(); corkMat.dispose(); haloMat.dispose(); },
  };
}

export function buildScissors(): Projectile {
  // Two crossed silver blades + tiny dark handles.
  const g = new THREE.Group();
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0xd0d4dc });
  const handleMat = new THREE.MeshLambertMaterial({ color: 0x222226 });
  const bladeGeo = new THREE.BoxGeometry(0.04, 0.18, 0.01);
  const handleGeo = new THREE.TorusGeometry(0.04, 0.012, 6, 12);
  for (const side of [-1, 1]) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.x = 0.02 * side;
    blade.rotation.z = 0.18 * side;
    g.add(blade);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.05 * side, -0.10, 0);
    g.add(handle);
  }
  return {
    obj: g,
    dispose: () => {
      bladeMat.dispose(); handleMat.dispose();
      bladeGeo.dispose(); handleGeo.dispose();
    },
  };
}

export function buildPlate(): Projectile {
  // White ceramic disc.
  const mat = new THREE.MeshLambertMaterial({ color: 0xf2eee5 });
  const geo = new THREE.CylinderGeometry(0.14, 0.14, 0.012, 16);
  const disc = new THREE.Mesh(geo, mat);
  disc.rotation.x = Math.PI / 2;
  return { obj: disc, dispose: () => { mat.dispose(); geo.dispose(); } };
}

export function buildWrench(): Projectile {
  // Heavy chrome wrench: shaft + jaw.
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x9aa0a8 });
  const shaftGeo = new THREE.BoxGeometry(0.04, 0.24, 0.025);
  const jawGeo = new THREE.BoxGeometry(0.10, 0.06, 0.025);
  const shaft = new THREE.Mesh(shaftGeo, mat);
  g.add(shaft);
  const jaw = new THREE.Mesh(jawGeo, mat);
  jaw.position.y = 0.13;
  g.add(jaw);
  return {
    obj: g,
    dispose: () => { mat.dispose(); shaftGeo.dispose(); jawGeo.dispose(); },
  };
}

export function buildBowl(color: number): Projectile {
  // Half-sphere bowl (soup or oil) — used for soup_splash / oil_slick.
  const liquidMat = new THREE.MeshLambertMaterial({
    color, transparent: true, opacity: 0.85,
  });
  const bowlMat = new THREE.MeshLambertMaterial({ color: 0x33332e });
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    bowlMat,
  );
  g.add(bowl);
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), liquidMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.001;
  g.add(top);
  return {
    obj: g,
    dispose: () => { liquidMat.dispose(); bowlMat.dispose(); },
  };
}
