/** Renders the visible side of every event-driven teacher ability.
 *
 * Server fires teacher_ability packets; this module owns the visuals: floor
 * puddles, thrown projectiles, screen filters, banners, etc. Server-side
 * effects (stun, slow) are pushed separately via player_status.
 */
import * as THREE from "three";
import type { TeacherAbilityPkt, TeacherInfo } from "../net/protocol";
import { showBanner } from "../ui/banner";

const PUDDLE_GEO = new THREE.CircleGeometry(1, 24);
const LAWBOOK_TEX = new THREE.TextureLoader().load("/projectiles/lawbook.jpg");

type TeacherLookup = (id: string) => TeacherInfo | null;

export class TeacherEffects {
  readonly group = new THREE.Group();
  private readonly puddles = new Map<symbol, { mesh: THREE.Mesh; until: number }>();
  private readonly projectiles = new Map<symbol, {
    obj: THREE.Object3D;
    from: THREE.Vector3;
    to: THREE.Vector3;
    t0: number;
    durationMs: number;
    dispose: () => void;
    onArrive?: () => void;
    arrived?: boolean;
  }>();

  constructor(
    scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly selfId: string,
    private readonly getTeacher: TeacherLookup,
  ) {
    scene.add(this.group);
  }

  handle(pkt: TeacherAbilityPkt): void {
    const t = this.getTeacher(pkt.id);
    const teacherName = t?.name ?? "TEACHER";
    const targeted = pkt.targetId === this.selfId;
    const payload = (pkt.payload ?? {}) as Record<string, number>;

    switch (pkt.ability) {
      case "potion_throw": {
        const radius = payload.radius ?? 2;
        const duration = payload.duration ?? 6;
        const targetX = payload.targetX;
        const targetZ = payload.targetZ;
        const travelMs = payload.travelMs ?? 750;
        // Throw the flask in an arc from the teacher to the impact point,
        // then spawn the puddle when it lands.
        this.throwArc(
          this.buildFlask(),
          new THREE.Vector3(pkt.x, 1.4, pkt.z),
          new THREE.Vector3(targetX, 0.2, targetZ),
          travelMs,
          () => this.spawnPuddle(targetX, targetZ, radius, duration),
        );
        if (targeted) showBanner(`${teacherName}: ACID!`, 2000);
        break;
      }
      case "lawsuit_stun":
        this.throwArc(
          this.buildLawbook(),
          new THREE.Vector3(pkt.x, 1.4, pkt.z),
          new THREE.Vector3(payload.targetX, 1.2, payload.targetZ),
          payload.travelMs ?? 700,
        );
        if (targeted) {
          // Delay the screen flash so it matches the impact, not the throw.
          setTimeout(() => flashOverlay("rgba(80,0,0,0.55)", 250), payload.travelMs ?? 700);
          showBanner(`${teacherName}: ARTICLE 41 OR — YOU OWE DAMAGES!`, 2200);
        }
        break;
      case "dodgeball_throw":
      case "shotput_throw":
      case "basketball_throw": {
        const ball =
          pkt.ability === "shotput_throw"    ? this.buildBall(0x3a3a3a, 0.18) :
          pkt.ability === "basketball_throw" ? this.buildBall(0xd97a23, 0.13, true) :
          /* dodgeball */                      this.buildBall(0xc62828, 0.12);
        this.throwArc(
          ball,
          new THREE.Vector3(pkt.x, 1.4, pkt.z),
          new THREE.Vector3(payload.targetX, 1.2, payload.targetZ),
          payload.travelMs ?? 600,
        );
        if (targeted) {
          const msg =
            pkt.ability === "shotput_throw"    ? `${teacherName}: KUGELSTOSSEN!` :
            pkt.ability === "basketball_throw" ? `${teacherName}: BUZZER BEATER!` :
            /* dodgeball */                      `${teacherName}: DODGE THIS!`;
          showBanner(msg, 2000);
          setTimeout(() => flashOverlay("rgba(200,80,40,0.4)", 200), payload.travelMs ?? 600);
        }
        break;
      }
      case "fine_slow":
        if (targeted) {
          showBanner(`${teacherName} ISSUED A FINE — you are slowed`, 2500);
          flashOverlay("rgba(120,100,0,0.4)", 400);
        }
        break;
      case "math_popup":
        if (targeted) showMathPopup(teacherName);
        break;
      case "grammar_blur":
        if (targeted) screenFilter("blur(6px) saturate(0.5)", 4000, `${teacherName}: GRAMMAR DRILL!`);
        break;
      case "french_ui":
        if (targeted) frenchifyTasks(5000, `${teacherName}: EN FRANÇAIS!`);
        break;
      case "gravity_flip":
        if (targeted) flipGravity(this.camera, 2400, `${teacherName}: PHYSIK ÜBUNG!`);
        break;
      case "kill_flashlight":
        if (targeted) screenFilter("brightness(0.18) contrast(1.3)", 3500, `${teacherName} DISABLED YOUR LIGHTS`);
        break;
      case "fake_ping":
        fakePing();
        break;
      case "vent_lockout":
        showBanner("⚠ VENT JAMMED — extraction temporarily blocked", 4000);
        break;
      case "corrupt_tasks":
        corruptTasks(3500);
        break;
      case "lights_off":
        flickerWorldLights();
        break;
      case "taunt_shout":
        showBanner(`${teacherName}: "I SEE YOU!"`, 2500);
        break;
      case "relock_laptop":
        showBanner(`${teacherName} RE-LOCKED A LAPTOP`, 3000);
        break;
      case "room_teleport":
      case "short_teleport":
        // Movement-only — TeachersState packet updates position; nothing visual here yet.
        break;
    }
  }

