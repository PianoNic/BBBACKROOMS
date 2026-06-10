import Stats from "stats.js";
import { SEND_HZ } from "./constants";
import { getSettings, onSettingsChange } from "./settings";
import type { createRenderContext } from "../rendering/renderer";
import type { Player } from "../gameplay/player";
import type { FlickerLights } from "../rendering/lights";
import type { RemotePlayers } from "../gameplay/remotePlayers";
import type { Minimap } from "../ui/minimap";
import type { NetClient } from "../net/client";
import { music } from "./music";
import type { Hideouts } from "../gameplay/hideouts";
import type { Pings } from "../gameplay/pings";
import type { Quests } from "../gameplay/quests";
import type { StaminaBar } from "../ui/stamina";
import type { InteractPrompt } from "../ui/interactPrompt";
import type { ExtractionPortal } from "../gameplay/extraction";
import type { Spectator } from "../gameplay/spectator";
import type { Laptops } from "../gameplay/laptops";
import type { Teachers } from "../gameplay/teachers";
import type { TeacherEffects } from "../gameplay/teacherEffects";
import type { Chairs } from "../gameplay/chairs";
import type { Pickups } from "../gameplay/pickups";
import type { Lockers } from "../gameplay/lockers";
import type { Doors } from "../gameplay/doors";
import type { ToiletStallDoors } from "../gameplay/toiletStallDoors";
import type { FuseBoxes } from "../gameplay/fuseBoxes";
import type { Corpses } from "../gameplay/corpses";
import type { InventoryHud } from "../ui/inventory";
import type { TaskCompass } from "../ui/compass";
import type { Heartbeat } from "./heartbeat";
import type { ProximityVoice } from "../gameplay/proximityVoice";
import { setCarryingChair } from "./playerStatus";

export type GameDeps = {
  ctx: ReturnType<typeof createRenderContext>;
  player: Player;
  lights: FlickerLights;
  remotes: RemotePlayers;
  minimap: Minimap;
  net: NetClient;
  stats: Stats;
  quests: Quests;
  pings: Pings;
  hideouts: Hideouts;
  stamina: StaminaBar;
  interactPrompt: InteractPrompt;
  portal: ExtractionPortal;
  spectator: Spectator;
  state: { extracted: boolean; hidden: boolean };
  laptops: Laptops;
  teachers: Teachers;
  teacherEffects: TeacherEffects;
  chairs: Chairs;
  pickups: Pickups;
  lockers: Lockers;
  doors: Doors;
  toiletStallDoors: ToiletStallDoors;
  fuseBoxes: FuseBoxes;
  corpses: Corpses;
  inventory: InventoryHud;
  compass: TaskCompass;
  heartbeat: Heartbeat;
  proximityVoice: ProximityVoice;
  gogglesState: { activeUntilMs: number; cooldownUntilMs: number };
};

export function runGameLoop(d: GameDeps): void {
  const sendInterval = 1 / SEND_HZ;
  let sendAcc = 0;
  let lastSent = { x: NaN, z: NaN, yaw: NaN };
  let last = performance.now();
  let lastRender = 0;
  let elapsed = 0;

  const applyShowFps = (visible: boolean) => {
    d.stats.dom.style.display = visible ? "block" : "none";
  };
  applyShowFps(getSettings().showFps);
  onSettingsChange((s) => applyShowFps(s.showFps));

  const frame = (now: number) => {
    const settings = getSettings();
    // FPS cap: skip frames until enough time has passed.
    if (settings.fpsCap > 0) {
      const minDelta = 1000 / settings.fpsCap;
      if (now - lastRender < minDelta - 0.5) {
        requestAnimationFrame(frame);
        return;
      }
    }
    lastRender = now;

    d.stats.begin();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    elapsed += dt;

    setCarryingChair(d.chairs.isHoldingChair());
    if (!d.state.extracted && !d.state.hidden) d.player.update(dt);
    d.lights.update(elapsed, d.player.position.x, d.player.position.z);
    d.remotes.update(dt);
    d.quests.update(elapsed);
    d.pings.update(elapsed);
    d.portal.update(elapsed);
    d.teachers.update();
    d.teacherEffects.update();
    d.chairs.update(dt, d.chairs.isHoldingChair());
    d.pickups.update(elapsed);
    d.lockers.update(dt);
    d.doors.update(dt);
    d.toiletStallDoors.update(dt);
    d.fuseBoxes.update(dt);
    if (d.state.extracted) {
      d.spectator.update();
    } else {
      d.stamina.update(d.player.stamina);
      d.interactPrompt.update(d.ctx.camera, d.player.position, [
        ...d.quests.getInteractTargets(d.remotes.positions()),
        ...d.laptops.getInteractTargets(),
        ...d.chairs.getInteractTargets(),
        ...d.pickups.getInteractTargets(),
        ...d.lockers.getInteractTargets(),
        ...d.doors.getInteractTargets(),
        ...d.toiletStallDoors.getInteractTargets(),
        ...d.fuseBoxes.getInteractTargets(),
        ...d.hideouts.getInteractTargets(),
        ...d.corpses.getInteractTargets(d.inventory.hasMedkit()),
      ]);
    }
    const tracked = {
      items: d.inventory.hasTracker() ? d.pickups.getMapPositions() : [],
      tasks: d.inventory.hasTracker() ? d.quests.getMapPositions() : [],
      teachers: d.inventory.hasGps() ? d.teachers.getMapPositions() : [],
      pings: d.pings.getMapDots(),
    };
    d.minimap.update(
      d.player.position.x, d.player.position.z, d.player.yaw,
      d.remotes.positions(), tracked,
    );
    const nowMs = performance.now();
    d.teachers.setOutlinesVisible(nowMs < d.gogglesState.activeUntilMs);
    d.inventory.updateGogglesState(
      nowMs, d.gogglesState.activeUntilMs, d.gogglesState.cooldownUntilMs,
    );
    d.proximityVoice.update(d.player.position.x, d.player.position.z);
    d.compass.update(d.player.position.x, d.player.position.z, d.player.yaw);
    // Heartbeat picks up nearest non-stunned teacher; silenced while
    // spectating (dead/extracted) since the player is no longer in danger.
    if (d.state.extracted) {
      d.heartbeat.stop();
      music.updateThreat(Infinity, elapsed);
    } else {
      const nearest = d.teachers.nearestDistance(
        d.player.position.x, d.player.position.z,
      );
      d.heartbeat.setNearestDistance(nearest);
      music.updateThreat(nearest, elapsed);
    }

    sendAcc += dt;
    if (!d.state.extracted && !d.state.hidden && sendAcc >= sendInterval) {
      sendAcc = 0;
      const { x, z } = d.player.position;
      const yaw = d.player.yaw;
      if (x !== lastSent.x || z !== lastSent.z || yaw !== lastSent.yaw) {
        d.net.send({ type: "move", x, z, yaw });
        lastSent = { x, z, yaw };
      }
    }

    d.ctx.composer.render(dt);
    d.stats.end();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
