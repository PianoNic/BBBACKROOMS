/** Closet hideouts — interact targets for the hide-in-closet mechanic.
 *  Pure position data from the world props; all rules (occupancy, the
 *  "a teacher sees you" check) are server-side. */
import type { Prop } from "../net/protocol";
import type { InteractTarget } from "../ui/interactPrompt";

const HIDE_RADIUS = 2.2;

export class Hideouts {
  private readonly spots: { x: number; z: number }[];

  constructor(props: Prop[]) {
    this.spots = props
      .filter((p) => p.type === "closet")
      .map((p) => ({ x: p.x, z: p.z }));
  }

  getInteractTargets(): InteractTarget[] {
    return this.spots.map((s) => ({
      x: s.x, z: s.z, radius: HIDE_RADIUS,
      label: "hide", kind: "hide" as const,
      anchorX: s.x, anchorY: 1.5, anchorZ: s.z,
    }));
  }
}
