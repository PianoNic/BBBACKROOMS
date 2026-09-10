import { useEffect } from "preact/hooks";
import { Panel } from "../components/layout";
import { navigate } from "../routes";
import {
  buyTitleShopItem, equipTitleShopItem, loadTitleShop,
  shopBalance, shopCatalog, shopEquipped, shopNote, shopOwned, shopSignedIn,
} from "../state/shop";
import { ShopBody } from "./shop/ShopBody";

export function ShopScreen() {
  useEffect(() => { void loadTitleShop(); }, []);

  return (
    <Panel class="shop-panel">
      <ShopBody
        adapter={{
          signedIn: shopSignedIn.value,
          balance: shopBalance.value,
          owned: shopOwned.value,
          equipped: shopEquipped.value,
          note: shopNote.value,
          catalog: shopCatalog.value,
          buy: (id) => void buyTitleShopItem(id),
          equip: (category, id) => void equipTitleShopItem(category, id),
        }}
        backLabel="← BACK"
        onBack={() => navigate("title", "back")}
      />
    </Panel>
  );
}
