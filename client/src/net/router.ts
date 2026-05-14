import type { ServerPacket } from "./protocol";

/** Maps packet type → typed handler. Picks the right handler at runtime by `type`. */
export type PacketHandlers = {
  [P in ServerPacket as P["type"]]?: (pkt: P) => void;
};

export function routePacket(handlers: PacketHandlers, pkt: ServerPacket): void {
  const fn = (handlers as Record<string, (p: ServerPacket) => void>)[pkt.type];
  if (fn) fn(pkt);
}
