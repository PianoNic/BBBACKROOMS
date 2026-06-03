/** REST shop client for the title-screen shop (no WebSocket there).
 *  All calls are credentialed (session cookie). Degrades gracefully on error. */
import type { CosmeticCategory, EquippedCosmetics } from "./protocol";

const API = import.meta.env.VITE_SERVER_URL ?? "";

export type ShopState = {
  signedIn: boolean;
  balance: number;
  owned: string[];
  equipped: EquippedCosmetics;
};

export type BuyResult = { ok: boolean; balance: number; reason: string };

export async function shopMe(): Promise<ShopState> {
  try {
    const r = await fetch(`${API}/shop/me`, { credentials: "include" });
    if (r.ok) return (await r.json()) as ShopState;
  } catch {
    /* offline */
  }
  return { signedIn: false, balance: 0, owned: [], equipped: {} };
}

export async function shopBuy(cosmeticId: string): Promise<BuyResult> {
  try {
    const r = await fetch(`${API}/shop/buy`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cosmeticId }),
    });
    if (r.ok) return (await r.json()) as BuyResult;
  } catch {
    /* ignore */
  }
  return { ok: false, balance: 0, reason: "error" };
}

export async function shopEquip(
  category: CosmeticCategory, cosmeticId: string,
): Promise<{ ok: boolean }> {
  try {
    const r = await fetch(`${API}/shop/equip`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, cosmeticId }),
    });
    if (r.ok) return (await r.json()) as { ok: boolean };
  } catch {
    /* ignore */
  }
  return { ok: false };
}
