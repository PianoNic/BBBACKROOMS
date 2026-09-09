import type { InteractTarget } from "../ui/interactPrompt";
import type { Mesh } from "../rendering/babylon";
import { Color3, box, group, lambertMaterial } from "../rendering/babylon";

const REVIVE_RADIUS = 2.2;

type Entry = { id: string; x: number; z: number; mesh: Mesh };

/** Tracks downed-player markers. Each corpse keeps its server id so the
 *  interact prompt can target a specific revive. */
export class Corpses {
  readonly group = group("corpses");
  private readonly entries = new Map<string, Entry>();

  add(id: string, x: number, z: number, color: string): void {
    if (this.entries.has(id)) return;
    const mat = lambertMaterial(Color3.FromHexString(color));
    const mesh = box(1.6, 0.5, 0.6, mat);
    mesh.position.set(x, 0.25, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.group.add(mesh);
    this.entries.set(id, { id, x, z, mesh });
  }

  remove(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
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
