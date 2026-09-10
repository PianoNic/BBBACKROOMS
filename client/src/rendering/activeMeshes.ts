import type { Scene } from "@babylonjs/core/scene";

export class ActiveMeshFreezer {
  private readonly scene: Scene;
  private frozen = false;
  private pending = false;

  constructor(scene: Scene) {
    this.scene = scene;
    scene.onNewMeshAddedObservable.add(() => this.invalidate());
    scene.onMeshRemovedObservable.add(() => this.invalidate());
  }

  freeze(): void {
    for (const mesh of this.scene.meshes) mesh.alwaysSelectAsActiveMesh = true;
    this.scene.unfreezeActiveMeshes();
    this.scene.freezeActiveMeshes();
    this.frozen = true;
  }

  invalidate(): void {
    if (!this.frozen || this.pending) return;
    this.pending = true;
    setTimeout(() => {
      this.pending = false;
      this.freeze();
    }, 0);
  }
}

let installed: ActiveMeshFreezer | null = null;

export function setActiveMeshFreezer(freezer: ActiveMeshFreezer | null): void {
  installed = freezer;
}

export function invalidateActiveMeshes(): void {
  installed?.invalidate();
}
