/** Shared chair geometry/builder used by Chairs (world chairs +
 *  in-hand mesh + in-flight projectile). Geometry constants are reused
 *  across all chair instances so the static merger can collapse them. */
import { Group, box, group } from "../rendering/babylon";
import { materials } from "../rendering/materials";

export function buildChairMesh(): Group {
  const g = group("chair");
  const seat = box(0.5, 0.05, 0.5, materials.deskWood);
  seat.position.y = 0.4225;
  g.add(seat);
  const back = box(0.5, 0.4, 0.04, materials.deskWood);
  back.position.set(0, 0.65, -0.23);
  g.add(back);
  for (const [dx, dz] of [
    [0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22],
  ] as const) {
    const leg = box(0.04, 0.4, 0.04, materials.deskLeg);
    leg.position.set(dx, 0.2, dz);
    g.add(leg);
  }
  return g;
}
