import type { InteractTarget } from "../ui/interactPrompt";
import type { Mesh, TransformNode } from "../rendering/babylon";
import { Color3, box, group, lambertMaterial } from "../rendering/babylon";
import type { EquippedCosmetics } from "../net/protocol";
import { bodyColor } from "./cosmeticStyle";
import { resolveCosmetic } from "./cosmetics";
import { buildHat, disposeHat } from "./remotePlayerMaterials";

const REVIVE_RADIUS = 2.2;
const HEAD_X = 0.7;
const HAT_BASE_Y = 0.85;

type Entry = {
  id: string; x: number; z: number; mesh: Mesh; hat: TransformNode | null;
};

/** Tracks downed-player markers. Each corpse keeps its server id so the
 *  interact prompt can target a specific revive. */
export class Corpses {
  readonly group = group("corpses");
  private readonly entries = new Map<string, Entry>();

  add(
    id: string, x: number, z: number, color: string,
    equipped: EquippedCosmetics = {},
  ): void {
    if (this.entries.has(id)) return;
    const mat = lambertMaterial(Color3.FromHexString(bodyColor(equipped, color)));
    const mesh = box(1.6, 0.5, 0.6, mat);
    mesh.position.set(x, 0.25, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.group.add(mesh);

    let hat: TransformNode | null = null;
    const hatKey = resolveCosmetic(equipped.hat)?.assetRef;
    if (hatKey) {
      hat = buildHat(hatKey);
      if (hat) {
        hat.rotation.z = -Math.PI / 2;
        hat.position.set(HEAD_X - HAT_BASE_Y, 0.15, 0);
        mesh.add(hat);
      }
    }

    this.entries.set(id, { id, x, z, mesh, hat });
  }

  remove(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    if (e.hat) disposeHat(e.hat);
    this.group.remove(e.mesh);
    e.mesh.dispose(false, true);
    this.entries.delete(id);
  }

  /** Targets for [E] revive — caller must check that medkit count > 0. */
  getInteractTargets(enabled: boolean): InteractTarget[] {
    if (!enabled || this.entries.size === 0) return [];
    const out: InteractTarget[] = [];
    for (const e of this.entries.values()) {
      out.push({
        x: e.x, z: e.z, radius: REVIVE_RADIUS,
        label: "hold E: revive", kind: "corpse", corpseId: e.id,
        anchorX: e.x, anchorY: 1.0, anchorZ: e.z,
      });
    }
    return out;
  }
}
