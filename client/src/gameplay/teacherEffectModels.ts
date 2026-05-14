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
