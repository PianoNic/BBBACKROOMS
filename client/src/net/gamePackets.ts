/** Builds the in-game packet handler.
 *
 *  Lives outside `main.ts` so the main bootstrap stays a short wiring
 *  sequence. Every dependency is passed in explicitly — this module owns
 *  *no* state of its own. */
import type * as THREE from "three";
import type { NetClient } from "./client";
import { routePacket } from "./router";
import type { WorldInit, ServerPacket } from "./protocol";
import type { RemotePlayers } from "../gameplay/remotePlayers";
import type { Quests } from "../gameplay/quests";
import type { Laptops } from "../gameplay/laptops";
import type { Teachers } from "../gameplay/teachers";
import type { TeacherEffects } from "../gameplay/teacherEffects";
import type { Chairs } from "../gameplay/chairs";
import type { Corpses } from "../gameplay/corpses";
import type { Pickups } from "../gameplay/pickups";
import type { Lockers } from "../gameplay/lockers";
import type { Doors } from "../gameplay/doors";
import type { Spectator } from "../gameplay/spectator";
import type { ExtractionPortal } from "../gameplay/extraction";
import type { Player } from "../gameplay/player";
import type { LaptopOverlay } from "../ui/laptop/index";
import type { InventoryHud } from "../ui/inventory";
import type { TaskCompass } from "../ui/compass";
import type { ReviveBar } from "../ui/reviveBar";
import type { WebcamMesh } from "../gameplay/webcam";
import type { ProximityVoice } from "../gameplay/proximityVoice";
import { showBanner } from "../ui/banner";
import {
  showVictory, showGameOver, isEndgameVisible, clearEndgameOverlay,
} from "../ui/victory";
import { jumpscare } from "../ui/jumpscare";
import { setStatus } from "../core/playerStatus";

export type ReviveState = { active: boolean };

export type GamePacketDeps = {
  init: WorldInit;
  net: NetClient;
  webcam: WebcamMesh;
  proximityVoice: ProximityVoice;
  remotes: RemotePlayers;
  quests: Quests;
  laptops: Laptops;
  teachers: Teachers;
  teacherById: Map<string, { image: string; name: string; subject: string }>;
  teacherEffects: TeacherEffects;
  chairs: Chairs;
  corpses: Corpses;
  pickups: Pickups;
  lockers: Lockers;
  doors: Doors;
  inventory: InventoryHud;
  compass: TaskCompass;
  reviveBar: ReviveBar;
  laptop: LaptopOverlay;
  portal: ExtractionPortal;
  spectator: Spectator;
  player: Player;
  camera: THREE.PerspectiveCamera;
  state: { extracted: boolean };
  reviveState: ReviveState;
  /** Deadlines for thermal-goggles reveal + cooldown (performance.now()
   *  scale). 0 = inactive. Written by the goggles_state packet handler,
   *  read by gameLoop to toggle teacher outlines + HUD countdown. */
  gogglesState: { activeUntilMs: number; cooldownUntilMs: number };
};

