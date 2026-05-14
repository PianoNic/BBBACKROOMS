/** Aggregator for the per-theme prop builder modules.
 *
 *  `props.ts` imports `EXTRA_BUILDERS` and merges it into the main BUILDERS
 *  map. Each themed module owns a small focused set of builders so adding
 *  a new prop type only touches one focused file. */
import type { Builder } from "./propBuilders/_common";
import { UTILITY_BUILDERS } from "./propBuilders/utility";
import { ROOM_BUILDERS } from "./propBuilders/rooms";
import { APPLIANCE_BUILDERS } from "./propBuilders/appliances";

export const EXTRA_BUILDERS: Record<string, Builder> = {
  ...UTILITY_BUILDERS,
  ...ROOM_BUILDERS,
  ...APPLIANCE_BUILDERS,
};
