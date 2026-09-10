/** Builds every in-game manager and adds their groups to the scene.
 *
 *  Pulled out of `main.ts` so the bootstrap stays a short, readable wiring
 *  sequence. This module owns no state — it constructs and returns the
 *  managers, then the caller wires them into the packet handler and loop. */
import type { SpatialListener } from "./spatialAudio";
import type { Prop, PropType, WorldInit } from "../net/protocol";
import type { NetClient } from "../net/client";
import { AmbientLights, type createRenderContext } from "../rendering/renderer";
import type { WebcamMesh } from "../gameplay/webcam";
import type { ModelLibrary } from "../rendering/modelLoader";
import { buildWorld } from "../world/builder";
import { buildProps } from "../world/props";
import { buildPropColliders } from "../world/colliders";
import { MODEL_PROP_TYPES, bundlesFor } from "../world/modelProps";
import { ModelPropStage } from "../world/modelPropStage";
import { FlickerLights } from "../rendering/lights";
import { Player } from "../gameplay/player";
import { RemotePlayers } from "../gameplay/remotePlayers";
import { Hideouts } from "../gameplay/hideouts";
import { Pings } from "../gameplay/pings";
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
import { HorrorAudio } from "./horrorAudio";
import { preloadJumpscareImages } from "../ui/jumpscare";
import { preloadSfx } from "./audio";
import { resolveTeacherImage } from "./texturePacks";
import { showVictory, showGameOver } from "../ui/victory";
import { InputState } from "./input";

export type SceneSetup = ReturnType<typeof buildScene>;

export function buildScene(
  init: WorldInit,
  ctx: ReturnType<typeof createRenderContext>,
  net: NetClient,
  audioListener: SpatialListener,
  webcam: WebcamMesh,
  models: ModelLibrary | null,
) {
  const world = buildWorld(init.grid, init.props, init.lights);
  const regionOfXY = (x: number, z: number): number => world.inference.regionAtXY(
    Math.floor(x / init.grid.cellSize),
    Math.floor(z / init.grid.cellSize),
    init.grid.width,
  );
  const lights = new FlickerLights(init.lights);
  const regionOf = (prop: Prop): number => regionOfXY(prop.x, prop.z);
  const modelSkip: ReadonlySet<PropType> = models ? MODEL_PROP_TYPES : new Set<PropType>();
  buildProps(init.props, regionOf, modelSkip);
  const propColliders = buildPropColliders(init.props);

  let modelStage: ModelPropStage | null = null;
  let modelsReady: Promise<void> = Promise.resolve();
  if (models) {
    modelStage = new ModelPropStage(ctx.scene, models);
    const { immediate, deferred } = bundlesFor(init.grid, init.props, init.spawn);
    modelsReady = modelStage.place(init.props, immediate, deferred);
  }
  const ambientLights = new AmbientLights(ctx.scene);

  const remotes = new RemotePlayers();
  remotes.attachAudio(audioListener);
  for (const p of init.players) remotes.add(p);

  const quests = new Quests(init.objectives);
  new TaskBoard(quests);

  const pings = new Pings();

  const hideouts = new Hideouts(init.props);

  const portal = new ExtractionPortal(
    init.extraction.x, init.extraction.z, init.extraction.radius,
  );
  if (init.phase === "escape") portal.show();
  if (init.phase === "won") showVictory(net, init.scoreboard ?? null, init.selfId);
  else if (init.phase === "lost") showGameOver(net, init.scoreboard ?? null, init.selfId);

  const spectator = new Spectator(ctx.camera, remotes, init.selfId);
  const deadSet = new Set(init.deadPlayers ?? []);
  const state = {
    extracted: init.extractedPlayers.includes(init.selfId) || deadSet.has(init.selfId),
    hidden: false,
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
  const teachers = new Teachers(init.teachers ?? [], audioListener);
  const teacherById = new Map((init.teachers ?? []).map((t) => [t.id, t]));
  const teacherEffects = new TeacherEffects(
    ctx.scene, ctx.camera, init.selfId, (id) => teacherById.get(id) ?? null,
  );
  preloadJumpscareImages((init.teachers ?? []).map(
    (t) => resolveTeacherImage(t.ability, -1, `/teachers/${t.image}`),
  ));
  preloadSfx("/sounds/jumpscare/scream.wav");
  for (const f of [
    "door-open", "door-close", "locker-open", "lever", "fusebox-door",
    "pickup", "task-done", "objective-done", "revive", "ping", "throw",
    "chair-impact", "extract", "escape-phase", "win", "wrong",
  ]) preloadSfx(`/sounds/actions/${f}.ogg`);

  const corpses = new Corpses();
  for (const c of init.corpses ?? []) {
    const col = init.players.find((p) => p.id === c.id)?.color ?? init.selfColor;
    corpses.add(c.id, c.x, c.z, col);
  }
  const laptop = new LaptopOverlay(net);
  const chairs = new Chairs(init.chairs ?? [], init.selfId, ctx.camera, remotes);
  const pickups = new Pickups(init.pickups ?? []);
  const lockers = new Lockers(init.lockers ?? []);
  const doors = new Doors(init.doors ?? [], propColliders);
  const toiletStallDoors = new ToiletStallDoors(init.props);
  const fuseBoxes = new FuseBoxes(init.props);
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
  const horrorAudio = new HorrorAudio(audioListener);

  const input = new InputState(ctx.canvas);
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
    state, player, remotes, quests, pings, hideouts, portal, spectator, minimap, stamina,
    interactPrompt, laptops, teachers, teacherById, teacherEffects, corpses,
    laptop, chairs, pickups, lockers, doors, toiletStallDoors, fuseBoxes,
    inventory, reviveBar, compass, heartbeat, horrorAudio, lights, proximityVoice,
    inference: world.inference, ambientLights, modelStage, scattered: world.scattered,
    modelsReady,
  };
}
