import "@babylonjs/loaders/glTF/2.0";
import type { Scene } from "@babylonjs/core/scene";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { MeshoptCompression } from "@babylonjs/core/Meshes/Compression/meshoptCompression";
import type { PickupKind, PropType } from "../net/protocol";
import { MODEL_PROPS, PICKUP_MODELS } from "../world/modelProps";

MeshoptCompression.Configuration = { decoder: { url: "/decoders/meshopt_decoder.js" } };

const PICKUP_KINDS = Object.keys(PICKUP_MODELS) as PickupKind[];

export class ModelLibrary {
  private readonly pending = new Map<PropType, Promise<AssetContainer | null>>();
  private readonly resolved = new Map<PropType, AssetContainer | null>();
  private readonly pickupPending = new Map<PickupKind, Promise<AssetContainer | null>>();
  private readonly pickupResolved = new Map<PickupKind, AssetContainer | null>();
  private pickupBundlePromise: Promise<void> | null = null;

  constructor(private readonly scene: Scene) {}

  load(type: PropType): Promise<AssetContainer | null> {
    const cached = this.pending.get(type);
    if (cached) return cached;

    const spec = MODEL_PROPS[type];
    const promise = !spec
      ? Promise.resolve(null)
      : LoadAssetContainerAsync(`/models/${spec.model}.glb`, this.scene)
        .catch((err: unknown) => {
          console.warn(`ModelLibrary: failed to load "${type}" (${spec.model})`, err);
          return null;
        });

    const tracked = promise.then((container) => {
      this.resolved.set(type, container);
      return container;
    });
    this.pending.set(type, tracked);
    return tracked;
  }

  get(type: PropType): AssetContainer | null {
    return this.resolved.get(type) ?? null;
  }

  loadPickup(kind: PickupKind): Promise<AssetContainer | null> {
    const cached = this.pickupPending.get(kind);
    if (cached) return cached;

    const spec = PICKUP_MODELS[kind];
    const promise = LoadAssetContainerAsync(`/models/${spec.model}.glb`, this.scene)
      .catch((err: unknown) => {
        console.warn(`ModelLibrary: failed to load pickup "${kind}" (${spec.model})`, err);
        return null;
      });

    const tracked = promise.then((container) => {
      this.pickupResolved.set(kind, container);
      return container;
    });
    this.pickupPending.set(kind, tracked);
    return tracked;
  }

  getPickup(kind: PickupKind): AssetContainer | null {
    return this.pickupResolved.get(kind) ?? null;
  }

  loadPickupBundle(): Promise<void> {
    const promise = Promise.all(PICKUP_KINDS.map((kind) => this.loadPickup(kind))).then(() => undefined);
    this.pickupBundlePromise = promise;
    return promise;
  }

  pickupsReady(): Promise<void> {
    return this.pickupBundlePromise ?? Promise.resolve();
  }

  async loadBundle(
    types: readonly PropType[], onProgress?: (done: number, total: number) => void,
  ): Promise<void> {
    const total = types.length;
    let done = 0;
    onProgress?.(done, total);
    await Promise.all(types.map((type) => this.load(type).then(() => {
      done++;
      onProgress?.(done, total);
    })));
    void this.loadPickupBundle();
  }
}

let current: ModelLibrary | null = null;

export function setActiveModelLibrary(lib: ModelLibrary | null): void {
  current = lib;
}

export function activeModelLibrary(): ModelLibrary | null {
  return current;
}
