import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Group, group } from "../rendering/babylon";
import type { ModelHingeSpec } from "../world/modelProps";

export type HingeSplit = { frame: Mesh[]; leaf: Mesh[]; pivot: Vector3 };

export class ModelHinge {
  static split(meshes: readonly Mesh[], hinge: ModelHingeSpec): HingeSplit {
    const leaf: Mesh[] = [];
    const frame: Mesh[] = [];
    for (const mesh of meshes) {
      if (mesh.name.includes(hinge.node)) leaf.push(mesh);
      else frame.push(mesh);
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const mesh of leaf) {
      mesh.refreshBoundingInfo();
      const b = mesh.getBoundingInfo().boundingBox;
      minX = Math.min(minX, b.minimumWorld.x);
      maxX = Math.max(maxX, b.maximumWorld.x);
      minY = Math.min(minY, b.minimumWorld.y);
      minZ = Math.min(minZ, b.minimumWorld.z);
      maxZ = Math.max(maxZ, b.maximumWorld.z);
    }

    const pivot = new Vector3(
      hinge.side === "left" ? minX : maxX,
      minY,
      (minZ + maxZ) / 2,
    );

    return { frame, leaf, pivot };
  }

  private readonly pivotNode: Group;
  private readonly sign: number;
  private readonly openRad: number;

  constructor(hinge: ModelHingeSpec, split: HingeSplit, parent: TransformNode) {
    this.sign = hinge.side === "left" ? 1 : -1;
    this.openRad = hinge.openRad;
    this.pivotNode = group("modelHingePivot");
    this.pivotNode.parent = parent;
    this.pivotNode.position.copyFrom(split.pivot);
    for (const mesh of split.leaf) {
      mesh.parent = this.pivotNode;
      mesh.position.subtractInPlace(split.pivot);
    }
  }

  setOpenFraction(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction));
    this.pivotNode.rotation.y = this.sign * this.openRad * clamped;
  }
}
