/** Global keyboard + click handlers for in-game input.
 *
 *  Owns no state — receives the live game references and `ReviveState`
 *  shared with the packet handler so KeyE press/release can talk to the
 *  revive flow without main.ts juggling another variable. */
import * as THREE from "three";
import type { NetClient } from "../net/client";
import type { ReviveState } from "../net/gamePackets";
import type { InteractPrompt } from "../ui/interactPrompt";
import type { LaptopOverlay } from "../ui/laptop/index";
import type { Chairs } from "../gameplay/chairs";
import type { Spectator } from "../gameplay/spectator";
import type { ToiletStallDoors } from "../gameplay/toiletStallDoors";
import type { FuseBoxes } from "../gameplay/fuseBoxes";
import type { InventoryHud } from "../ui/inventory";
import type { ReviveBar } from "../ui/reviveBar";

export type GameInputDeps = {
  net: NetClient;
  camera: THREE.PerspectiveCamera;
  state: { extracted: boolean; hidden: boolean };
  reviveState: ReviveState;
  interactPrompt: InteractPrompt;
  laptop: LaptopOverlay;
  chairs: Chairs;
  spectator: Spectator;
  toiletStallDoors: ToiletStallDoors;
  fuseBoxes: FuseBoxes;
  inventory: InventoryHud;
  reviveBar: ReviveBar;
  /** V key push-to-talk: held = mic active for the duration of the press,
   *  independent of the menu-toggled "open mic" state. */
  voice: {
    isToggleOn: () => boolean;
    setActive: (on: boolean) => void;
  };
};

/** Bind window/document listeners. No teardown — handlers live for the page. */
export function installGameInput(d: GameInputDeps): void {
  window.addEventListener("keydown", (e) => onKeyDown(d, e));
  window.addEventListener("keyup", (e) => onKeyUp(d, e));
  document.addEventListener("click", () => onClick(d));
}

function onKeyDown(d: GameInputDeps, e: KeyboardEvent): void {
  if (d.state.extracted || d.laptop.isOpen()) return;
  if (!document.pointerLockElement) return;
  if (d.state.hidden) {
    // Inside a closet only E (climb out) works.
    if (e.code === "KeyE" && !e.repeat) d.net.send({ type: "hide" });
    return;
  }
  if (e.code === "KeyE") {
    if (e.repeat) return;
    handleInteract(d);
    return;
  }
  if (e.code === "KeyQ" && d.inventory.hasPotion()) {
    d.net.send({ type: "use_potion" });
    return;
  }
  if (e.code === "KeyF" && d.inventory.hasGoggles()) {
    if (e.repeat) return;
    d.net.send({ type: "use_goggles" });
    return;
  }
  if (e.code === "KeyG" && d.chairs.isHoldingChair()) {
    d.chairs.requestDrop(d.net);
  }
  if (e.code === "KeyV" && !e.repeat && !d.voice.isToggleOn()) {
    d.voice.setActive(true);
  }
  if (e.code === "KeyX" && !e.repeat) {
    sendPing(d);
  }
}

/** Ping the spot the camera looks at: intersect the view ray with the floor
 *  plane, clamped so sky-gazing still drops a marker a few meters ahead. */
function sendPing(d: GameInputDeps): void {
  const origin = new THREE.Vector3();
  d.camera.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  d.camera.getWorldDirection(dir);
  let t = 18;
  if (dir.y < -0.02) t = Math.min(40, -origin.y / dir.y);
  const target = origin.addScaledVector(dir, t);
  d.net.send({ type: "ping", x: target.x, z: target.z });
}

function handleInteract(d: GameInputDeps): void {
  const cur = d.interactPrompt.current;
  if (cur?.kind === "laptop") { d.net.send({ type: "gamble_open" }); return; }
  if (cur?.kind === "hide") { d.net.send({ type: "hide" }); return; }
  if (cur?.kind === "chair" && cur.chairId) {
    d.chairs.requestPickup(d.net, cur.chairId); return;
  }
  if (cur?.kind === "pickup" && cur.pickupId) {
    d.net.send({ type: "pickup_collect", pickupId: cur.pickupId }); return;
  }
  if (cur?.kind === "locker" && cur.lockerId) {
    d.net.send({ type: "locker_open", lockerId: cur.lockerId }); return;
  }
  if (cur?.kind === "door" && cur.doorId) {
    d.net.send({ type: "door_toggle", doorId: cur.doorId }); return;
  }
  if (cur?.kind === "toilet_stall" && cur.stallId) {
    // Client-only toggle; cabin doors aren't synced across players.
    d.toiletStallDoors.toggle(cur.stallId); return;
  }
  if (cur?.kind === "fuse_box_door" && cur.fuseBoxId) {
    d.fuseBoxes.toggleDoor(cur.fuseBoxId); return;
  }
  if (cur?.kind === "fuse_box_lever" && cur.fuseBoxId && cur.leverIdx != null) {
    // Flipping the last lever triggers the standard interact packet
    // inside FuseBoxes.flipLever, completing the fuse-box quest spot.
    d.fuseBoxes.flipLever(cur.fuseBoxId, cur.leverIdx, d.net);
    return;
  }
  if (cur?.kind === "corpse" && cur.corpseId && d.inventory.hasMedkit()) {
    d.reviveState.active = true;
    d.net.send({ type: "revive_start", targetId: cur.corpseId });
    return;
  }
  d.net.send({ type: "interact" });
}

function onKeyUp(d: GameInputDeps, e: KeyboardEvent): void {
  if (e.code === "KeyV" && !d.voice.isToggleOn()) {
    d.voice.setActive(false);
  }
  if (e.code !== "KeyE" || !d.reviveState.active) return;
  d.reviveState.active = false;
  d.net.send({ type: "revive_cancel" });
  d.reviveBar.set(-1);
}

function onClick(d: GameInputDeps): void {
  if (d.state.extracted && document.pointerLockElement) {
    d.spectator.cycle();
    return;
  }
  if (!document.pointerLockElement || d.laptop.isOpen()) return;
  if (d.chairs.isHoldingChair()) {
    const fwd = new THREE.Vector3();
    d.camera.getWorldDirection(fwd);
    d.chairs.requestThrow(d.net, fwd.x, fwd.z);
  }
}
