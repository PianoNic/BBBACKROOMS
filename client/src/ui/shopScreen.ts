/** Title-screen cosmetic shop. Uses the REST shop (session-authenticated), so
 *  it works without a lobby/WebSocket. Reuses the `.shop-*` styles. Equips and
 *  purchases persist to the account and show up in-game on the next connect. */
import { el } from "./dom";
import type { CosmeticCategory } from "../net/protocol";
import { ensureCatalog, getCatalog } from "../gameplay/cosmetics";
import { shopBuy, shopEquip, shopMe, type ShopState } from "../net/shop";

const CATEGORIES: { key: CosmeticCategory; label: string }[] = [
  { key: "body", label: "Body" },
  { key: "facePattern", label: "Face" },
  { key: "hat", label: "Hats" },
  { key: "title", label: "Titles" },
];

const FAIL_TEXT: Record<string, string> = {
  insufficient: "Not enough coins.",
  guest: "Sign in to buy cosmetics.",
  owned: "Already owned.",
  unknown: "That item doesn't exist.",
  error: "Something went wrong — try again.",
};

export function buildShopScreen(root: HTMLElement, onBack: () => void): void {
  const panel = el<HTMLDivElement>("div", "panel panel-brackets shop-panel");

  const header = el<HTMLDivElement>("div", "col-header shop-header");
  header.appendChild(el("span", undefined, "SYS://SHOP"));
  const balance = el<HTMLSpanElement>("span", "shop-balance", "…");
  header.appendChild(balance);
  panel.appendChild(header);

  const tabs = el<HTMLDivElement>("div", "shop-tabs");
  panel.appendChild(tabs);
  const grid = el<HTMLDivElement>("div", "shop-grid");
  panel.appendChild(grid);
  const note = el<HTMLDivElement>("div", "shop-note");
  panel.appendChild(note);

  const back = el<HTMLButtonElement>("button", "shop-close", "← BACK");
  back.onclick = onBack;
  panel.appendChild(back);
  root.appendChild(panel);

  let state: ShopState = { signedIn: false, balance: 0, owned: [], equipped: {} };
  let owned = new Set<string>();
  let active: CosmeticCategory = "body";

  function setBalance(): void {
    balance.textContent = state.signedIn ? `${state.balance} coins` : "guest";
  }

  function renderTabs(): void {
    tabs.replaceChildren();
    for (const c of CATEGORIES) {
      const b = el<HTMLButtonElement>(
        "button", `shop-tab${c.key === active ? " active" : ""}`, c.label,
      );
      b.onclick = () => { active = c.key; renderTabs(); renderGrid(); };
      tabs.appendChild(b);
    }
  }

  function renderGrid(): void {
    grid.replaceChildren();
    for (const item of getCatalog().filter((i) => i.category === active)) {
      const card = el<HTMLDivElement>("div", `shop-card rarity-${item.rarity}`);
      card.appendChild(el("div", "shop-card-name", item.name));
      card.appendChild(el("div", "shop-card-rarity", item.rarity));
      const isOwned = owned.has(item.id);
      const isEquipped = state.equipped[item.category] === item.id;
      const btn = el<HTMLButtonElement>("button", "shop-action");
      if (isEquipped) {
        btn.textContent = "EQUIPPED";
        btn.disabled = true;
        btn.classList.add("is-equipped");
      } else if (isOwned) {
        btn.textContent = "EQUIP";
        btn.onclick = async () => {
          const r = await shopEquip(item.category, item.id);
          if (r.ok) { state.equipped[item.category] = item.id; renderGrid(); }
        };
      } else {
        btn.textContent = `BUY · ${item.price}`;
        if (!state.signedIn || state.balance < item.price) {
          btn.disabled = true;
        } else {
          btn.onclick = async () => {
            const r = await shopBuy(item.id);
            if (r.ok) {
              owned.add(item.id);
              state.balance = r.balance;
              note.textContent = "Purchased!";
              setBalance();
            } else {
              note.textContent = FAIL_TEXT[r.reason] ?? "Purchase failed.";
            }
            renderGrid();
          };
        }
      }
      card.appendChild(btn);
      grid.appendChild(card);
    }
  }

  renderTabs();
  renderGrid();
  void Promise.all([ensureCatalog(), shopMe()]).then(([, s]) => {
    state = s;
    owned = new Set(s.owned);
    setBalance();
    if (!s.signedIn) note.textContent = "Sign in on the title screen to buy and equip.";
    renderGrid();
  });
}