  private spawnPuddle(x: number, z: number, radius: number, durationS: number): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x6fcf3a, transparent: true, opacity: 0.55, depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(PUDDLE_GEO, mat);
    mesh.scale.setScalar(radius);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    this.group.add(mesh);
    const key = Symbol("puddle");
    this.puddles.set(key, { mesh, until: performance.now() + durationS * 1000 });
  }

  private buildBall(
    color: number, radius: number, withSeams = false,
  ): { obj: THREE.Object3D; dispose: () => void } {
    const mat = new THREE.MeshLambertMaterial({ color });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), mat);
    const disposes: (() => void)[] = [() => mat.dispose()];
    if (withSeams) {
      // Basketball — two crossed black rings to suggest panel seams.
      const seamMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
      const ringGeo = new THREE.TorusGeometry(radius * 1.01, radius * 0.04, 6, 24);
      const ringA = new THREE.Mesh(ringGeo, seamMat);
      const ringB = new THREE.Mesh(ringGeo, seamMat);
      ringB.rotation.y = Math.PI / 2;
      sphere.add(ringA, ringB);
      disposes.push(() => seamMat.dispose(), () => ringGeo.dispose());
    }
    return { obj: sphere, dispose: () => disposes.forEach((f) => f()) };
  }

  private buildLawbook(): { obj: THREE.Object3D; dispose: () => void } {
    const mat = new THREE.SpriteMaterial({ map: LAWBOOK_TEX, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.6, 0.8, 1);
    return { obj: sprite, dispose: () => mat.dispose() };
  }

  private buildFlask(): { obj: THREE.Object3D; dispose: () => void } {
    // Tiny conical flask: glass body + dark stopper + a glowing acid sphere.
    const g = new THREE.Group();
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x6fcf3a, transparent: true, opacity: 0.85,
    });
    const corkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a1f });
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xc8ff8a, transparent: true, opacity: 0.45,
    });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 12), glassMat);
    body.rotation.x = Math.PI; // tip-down so the stopper sits up top
    body.position.y = 0.0;
    g.add(body);
    const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), corkMat);
    stopper.position.y = 0.17;
    g.add(stopper);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), haloMat);
    g.add(halo);
    return {
      obj: g,
      dispose: () => { glassMat.dispose(); corkMat.dispose(); haloMat.dispose(); },
    };
  }

  private throwArc(
    proj: { obj: THREE.Object3D; dispose: () => void },
    from: THREE.Vector3,
    to: THREE.Vector3,
    travelMs: number,
    onArrive?: () => void,
  ): void {
    proj.obj.position.copy(from);
    this.group.add(proj.obj);
    const key = Symbol("proj");
    this.projectiles.set(key, {
      obj: proj.obj,
      from: from.clone(),
      to: to.clone(),
      t0: performance.now(),
      durationMs: travelMs,
      dispose: proj.dispose,
      onArrive,
    });
  }

  update(): void {
    const now = performance.now();
    // Expire puddles.
    for (const [k, v] of this.puddles) {
      const left = v.until - now;
      if (left <= 0) {
        this.group.remove(v.mesh);
        (v.mesh.material as THREE.MeshBasicMaterial).dispose();
        this.puddles.delete(k);
      } else if (left < 1000) {
        (v.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (left / 1000);
      }
    }
    // Advance projectiles with a parabolic arc.
    for (const [k, p] of this.projectiles) {
      const t = (now - p.t0) / p.durationMs;
      if (t >= 1) {
        if (!p.arrived && p.onArrive) p.onArrive();
        p.arrived = true;
        this.group.remove(p.obj);
        p.dispose();
        this.projectiles.delete(k);
        continue;
      }
      p.obj.position.lerpVectors(p.from, p.to, t);
      p.obj.position.y = THREE.MathUtils.lerp(p.from.y, p.to.y, t) + 1.8 * t * (1 - t);
      p.obj.rotation.y += 0.25;
      p.obj.rotation.z += 0.15;
    }
  }
}

// --- Visual helpers (no Three.js needed) ------------------------------------

