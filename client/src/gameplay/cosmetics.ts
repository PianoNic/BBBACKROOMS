/** Cosmetic catalog access + equip/buy senders.
 *
 *  The catalog (prices, asset refs) is fetched once over REST and cached. The
 *  resolver lets the renderer turn an equipped id into its asset ref (body hex,
 *  hat mesh key, face texture path). */
import type { NetClient } from "../net/client";
import type { CatalogItem, CosmeticCategory } from "../net/protocol";

const API = import.meta.env.VITE_SERVER_URL ?? "";

let catalog: CatalogItem[] = [];
let byId = new Map<string, CatalogItem>();

export async function ensureCatalog(): Promise<CatalogItem[]> {
  if (catalog.length) return catalog;
  try {
    const r = await fetch(`${API}/shop/catalog`);
    if (r.ok) {
      catalog = (await r.json()) as CatalogItem[];
      byId = new Map(catalog.map((it) => [it.id, it]));
    }
  } catch {
    /* offline — leave catalog empty; cosmetics simply don't render */
  }
  return catalog;
}

export function getCatalog(): CatalogItem[] {
  return catalog;
}

export function resolveCosmetic(id: string | undefined): CatalogItem | undefined {
  return id ? byId.get(id) : undefined;
}

export function equipCosmetic(
  net: NetClient, category: CosmeticCategory, cosmeticId: string | null,
): void {
  net.send({ type: "set_cosmetic", category, cosmeticId });
}

export function buyCosmetic(net: NetClient, cosmeticId: string): void {
  net.send({ type: "buy_cosmetic", cosmeticId });
}
