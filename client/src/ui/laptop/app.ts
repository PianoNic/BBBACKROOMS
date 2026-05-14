import type { GambleResultPkt, LaptopGame } from "../../net/protocol";

/** Common interface every laptop app (casino game or Teams/Moodle challenge)
 *  implements. The overlay only needs an element to mount and a way to
 *  forward the server's result packet. */
export interface LaptopApp {
  readonly kind: LaptopGame;
  readonly el: HTMLDivElement;
  applyResult(pkt: GambleResultPkt): void;
}
