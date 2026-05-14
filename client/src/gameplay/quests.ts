import * as THREE from "three";
import type { ItemType, Objective, Spot } from "../net/protocol";
import { buildItemModel } from "./itemModels";
import { buildWhiteboardDoodle } from "./whiteboardDoodle";

const Y = 1.1;
const CASINO_Y = 2.05; // arrow floats higher above the laptop

function labelForItem(item: ItemType | null): string {
  if (item === "sponge") return "wipe";
  if (item === "eye") return "inspect";
  return "interact";
}

type SpotVisuals = {
  marker: THREE.Object3D;
  bobSeed: number;
  extra?: THREE.Object3D;
};

type Entry = { obj: Objective; spots: SpotVisuals[] };

export class Quests {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();
  private readonly listeners = new Set<() => void>();

  constructor(initial: Objective[]) {
    for (const o of initial) {
      const spots: SpotVisuals[] = [];
      for (const s of o.spots) {
        spots.push(this.buildSpot(o, s));
      }
      this.entries.set(o.id, { obj: structuredClone(o), spots });
    }
  }

  private buildSpot(o: Objective, s: Spot): SpotVisuals {
    // floating marker
    const isArrow = !o.item; // casino spots have no item — show a "look down here" arrow
    const inner = o.item ? buildItemModel(o.item) : this.downArrow();
    if (!isArrow) {
      // Other items lie flat so they read from above; the magnifying glass
      // stands upright facing the camera.
      if (o.item !== "eye") inner.rotation.x = Math.PI / 2;
      inner.scale.setScalar(1.7);
    }
    const marker = new THREE.Group();
    marker.add(inner);
    let baseY = isArrow ? CASINO_Y : Y;
    let mx = s.x;
    let mz = s.z;
    // Inspect markers hover right in front of the painting itself.
    if (o.item === "eye" && s.anchor_x != null && s.anchor_z != null) {
      const back = 0.25;
      mx = s.anchor_x - Math.sin(s.yaw) * back;
      mz = s.anchor_z - Math.cos(s.yaw) * back;
      baseY = s.anchor_y ?? 1.7;
      marker.rotation.y = s.yaw + Math.PI;
    }
    marker.position.set(mx, baseY, mz);
    marker.userData.baseY = baseY;
    marker.userData.spinning = true;
    marker.visible = !s.done;
    this.group.add(marker);

    // doodle drawing on the whiteboard face for wipe-quest spots
    let extra: THREE.Object3D | undefined;
    if (o.item === "sponge") {
      const doodle = buildWhiteboardDoodle();
      // spot is 0.9m in front of the whiteboard along forward = (sin yaw, cos yaw).
      // The face sits ~0.1m in front of the prop centre; place doodle just in front of face.
      const back = 0.78;
      doodle.position.set(s.x - Math.sin(s.yaw) * back, 1.6, s.z - Math.cos(s.yaw) * back);
      doodle.rotation.y = s.yaw + Math.PI; // face the player (away from wall)
      doodle.visible = !s.done;
      this.group.add(doodle);
      extra = doodle;
    }

    return { marker, bobSeed: Math.random() * 10, extra };
  }

  private downArrow(): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe66b });
    // Shaft on top.
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), mat);
    shaft.position.y = 0.18;
    g.add(shaft);
    // Cone arrowhead pointing down (ConeGeometry tip is at +Y by default → rotate π).
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.36, 4), mat);
    head.rotation.x = Math.PI;
    head.position.y = -0.18;
    g.add(head);
    return g;
  }

  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

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

  list(): Objective[] {
    return [...this.entries.values()].map((e) => e.obj);
  }

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

  total(): number {
    return this.entries.size;
  }

  getInteractTargets(): {
    x: number; z: number; radius: number; label: string; kind: "quest";
    anchorX?: number; anchorY?: number; anchorZ?: number;
  }[] {
    const out: {
      x: number; z: number; radius: number; label: string; kind: "quest";
      anchorX?: number; anchorY?: number; anchorZ?: number;
    }[] = [];
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
        const baseY = (v.marker.userData.baseY as number) ?? Y;
        v.marker.position.y = baseY + Math.sin(elapsed * 2 + v.bobSeed) * 0.08;
      }
    }
  }
}
