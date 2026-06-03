/** Aggregator for the per-theme prop builder modules.
 *
 *  `props.ts` imports `EXTRA_BUILDERS` and dispatches each prop type
 *  through it. Each themed module owns one focused set of builders so
 *  adding a new prop type only touches one file. */
import type { Builder } from "./propBuilders/_common";
import { APPLIANCE_BUILDERS } from "./propBuilders/appliances";
import { ATMOSPHERE_BUILDERS } from "./propBuilders/atmosphere";
import { CLASSROOM_FRONT_BUILDERS } from "./propBuilders/classroomFront";
import { ROOM_BUILDERS } from "./propBuilders/rooms";
import { SEATING_BUILDERS } from "./propBuilders/seating";
import { STORAGE_BUILDERS } from "./propBuilders/storage";
import { TOILET_BUILDERS } from "./propBuilders/toilet";
import { UTILITY_BUILDERS } from "./propBuilders/utility";
import { WALL_DECOR_BUILDERS } from "./propBuilders/wallDecor";

export const EXTRA_BUILDERS: Record<string, Builder> = {
  ...APPLIANCE_BUILDERS,
  ...ATMOSPHERE_BUILDERS,
  ...CLASSROOM_FRONT_BUILDERS,
  ...ROOM_BUILDERS,
  ...SEATING_BUILDERS,
  ...STORAGE_BUILDERS,
  ...TOILET_BUILDERS,
  ...UTILITY_BUILDERS,
  ...WALL_DECOR_BUILDERS,
};
