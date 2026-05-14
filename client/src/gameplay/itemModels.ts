/** Entry point: maps `ItemType` to its mesh-builder. The builders
 *  themselves live in `itemBuilders/*.ts` so each file stays focused. */
import type * as THREE from "three";
import type { ItemType } from "../net/protocol";
import {
  calculator, envelope, eye, key, mug, notebook, papers, pencilCase,
  phone, textbook,
} from "./itemBuilders/desk";
import {
  gloves, hdd, sponge, toiletPaper, wateringCan,
} from "./itemBuilders/utility";

const BUILDERS: Record<ItemType, () => THREE.Group> = {
  notebook,
  pencil_case: pencilCase,
  papers,
  calculator,
  textbook,
  mug,
  key,
  phone,
  toilet_paper: toiletPaper,
  gloves,
  envelope,
  sponge,
  eye,
  watering_can: wateringCan,
  hdd,
};

export function buildItemModel(type: ItemType): THREE.Group {
  return BUILDERS[type]();
}
