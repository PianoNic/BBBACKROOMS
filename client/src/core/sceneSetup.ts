/** Builds every in-game manager and adds their groups to the scene.
 *
 *  Pulled out of `main.ts` so the bootstrap stays a short, readable wiring
 *  sequence. This module owns no state — it constructs and returns the
 *  managers, then the caller wires them into the packet handler and loop. */
import * as THREE from "three";
import type { WorldInit } from "../net/protocol";
import type { NetClient } from "../net/client";
import type { createRenderContext } from "../rendering/renderer";
import type { WebcamMesh } from "../gameplay/webcam";
import { buildWorld } from "../world/builder";
import { buildProps } from "../world/props";
import { buildPropColliders } from "../world/colliders";
import { FlickerLights } from "../rendering/lights";
import { Player } from "../gameplay/player";
import { RemotePlayers } from "../gameplay/remotePlayers";
import { Quests } from "../gameplay/quests";
import { TaskBoard } from "../ui/taskboard";
import { Minimap } from "../ui/minimap";
import { StaminaBar } from "../ui/stamina";
import { InteractPrompt } from "../ui/interactPrompt";
import { ExtractionPortal } from "../gameplay/extraction";
import { Spectator } from "../gameplay/spectator";
import { Laptops } from "../gameplay/laptops";
import { Teachers } from "../gameplay/teachers";
import { TeacherEffects } from "../gameplay/teacherEffects";
import { Chairs } from "../gameplay/chairs";
import { Corpses } from "../gameplay/corpses";
import { Pickups } from "../gameplay/pickups";
import { Lockers } from "../gameplay/lockers";
import { Doors } from "../gameplay/doors";
import { ToiletStallDoors } from "../gameplay/toiletStallDoors";
import { FuseBoxes } from "../gameplay/fuseBoxes";
import { ProximityVoice } from "../gameplay/proximityVoice";
import { LaptopOverlay } from "../ui/laptop/index";
import { InventoryHud } from "../ui/inventory";
import { ReviveBar } from "../ui/reviveBar";
import { TaskCompass } from "../ui/compass";
import { Heartbeat } from "./heartbeat";
import { preloadJumpscareImages } from "../ui/jumpscare";
import { preloadSfx } from "./audio";
import { showVictory } from "../ui/victory";
import { InputState } from "./input";

export type SceneSetup = ReturnType<typeof buildScene>;

export function buildScene(
  init: WorldInit,
  ctx: ReturnType<typeof createRenderContext>,
  net: NetClient,
  audioListener: THREE.AudioListener,
  webcam: WebcamMesh,
) {
  const world = buildWorld(init.grid);
  ctx.scene.add(world.group);
  const lights = new FlickerLights(init.lights);
  ctx.scene.add(lights.group);
  ctx.scene.add(buildProps(init.props));
  const propColliders = buildPropColliders(init.props);

  ctx.camera.add(audioListener);
  ctx.scene.add(ctx.camera);
  const remotes = new RemotePlayers();
  remotes.attachAudio(audioListener);
  ctx.scene.add(remotes.group);
  for (const p of init.players) remotes.add(p);

  const quests = new Quests(init.objectives);
  ctx.scene.add(quests.group);
  new TaskBoard(quests);

  const portal = new ExtractionPortal(
    init.extraction.x, init.extraction.z, init.extraction.radius,
  );
  ctx.scene.add(portal.group);
  if (init.phase === "escape") portal.show();
  if (init.phase === "won") showVictory(net);

  const spectator = new Spectator(ctx.camera, remotes, init.selfId);
  const deadSet = new Set(init.deadPlayers ?? []);
  const state = {
    extracted: init.extractedPlayers.includes(init.selfId) || deadSet.has(init.selfId),
  };
  if (state.extracted) spectator.activate();
  for (const id of deadSet) {
    if (id !== init.selfId) remotes.markDead(id);
  }

  const minimap = new Minimap(init.grid);
  document.body.appendChild(minimap.element);
  const stamina = new StaminaBar();
  const interactPrompt = new InteractPrompt();
  const laptops = new Laptops(init.laptops);
  ctx.scene.add(laptops.group);
  const teachers = new Teachers(init.teachers ?? [], audioListener);
  ctx.scene.add(teachers.group);
  const teacherById = new Map((init.teachers ?? []).map((t) => [t.id, t]));
  const teacherEffects = new TeacherEffects(
    ctx.scene, ctx.camera, init.selfId, (id) => teacherById.get(id) ?? null,
  );
  preloadJumpscareImages((init.teachers ?? []).map((t) => `/teachers/${t.image}`));
  preloadSfx("/sounds/jumpscare/scream.wav");

  const corpses = new Corpses();
  ctx.scene.add(corpses.group);
  for (const c of init.corpses ?? []) {
    const col = init.players.find((p) => p.id === c.id)?.color ?? init.selfColor;
    corpses.add(c.id, c.x, c.z, col);
  }
  const laptop = new LaptopOverlay(net);
  const chairs = new Chairs(init.chairs ?? [], init.selfId, ctx.camera, remotes);
  ctx.scene.add(chairs.group);
  const pickups = new Pickups(init.pickups ?? []);
  ctx.scene.add(pickups.group);
  const lockers = new Lockers(init.lockers ?? []);
  ctx.scene.add(lockers.group);
  const doors = new Doors(init.doors ?? [], propColliders);
  ctx.scene.add(doors.group);
  const toiletStallDoors = new ToiletStallDoors(init.props);
  ctx.scene.add(toiletStallDoors.group);
  const fuseBoxes = new FuseBoxes(init.props);
  ctx.scene.add(fuseBoxes.group);
  const inventory = new InventoryHud();
  inventory.set(
    init.inventory?.medkits ?? 0,
    init.inventory?.potions ?? 0,
    init.inventory?.compasses ?? 0,
    init.inventory?.trackers ?? 0,
    init.inventory?.goggles ?? 0,
    init.inventory?.gps ?? 0,
  );
  const reviveBar = new ReviveBar();
  const compass = new TaskCompass(quests);
  document.body.appendChild(compass.element);
  compass.setEnabled(inventory.hasCompass());
  const heartbeat = new Heartbeat();

  const input = new InputState(ctx.renderer.domElement);
  const player = new Player(ctx.camera, input, world, propColliders);
  player.spawn(init.spawn.x, init.spawn.z, init.spawn.yaw);

  webcam.onRemoteStream((id, stream) => remotes.setVideoStream(id, stream));
  const proximityVoice = new ProximityVoice(
    audioListener,
    { cells: init.grid.cells, width: init.grid.width,
      height: init.grid.height, cellSize: init.grid.cellSize },
    (id) => remotes.getMesh(id),
  );
  webcam.onRemoteAudio((id, stream) => proximityVoice.setStream(id, stream));
  webcam.setPeers(init.players.map((p) => p.id));

  return {
    state, player, remotes, quests, portal, spectator, minimap, stamina,
    interactPrompt, laptops, teachers, teacherById, teacherEffects, corpses,
    laptop, chairs, pickups, lockers, doors, toiletStallDoors, fuseBoxes,
    inventory, reviveBar, compass, heartbeat, lights, proximityVoice,
  };
}
