import type { NetClient } from "../../net/client";
import type {
  GambleResultPkt, LaptopChallenge, LaptopGame,
} from "../../net/protocol";
import { mountLaptop } from "./mount";
import {
  applyLaptopResult, closeLaptop, isLaptopOpen, openLaptop, setLaptopNet,
} from "./state";

export class LaptopOverlay {
  constructor(net: NetClient) {
    setLaptopNet(net);
  }

  isOpen(): boolean {
    return isLaptopOpen();
  }

  open(
    laptopId: string, game: LaptopGame, done: boolean,
    challenge?: LaptopChallenge,
  ): void {
    mountLaptop();
    openLaptop(laptopId, game, done, challenge);
  }

  applyResult(pkt: GambleResultPkt): void {
    applyLaptopResult(pkt);
  }

  close(): void {
    closeLaptop();
  }
}
