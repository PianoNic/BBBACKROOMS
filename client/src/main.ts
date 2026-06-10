import "./styles/main.scss";
import Stats from "stats.js";
import * as THREE from "three";
import { runGameLoop } from "./core/gameLoop";
import { connect, type NetClient } from "./net/client";
import { showLobbyRoom } from "./ui/lobbyRoom";
import { createRenderContext } from "./rendering/renderer";
import { showTitleScreen, getStoredAvatar, getStoredName } from "./ui/title";
import { hideLoading, setLoading, showLoading, yieldToPaint } from "./ui/loading";
import { showTeacherSlots } from "./ui/teacherSlots";
import { showPauseMenu } from "./ui/pauseMenu";
import { captureInput } from "./core/inputCapture";
import { startAmbient, unlockAudio } from "./core/audio";
import { music } from "./core/music";
import { createWebcamMesh } from "./gameplay/webcam";
import { makeGamePacketHandler } from "./net/gamePackets";
import { installGameInput } from "./core/gameInput";
import { installVoiceNoise } from "./gameplay/voiceNoise";
import { buildScene } from "./core/sceneSetup";
import { getSettings, onSettingsChange, updateSetting } from "./core/settings";
import { ensureCatalog } from "./gameplay/cosmetics";


async function main(): Promise<void> {
  const mount = document.getElementById("app")!;
  const status = document.getElementById("status")!;

  const { lobbyId, password } = await showTitleScreen();

  showLoading("connecting…");
  await yieldToPaint();
  let conn;
  try {
    conn = await connect(lobbyId, password);
  } catch (e) {
    hideLoading();
    // Auto-resume just failed (lobby gone or WS unreachable). Clear the
    // resume hint so the reload lands on the title menu, not in an
    // infinite "couldn't join" loop.
    sessionStorage.removeItem("bbb_lobby_resume");
    console.warn(`Couldn't join: ${(e as Error).message}`);
    window.location.reload();
    return;
  }
  hideLoading();

  // Push our chosen profile fields to the server immediately.
  const profileName = getStoredName().trim();
  if (profileName) conn.client.send({ type: "set_name", name: profileName });
  const profileAvatar = getStoredAvatar();
  if (profileAvatar) conn.client.send({ type: "set_avatar", avatar: profileAvatar });
  // One webcam mesh lives across lobby + game. Lobby uses tile previews;
  // game uses VideoTextures on the player sprites.
  const webcam = createWebcamMesh(conn.lobby.selfId, conn.client);
  webcam.setPeers(conn.lobby.players.map((p) => p.id));
  const room = showLobbyRoom(conn.lobby, conn.client, webcam);
  let genStarted = false;
  const init = await conn.waitForWorld(() => {
    genStarted = true;
    room.dismount();
    showLoading("generating map…");
  });
  if (!genStarted) room.dismount();

  showLoading("building world…");
  await yieldToPaint();
  const net: NetClient = conn.client;
  status.textContent = `world: ${init.grid.width}×${init.grid.height} • you: ${init.selfColor}`;

  setLoading("building world…");
  await yieldToPaint();
  const ctx = createRenderContext(mount);
  const audioListener = new THREE.AudioListener();
  await ensureCatalog();  // so equipped cosmetics resolve when seeding players
  const s = buildScene(init, ctx, net, audioListener, webcam);

  const reviveState = { active: false };
  const gogglesState = { activeUntilMs: 0, cooldownUntilMs: 0 };
  net.onPacket(makeGamePacketHandler({
    init, net, webcam, proximityVoice: s.proximityVoice,
    remotes: s.remotes, quests: s.quests, pings: s.pings, laptops: s.laptops,
    teachers: s.teachers, teacherById: s.teacherById,
    teacherEffects: s.teacherEffects, chairs: s.chairs, corpses: s.corpses,
    pickups: s.pickups, lockers: s.lockers, doors: s.doors, inventory: s.inventory,
    compass: s.compass, reviveBar: s.reviveBar, laptop: s.laptop,
    portal: s.portal, spectator: s.spectator, player: s.player,
    camera: ctx.camera, state: s.state, reviveState, gogglesState,
  }));
  // Voice state: the settings `voiceMode` decides the default ("open" =
  // always live, "ptt" = only while V is held). The pause-menu MIC button
  // also flips between the two modes.
  const voice = {
    pttHeld: false,
    async sync() {
      const mode = getSettings().voiceMode;
      if (mode === "off") {
        await webcam.setMicEnabled(false);
        return;
      }
      await webcam.setMicEnabled(mode === "open" || voice.pttHeld);
    },
  };
  onSettingsChange((s) => {
    void voice.sync();
    if (s.cameraMode === "off" && webcam.isLocalEnabled()) {
      void webcam.setLocalEnabled(false);
    }
  });
  installVoiceNoise(
    net, webcam,
    () => getSettings().voiceMode === "open"
      || (getSettings().voiceMode === "ptt" && voice.pttHeld),
    () => !s.state.extracted,
  );
  installGameInput({
    net, camera: ctx.camera, state: s.state, reviveState,
    interactPrompt: s.interactPrompt, laptop: s.laptop, chairs: s.chairs,
    spectator: s.spectator, inventory: s.inventory, reviveBar: s.reviveBar,
    toiletStallDoors: s.toiletStallDoors,
    fuseBoxes: s.fuseBoxes,
    voice: {
      isToggleOn: () => getSettings().voiceMode === "open",
      setActive: (on) => { voice.pttHeld = on; void voice.sync(); },
    },
  });

  // Full input capture: fullscreen + pointer lock + keyboard lock (Chromium).
  // Keyboard lock is what lets us intercept Ctrl+W / F11 etc. so the browser
  // doesn't close the tab or break out of the game.
  const enterGame = (): void => {
    unlockAudio();
    startAmbient();
    if (init.phase === "tasks" || init.phase === "escape") {
      music.setPhase(init.phase);
    }
    captureInput(ctx.renderer.domElement);
  };

  let pauseOpen = false;
  const openPause = () => {
    if (pauseOpen || s.laptop.isOpen()) return;
    pauseOpen = true;
    showPauseMenu({
      onResume: () => { pauseOpen = false; enterGame(); },
      onLeave: () => {
        sessionStorage.removeItem("bbb_lobby_resume");
        webcam.dispose();
        window.location.reload();
      },
      cam: {
        isOn: () => webcam.isLocalEnabled(),
        toggle: async () => {
          if (getSettings().cameraMode === "off") return;
          await webcam.setLocalEnabled(!webcam.isLocalEnabled());
        },
      },
      mic: {
        isOn: () => getSettings().voiceMode === "open",
        toggle: async () => {
          const open = getSettings().voiceMode === "open";
          updateSetting("voiceMode", open ? "ptt" : "open");
          await voice.sync();
        },
      },
    });
  };

  ctx.renderer.domElement.addEventListener("click", () => {
    if (!document.pointerLockElement) enterGame();
  });
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== ctx.renderer.domElement && !s.laptop.isOpen()) {
      if (document.getElementById("victory")) return; // game-over UI is showing
      openPause();
    }
  });

  const stats = new Stats();
  stats.showPanel(0);
  Object.assign(stats.dom.style, { position: "fixed", bottom: "8px", right: "8px", top: "auto", left: "auto" });
  document.body.appendChild(stats.dom);

  hideLoading();
  status.style.display = "none";
  if (init.phase === "tasks" && init.teachers.length > 0 && !s.state.extracted) {
    await showTeacherSlots(init.teachers, init.roster);
  }
  // Auto-focus the canvas so keyboard input works without any click.
  // Mouse look still requires one click (browsers hard-block auto pointer lock).
  ctx.renderer.domElement.tabIndex = 0;
  ctx.renderer.domElement.focus();
  runGameLoop({
    ctx, net, stats,
    player: s.player, lights: s.lights, remotes: s.remotes, minimap: s.minimap,
    quests: s.quests, pings: s.pings, stamina: s.stamina, interactPrompt: s.interactPrompt,
    portal: s.portal, spectator: s.spectator, state: s.state,
    laptops: s.laptops, teachers: s.teachers, teacherEffects: s.teacherEffects,
    chairs: s.chairs, pickups: s.pickups, lockers: s.lockers, doors: s.doors,
    toiletStallDoors: s.toiletStallDoors, fuseBoxes: s.fuseBoxes,
    corpses: s.corpses, inventory: s.inventory, compass: s.compass,
    heartbeat: s.heartbeat, proximityVoice: s.proximityVoice,
    gogglesState,
  });
}

main().catch((err) => {
  hideLoading();
  const status = document.getElementById("status");
  if (status) status.textContent = `error: ${err.message}`;
  console.error(err);
});
