import { signal } from "@preact/signals";
import type { CatalogItem, CosmeticCategory, EquippedCosmetics } from "../../../net/protocol";
import { ensureCatalog, getCatalog } from "../../../gameplay/cosmetics";
import { shopBuy, shopEquip, shopMe } from "../../../net/shop";

export const SHOP_CATEGORIES: { key: CosmeticCategory; label: string }[] = [
  { key: "body", label: "Body" },
  { key: "facePattern", label: "Face" },
  { key: "hat", label: "Hats" },
  { key: "title", label: "Titles" },
];

export const SHOP_FAIL_TEXT: Record<string, string> = {
  insufficient: "Not enough coins.",
  guest: "Sign in to buy cosmetics.",
  owned: "Already owned.",
  unknown: "That item doesn't exist.",
  error: "Something went wrong — try again.",
};

export const shopCatalog = signal<CatalogItem[]>([]);

export async function ensureShopCatalog(): Promise<CatalogItem[]> {
  const items = await ensureCatalog();
  shopCatalog.value = items;
  return items;
}

export const shopSignedIn = signal(false);
export const shopBalance = signal(0);
export const shopOwned = signal<Set<string>>(new Set());
export const shopEquipped = signal<EquippedCosmetics>({});
export const shopNote = signal("");

export async function loadTitleShop(): Promise<void> {
  const [items, state] = await Promise.all([ensureCatalog(), shopMe()]);
  shopCatalog.value = getCatalog().length ? getCatalog() : items;
  shopSignedIn.value = state.signedIn;
  shopBalance.value = state.balance;
  shopOwned.value = new Set(state.owned);
  shopEquipped.value = state.equipped;
  shopNote.value = state.signedIn ? "" : "Sign in on the title screen to buy and equip.";
}

export async function buyTitleShopItem(cosmeticId: string): Promise<void> {
  const result = await shopBuy(cosmeticId);
  if (result.ok) {
    const owned = new Set(shopOwned.value);
    owned.add(cosmeticId);
    shopOwned.value = owned;
    shopBalance.value = result.balance;
    shopNote.value = "Purchased!";
  } else {
    shopNote.value = SHOP_FAIL_TEXT[result.reason] ?? "Purchase failed.";
  }
}

export async function equipTitleShopItem(
  category: CosmeticCategory, cosmeticId: string,
): Promise<void> {
  const result = await shopEquip(category, cosmeticId);
  if (result.ok) shopEquipped.value = { ...shopEquipped.value, [category]: cosmeticId };
}
