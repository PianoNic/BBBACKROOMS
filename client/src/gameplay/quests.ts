import type { ItemType, Objective } from "../net/protocol";
import { SPOT_BASE_Y, buildSpot, type SpotVisuals } from "./questSpot";
import * as THREE from "three";

function labelForItem(item: ItemType | null): string {
  if (item === "sponge") return "wipe";
  if (item === "eye") return "inspect";
  return "interact";
}

type Entry = { obj: Objective; spots: SpotVisuals[] };
export type QuestInteractTarget = {
  x: number; z: number; radius: number; label: string; kind: "quest";
  anchorX?: number; anchorY?: number; anchorZ?: number;
};

export class Quests {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();
  private readonly listeners = new Set<() => void>();

  constructor(initial: Objective[]) {
    for (const o of initial) {
      const spots: SpotVisuals[] = [];
      for (const s of o.spots) spots.push(buildSpot(o, s, this.group));
      this.entries.set(o.id, { obj: structuredClone(o), spots });
    }
  }

  onChange(fn: () => void): void { this.listeners.add(fn); }

  completeSpot(id: string, spotIdx: number): void {
    const e = this.entries.get(id);
    if (!e) return;
    const sObj = e.obj.spots[spotIdx];
    const vis = e.spots[spotIdx];
    if (!sObj || sObj.done) return;
    sObj.done = true;
    vis.marker.visible = false;
    if (vis.extra) vis.extra.visible = false;
    for (const fn of this.listeners) fn();
  }

  /** Re-open a previously-completed spot (server relocked it via a teacher
   *  ability). Find by tag rather than index since the relock packet only
   *  carries the spot's tag. */
  relockSpot(id: string, tag: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    const idx = e.obj.spots.findIndex((s) => s.tag === tag);
    if (idx < 0) return;
    const sObj = e.obj.spots[idx];
    const vis = e.spots[idx];
    if (!sObj.done) return;
    sObj.done = false;
    e.obj.done = false;
    vis.marker.visible = true;
    if (vis.extra) vis.extra.visible = true;
    for (const fn of this.listeners) fn();
  }

  complete(id: string): void {
    const e = this.entries.get(id);
    if (!e || e.obj.done) return;
    e.obj.done = true;
    for (let i = 0; i < e.obj.spots.length; i++) {
      e.obj.spots[i].done = true;
      e.spots[i].marker.visible = false;
      if (e.spots[i].extra) e.spots[i].extra!.visible = false;
    }
    for (const fn of this.listeners) fn();
  }

  list(): Objective[] { return [...this.entries.values()].map((e) => e.obj); }

  /** World positions of every undone task spot — used by the tracker item
   *  to paint dots on the minimap. */
  getMapPositions(): { x: number; z: number }[] {
    const out: { x: number; z: number }[] = [];
    for (const e of this.entries.values()) {
      if (e.obj.done) continue;
      for (const s of e.obj.spots) {
        if (s.done) continue;
        out.push({ x: s.x, z: s.z });
      }
    }
    return out;
  }

  doneCount(): number {
    let n = 0;
    for (const e of this.entries.values()) if (e.obj.done) n++;
    return n;
  }
  total(): number { return this.entries.size; }

  getInteractTargets(): QuestInteractTarget[] {
    const out: QuestInteractTarget[] = [];
    for (const e of this.entries.values()) {
      if (!e.obj.interact || e.obj.done) continue;
      const label = labelForItem(e.obj.item);
      for (const s of e.obj.spots) {
        if (s.done) continue;
        out.push({
          x: s.x, z: s.z, radius: e.obj.radius, label, kind: "quest",
          anchorX: s.anchor_x ?? undefined,
          anchorY: s.anchor_y ?? undefined,
          anchorZ: s.anchor_z ?? undefined,
        });
      }
    }
    return out;
  }

  update(elapsed: number): void {
    for (const e of this.entries.values()) {
      for (const v of e.spots) {
        if (!v.marker.visible) continue;
        if (v.marker.userData.spinning !== false) {
          v.marker.rotation.y = elapsed * 1.0 + v.bobSeed;
        }
        const baseY = (v.marker.userData.baseY as number) ?? SPOT_BASE_Y;
        v.marker.position.y = baseY + Math.sin(elapsed * 2 + v.bobSeed) * 0.08;
      }
    }
  }
}
