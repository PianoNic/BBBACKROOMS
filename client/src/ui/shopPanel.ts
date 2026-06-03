/** Cosmetic shop overlay, opened from the lobby (where the WS is live).
 *
 *  Reads the shared `selfCosmetics` (owned/equipped, mutated by the lobby
 *  packet handler) and the catalog; sends buy/equip packets and re-renders on
 *  the results the lobby forwards in. */
import type { NetClient } from "../net/client";
import type { CosmeticCategory, ShopResultPkt } from "../net/protocol";
import type { SelfCosmetics } from "./lobbyPackets";
import { el } from "./dom";
import { getMe } from "../net/auth";
import {
  buyCosmetic, ensureCatalog, equipCosmetic, getCatalog,
} from "../gameplay/cosmetics";

const CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  body: "Body", facePattern: "Face", hat: "Hats", title: "Titles",
};

const FAIL_TEXT: Record<string, string> = {
  insufficient: "Not enough coins.",
  guest: "Sign in to buy cosmetics.",
  owned: "Already owned.",
  unknown: "That item doesn't exist.",
  error: "Something went wrong — try again.",
};

export type ShopHandle = {
  handleResult: (pkt: ShopResultPkt) => void;
  onCosmetic: () => void;
  dismount: () => void;
};

export function openShopPanel(
  client: NetClient, self: SelfCosmetics, onClose: () => void,
): ShopHandle {
  let coins = 0;
  let signedIn = false;
  let activeCat: CosmeticCategory = "body";

  const root = el<HTMLDivElement>("div", "shop-overlay");
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

  const closeBtn = el<HTMLButtonElement>("button", "menu-btn back", "← CLOSE");
  closeBtn.onclick = onClose;
  panel.appendChild(closeBtn);
  root.appendChild(panel);
  document.body.appendChild(root);

  function setBalance(c: number): void {
    coins = c;
    balance.textContent = signedIn ? `${coins} coins` : "guest";
  }

  function renderTabs(): void {
    tabs.replaceChildren();
    (Object.keys(CATEGORY_LABELS) as CosmeticCategory[]).forEach((cat) => {
      const b = el<HTMLButtonElement>(
        "button", `shop-tab${cat === activeCat ? " active" : ""}`, CATEGORY_LABELS[cat],
      );
      b.onclick = () => { activeCat = cat; renderTabs(); renderGrid(); };
      tabs.appendChild(b);
    });
  }

  function renderGrid(): void {
    grid.replaceChildren();
    for (const item of getCatalog().filter((i) => i.category === activeCat)) {
      const card = el<HTMLDivElement>("div", `shop-card rarity-${item.rarity}`);
      card.appendChild(el("div", "shop-card-name", item.name));
      card.appendChild(el("div", "shop-card-rarity", item.rarity));
      const owned = self.owned.has(item.id);
      const equipped = self.equipped[item.category] === item.id;
      const btn = el<HTMLButtonElement>("button", "shop-action");
      if (equipped) {
        btn.textContent = "EQUIPPED";
        btn.disabled = true;
        btn.classList.add("is-equipped");
      } else if (owned) {
        btn.textContent = "EQUIP";
        btn.onclick = () => equipCosmetic(client, item.category, item.id);
      } else {
        btn.textContent = `BUY · ${item.price}`;
        if (!signedIn || coins < item.price) btn.disabled = true;
        else btn.onclick = () => buyCosmetic(client, item.id);
      }
      card.appendChild(btn);
      grid.appendChild(card);
    }
  }

  renderTabs();
  renderGrid();
  void ensureCatalog().then(renderGrid);
  void getMe().then((acc) => {
    signedIn = acc !== null;
    setBalance(acc?.coins ?? 0);
    if (!signedIn) note.textContent = "Sign in on the title screen to buy and save cosmetics.";
    renderGrid();
  });

  return {
    handleResult: (pkt) => {
      if (pkt.ok) {
        note.textContent = "Purchased!";
        setBalance(pkt.balance);
      } else {
        note.textContent = FAIL_TEXT[pkt.reason] ?? "Purchase failed.";
      }
      renderGrid();
    },
    onCosmetic: renderGrid,
    dismount: () => root.remove(),
  };
}
