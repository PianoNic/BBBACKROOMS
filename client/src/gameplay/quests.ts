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
    // Items that stay upright (vs. lying flat for top-down read).
    // Note: "papers" needs the default rotation.x=π/2 — its geometry is
    // built as flat sheets in the XZ plane, so the rotation actually
    // stands them up vertically against the postit board.
    const upright =
      o.item === "eye" ||
      o.item === "watering_can" ||
      o.item === "sponge";
    if (!isArrow) {
      if (!upright) inner.rotation.x = Math.PI / 2;
      // Per-item scale: smaller when it sits on a wall prop, larger
      // when it floats over open space.
      const scaleByItem: Record<string, number> = {
        eye: 0.75,
        sponge: 0.9,
        papers: 0.75,
        watering_can: 1.3,
      };
      inner.scale.setScalar(scaleByItem[o.item as string] ?? 1.7);
      if (o.item === "eye") inner.rotation.x = (20 * Math.PI) / 180;
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
      baseY = (s.anchor_y ?? 1.7) + 0.25;
      marker.rotation.y = s.yaw + Math.PI;
    }
    // Watering can hovers directly above the plant.
    if (o.item === "watering_can" && s.anchor_x != null && s.anchor_z != null) {
      mx = s.anchor_x;
      mz = s.anchor_z;
      baseY = s.anchor_y ?? 1.1;
    }
    // Sponge: hover the marker right in front of the whiteboard face.
    // Compute room-direction from the prop yaw — whiteboards face local
    // -Z, so the world room-direction is rotate((0,0,-1), yaw) =
    // (-sin yaw, -cos yaw).
    if (o.item === "sponge" && s.anchor_x != null && s.anchor_z != null) {
      const forward = 0.30;
      mx = s.anchor_x - Math.sin(s.yaw) * forward;
      mz = s.anchor_z - Math.cos(s.yaw) * forward;
      baseY = 1.55;
    }
    // Bulletin board pin task: a small floating papers marker right in
    // front of the cork board (anchor_x/z = board position, with the
    // standard wall-clearance offset). The board faces local -Z (like
    // paintings) so we offset in the same direction painting anchors do.
    if (o.item === "papers" && s.anchor_x != null && s.anchor_z != null) {
      const back = 0.2;
      mx = s.anchor_x - Math.sin(s.yaw) * back;
      mz = s.anchor_z - Math.cos(s.yaw) * back;
      baseY = (s.anchor_y ?? 1.95);
      marker.rotation.y = s.yaw + Math.PI;
    }
    marker.position.set(mx, baseY, mz);
    marker.userData.baseY = baseY;
    marker.userData.spinning = true;
    marker.visible = !s.done;
    this.group.add(marker);

    // Doodle drawing on the whiteboard face for wipe-quest spots. Pin
    // it to the anchor (= whiteboard position) and offset along the
    // room-direction (-sin yaw, -cos yaw) so it always sits just in
    // front of the board's face, independent of the spot's location.
    let extra: THREE.Object3D | undefined;
    if (o.item === "sponge" && s.anchor_x != null && s.anchor_z != null) {
      const doodle = buildWhiteboardDoodle();
      const forward = 0.08;
      doodle.position.set(
        s.anchor_x - Math.sin(s.yaw) * forward,
        1.6,
        s.anchor_z - Math.cos(s.yaw) * forward,
      );
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