let overlayEl: HTMLDivElement | null = null;
function flashOverlay(color: string, ms: number): void {
  if (!overlayEl) {
    overlayEl = document.createElement("div");
    overlayEl.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:90;transition:opacity 0.2s";
    document.body.appendChild(overlayEl);
  }
  overlayEl.style.background = color;
  overlayEl.style.opacity = "1";
  setTimeout(() => { if (overlayEl) overlayEl.style.opacity = "0"; }, ms);
}

let filterTimer: number | null = null;
function screenFilter(filter: string, ms: number, banner?: string): void {
  const app = document.getElementById("app");
  if (!app) return;
  app.style.filter = filter;
  if (filterTimer !== null) clearTimeout(filterTimer);
  filterTimer = window.setTimeout(() => { app.style.filter = ""; filterTimer = null; }, ms);
  if (banner) showBanner(banner, ms);
}

function flipGravity(camera: THREE.PerspectiveCamera, ms: number, banner: string): void {
  const start = performance.now();
  showBanner(banner, ms);
  const tick = (): void => {
    const t = (performance.now() - start) / ms;
    if (t >= 1) { camera.rotation.z = 0; return; }
    // Slow spin upside-down and back.
    camera.rotation.z = Math.sin(t * Math.PI) * Math.PI;
    requestAnimationFrame(tick);
  };
  tick();
}

const FRENCH_MAP: Record<string, string> = {
  TASKS: "DEVOIRS",
  STAMINA: "ÉNERGIE",
  RESUME: "REPRENDRE",
  OPTIONS: "OPTIONS",
  LEAVE: "QUITTER",
};
function frenchifyTasks(ms: number, banner: string): void {
  showBanner(banner, ms);
  const board = document.getElementById("taskboard");
  if (!board) return;
  const originals: { node: Text; was: string }[] = [];
  const walker = document.createTreeWalker(board, NodeFilter.SHOW_TEXT);
  let n: Node | null = walker.nextNode();
  while (n) {
    const text = n.nodeValue ?? "";
    const next = walker.nextNode();
    const key = text.trim().toUpperCase();
    if (FRENCH_MAP[key]) {
      originals.push({ node: n as Text, was: text });
      (n as Text).nodeValue = text.replace(new RegExp(key, "i"), FRENCH_MAP[key]);
    }
    n = next;
  }
  setTimeout(() => {
    for (const o of originals) o.node.nodeValue = o.was;
  }, ms);
}

function corruptTasks(ms: number): void {
  const board = document.getElementById("taskboard");
  if (!board) return;
  board.classList.add("corrupted");
  setTimeout(() => board.classList.remove("corrupted"), ms);
}

function fakePing(): void {
  const minimap = document.getElementById("minimap");
  if (!minimap) return;
  const ping = document.createElement("div");
  ping.style.cssText = `
    position: absolute; left: ${20 + Math.random() * 60}%;
    top: ${20 + Math.random() * 60}%;
    width: 10px; height: 10px; border-radius: 50%;
    background: #ff4040; box-shadow: 0 0 8px 2px rgba(255,64,64,0.9);
    pointer-events: none;
    animation: fakeping-pulse 1.2s ease-in-out infinite;
  `;
  minimap.appendChild(ping);
  setTimeout(() => ping.remove(), 8000);
}

function flickerWorldLights(): void {
  const app = document.getElementById("app");
  if (!app) return;
  let count = 0;
  const id = window.setInterval(() => {
    app.style.filter = count % 2 === 0 ? "brightness(0.2)" : "brightness(1)";
    count++;
    if (count > 14) {
      window.clearInterval(id);
      app.style.filter = "";
    }
  }, 110);
}

let mathOpen = false;
function showMathPopup(teacherName: string): void {
  if (mathOpen) return;
  mathOpen = true;
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  const answer = a * b;
  document.exitPointerLock?.();
  const root = document.createElement("div");
  root.style.cssText = `
    position: fixed; inset: 0; z-index: 95;
    background: rgba(0,0,0,0.88); color: #ffd86b;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'VT323', monospace; font-size: 36px; letter-spacing: 0.06em;
    text-shadow: 0 0 18px rgba(255,216,107,0.4);
  `;
  const title = document.createElement("div");
  title.textContent = `${teacherName}: SCHRIFTLICHE PRÜFUNG`;
  title.style.cssText = "font-size:22px;letter-spacing:0.22em;margin-bottom:24px;color:#cfae45";
  const q = document.createElement("div");
  q.textContent = `${a} × ${b} = ?`;
  q.style.fontSize = "56px";
  const input = document.createElement("input");
  input.style.cssText = `
    margin-top: 24px; background: transparent; border: 1px solid #cfae45;
    color: #ffd86b; font-family: inherit; font-size: 36px; text-align: center;
    width: 200px; letter-spacing: 0.1em; outline: none; padding: 6px;
  `;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim() === String(answer)) {
      mathOpen = false;
      root.remove();
    }
  });
  root.append(title, q, input);
  document.body.appendChild(root);
  input.focus();
  // Auto-dismiss after 8s either way.
  setTimeout(() => { if (mathOpen) { mathOpen = false; root.remove(); } }, 8000);
}
