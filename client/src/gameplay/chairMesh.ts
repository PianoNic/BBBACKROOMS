/** Shared chair geometry/builder used by Chairs (world chairs +
 *  in-hand mesh + in-flight projectile). Geometry constants are reused
 *  across all chair instances so the static merger can collapse them. */
import * as THREE from "three";
import { materials } from "../rendering/materials";

const G = {
  seat: new THREE.BoxGeometry(0.5, 0.05, 0.5),
  back: new THREE.BoxGeometry(0.5, 0.4, 0.04),
  leg: new THREE.BoxGeometry(0.04, 0.4, 0.04),
};

export function buildChairMesh(): THREE.Group {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(G.seat, materials.deskWood);
  seat.position.y = 0.4225;
  g.add(seat);
  const back = new THREE.Mesh(G.back, materials.deskWood);
  back.position.set(0, 0.65, -0.23);
  g.add(back);
  for (const [dx, dz] of [
    [0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22],
  ] as const) {
    const leg = new THREE.Mesh(G.leg, materials.deskLeg);
    leg.position.set(dx, 0.2, dz);
    g.add(leg);
  }
  return g;
}
