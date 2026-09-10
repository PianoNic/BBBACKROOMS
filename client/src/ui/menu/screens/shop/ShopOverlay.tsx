import type { Signal } from "@preact/signals";
import type { CatalogItem, CosmeticCategory, EquippedCosmetics } from "../../../../net/protocol";
import { Modal, Overlay } from "../../components/Overlay";
import { ShopBody } from "./ShopBody";

export function ShopOverlay(props: {
  signedIn: Signal<boolean>;
  balance: Signal<number>;
  owned: Signal<Set<string>>;
  equipped: Signal<EquippedCosmetics>;
  note: Signal<string>;
  catalog: Signal<CatalogItem[]>;
  onBuy: (cosmeticId: string) => void;
  onEquip: (category: CosmeticCategory, cosmeticId: string) => void;
  onClose: () => void;
}) {
  return (
    <Overlay id="shop-overlay" onClose={props.onClose}>
      <Modal class="shop-panel">
        <ShopBody
          adapter={{
            signedIn: props.signedIn.value,
            balance: props.balance.value,
            owned: props.owned.value,
            equipped: props.equipped.value,
            note: props.note.value,
            catalog: props.catalog.value,
            buy: props.onBuy,
            equip: props.onEquip,
          }}
          backLabel="← CLOSE"
          onBack={props.onClose}
        />
      </Modal>
    </Overlay>
  );
}