/** Returns a packet dispatcher closed over the given dependencies. */
export function makeGamePacketHandler(d: GamePacketDeps): (pkt: ServerPacket) => void {
  return (pkt) => routePacket({
    player_join: (p) => { d.remotes.add(p); d.webcam.addPeer(p.id); },
    player_state: (p) => d.remotes.setState(p.id, p.x, p.z, p.yaw),
    player_avatar: (p) => d.remotes.setAvatar(p.id, p.avatar),
    player_leave: (p) => {
      d.remotes.remove(p.id);
      d.webcam.removePeer(p.id);
      d.proximityVoice.removePeer(p.id);
    },
    webrtc_signal: (p) => { void d.webcam.applySignal(p.from, p.kind, p.data); },
    webcam_state: (p) => { if (!p.on) d.webcam.applyPeerOff(p.id); },
    spot_done: (p) => d.quests.completeSpot(p.id, p.spot),
    objective_done: (p) => d.quests.complete(p.id),
    phase_change: (p) => {
      if (p.phase === "escape") {
        d.portal.show();
        showBanner("ALL TASKS DONE — return to the atrium to extract", 6000);
      }
    },
    player_extracted: (p) => {
      if (p.id !== d.init.selfId) return;
      d.state.extracted = true;
      d.spectator.activate();
      showBanner("EXTRACTED — spectating teammates. Click to switch view.", 6000);
    },
    game_won: () => showVictory(d.net),
    game_lost: () => showGameOver(d.net),
    lobby_state: (p) => {
      // Server flipped us back to the waiting room (someone hit
      // "Back to lobby" on the victory screen). Reload — the
      // sessionStorage hint in title.ts lands us in the same lobby's
      // waiting room.
      if (isEndgameVisible() && p.status === "waiting") {
        clearEndgameOverlay();
        location.reload();
      }
    },
    gamble_state: (p) => d.laptop.open(p.laptopId, p.game, p.done, p.challenge),
    gamble_result: (p) => {
      d.laptop.applyResult(p);
      if (p.win) d.laptops.markDone(p.laptopId);
    },
    teachers_state: (p) => {
      for (const t of p.teachers) d.teachers.setState(t.id, t.x, t.z);
    },
    teacher_ability: (p) => d.teacherEffects.handle(p),
    player_status: (p) => setStatus(
      p.slowMs, p.slowFactor, p.stunMs, p.hasteMs ?? 0, p.hasteFactor ?? 1,
    ),
    chair_state: (p) => d.chairs.applyState(p),
    chair_throw_start: (p) => d.chairs.applyThrowStart(p),
    chair_hit: (p) => d.chairs.applyHit(p),
    teacher_stuns: (p) => {
      for (const t of p.teachers) d.teachers.setStun(t.id, t.ms);
    },
    spot_relocked: () => { /* server already broadcasts the spot/objective change */ },
    player_killed: (p) => handleKilled(d, p),
    inventory: (p) => {
      d.inventory.set(p.medkits, p.potions, p.compasses, p.trackers, p.goggles, p.gps);
      d.compass.setEnabled(d.inventory.hasCompass());
    },
    goggles_state: (p) => {
      const now = performance.now();
      d.gogglesState.activeUntilMs = now + p.activeMs;
      d.gogglesState.cooldownUntilMs = now + p.cooldownMs;
    },
    pickup_taken: (p) => d.pickups.remove(p.id),
    locker_opened: (p) => {
      d.lockers.open(p.id);
      if (p.spawned) d.pickups.add(p.spawned);
    },
    door_state: (p) => d.doors.setOpen(p.id, p.isOpen),
    revive_progress: (p) => d.reviveBar.set(p.progress),
    player_revived: (p) => handleRevived(d, p),
  }, pkt);
}

function handleKilled(
  d: GamePacketDeps,
  p: { id: string; x: number; z: number; by: string },
): void {
  if (p.id === d.init.selfId) {
    const t = d.teacherById.get(p.by);
    if (t) jumpscare(`/teachers/${t.image}`, t.name, t.subject);
    d.corpses.add(p.id, p.x, p.z, d.init.selfColor);
    d.state.extracted = true;
    d.spectator.activate();
    showBanner("YOU WERE CAUGHT — wait for a teammate with a medkit to revive you.", 6000);
  } else {
    const col = d.init.players.find((q) => q.id === p.id)?.color ?? "#888";
    d.corpses.add(p.id, p.x, p.z, col);
    d.remotes.markDead(p.id, p.x, p.z);
  }
}

function handleRevived(
  d: GamePacketDeps,
  p: { id: string; by: string; x: number; z: number },
): void {
  d.corpses.remove(p.id);
  if (p.by === d.init.selfId) {
    d.reviveBar.set(-1);
    d.reviveState.active = false;
  }
  if (p.id === d.init.selfId) {
    d.state.extracted = false;
    d.spectator.deactivate();
    d.player.spawn(p.x, p.z, d.player.yaw);
    showBanner("REVIVED — back in the game.", 4000);
  } else {
    // Recreate the remote player entry (markDead removed it from updates).
    const col = d.init.players.find((q) => q.id === p.id)?.color ?? "#888";
    d.remotes.remove(p.id);
    d.remotes.add({ id: p.id, color: col, x: p.x, z: p.z, yaw: 0 });
    d.webcam.addPeer(p.id);
  }
}
