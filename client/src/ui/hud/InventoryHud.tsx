import { gogglesHint, inventoryCounts } from "./state";

const MEDKIT_CAP = 2;
const POTION_CAP = 3;

function Slot(props: {
  id: string;
  iconCls: string;
  count: number | string;
  hint?: string;
  full?: boolean;
  extraClass?: string;
  hidden?: boolean;
}) {
  if (props.hidden) return null;
  const cls = ["slot", props.full ? "full" : null, props.extraClass ?? null]
    .filter(Boolean).join(" ");
  return (
    <div class={cls} id={props.id}>
      <span class={`icon ${props.iconCls}`} />
      <span class="count">{props.count}</span>
      {props.hint !== undefined ? <span class="hint">{props.hint}</span> : null}
    </div>
  );
}

export function InventoryHud() {
  const inv = inventoryCounts.value;
  const gog = gogglesHint.value;
  const rootClass = [
    inv.medkits === 0 ? "med-empty" : null,
    inv.potions === 0 ? "pot-empty" : null,
  ].filter(Boolean).join(" ");

  return (
    <div id="inventory" class={rootClass || undefined}>
      <Slot
        id="inv-medkit" iconCls="med"
        count={`${inv.medkits}/${MEDKIT_CAP}`} full={inv.medkits >= MEDKIT_CAP}
      />
      <Slot
        id="inv-potion" iconCls="pot" hint="[Q]"
        count={`${inv.potions}/${POTION_CAP}`} full={inv.potions >= POTION_CAP}
      />
      <Slot id="inv-compass" iconCls="comp" count={inv.compasses} hidden={inv.compasses === 0} />
      <Slot id="inv-tracker" iconCls="track" count={inv.trackers} hidden={inv.trackers === 0} />
      <Slot
        id="inv-goggles" iconCls="goggles" count={inv.goggles} hint={gog.text}
        hidden={inv.goggles === 0}
        extraClass={gog.state === "active" ? "active" : gog.state === "cooldown" ? "cooldown" : undefined}
      />
      <Slot id="inv-gps" iconCls="gps" count={inv.gps} hidden={inv.gps === 0} />
    </div>
  );
}
