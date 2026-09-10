import { useState } from "preact/hooks";
import type { CatalogItem, CosmeticCategory, EquippedCosmetics } from "../../../../net/protocol";
import { Button } from "../../components/controls";
import { Scroll } from "../../components/layout";
import { SHOP_CATEGORIES } from "../../state/shop";

export type ShopAdapter = {
  signedIn: boolean;
  balance: number;
  owned: Set<string>;
  equipped: EquippedCosmetics;
  note: string;
  catalog: CatalogItem[];
  buy: (cosmeticId: string) => void;
  equip: (category: CosmeticCategory, cosmeticId: string) => void;
};

export function ShopBody(props: {
  adapter: ShopAdapter;
  backLabel: string;
  onBack: () => void;
}) {
  const [active, setActive] = useState<CosmeticCategory>("body");
  const { adapter } = props;
  const items = adapter.catalog.filter((item) => item.category === active);

  return (
    <>
      <div class="shop-header">
        <span>SYS://SHOP</span>
        <span class="shop-balance">{adapter.signedIn ? `${adapter.balance} coins` : "guest"}</span>
      </div>
      <div class="bb-tabs" role="tablist" aria-label="Cosmetic categories">
        {SHOP_CATEGORIES.map((cat) => (
          <button
            type="button"
            key={cat.key}
            role="tab"
            aria-selected={cat.key === active}
            class={cat.key === active ? "bb-tab active" : "bb-tab"}
            onClick={() => setActive(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <Scroll>
        <div class="bb-cardgrid">
          {items.map((item) => {
            const owned = adapter.owned.has(item.id);
            const equipped = adapter.equipped[item.category] === item.id;
            return (
              <div key={item.id} class={`shop-card rarity-${item.rarity}`}>
                <div class="shop-card-preview" aria-hidden="true">{item.name.charAt(0)}</div>
                <div class="shop-card-name">{item.name}</div>
                <div class="shop-card-rarity">{item.rarity}</div>
                {equipped ? (
                  <Button small disabled class="shop-action is-equipped">EQUIPPED</Button>
                ) : owned ? (
                  <Button
                    small
                    class="shop-action"
                    onClick={() => adapter.equip(item.category, item.id)}
                  >
                    EQUIP
                  </Button>
                ) : (
                  <Button
                    small
                    class="shop-action"
                    disabled={!adapter.signedIn || adapter.balance < item.price}
                    onClick={() => adapter.buy(item.id)}
                  >
                    {`BUY · ${item.price}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Scroll>
      <div class="shop-note">{adapter.note}</div>
      <Button variant="back" class="screen-back" onClick={props.onBack}>{props.backLabel}</Button>
    </>
  );
}
