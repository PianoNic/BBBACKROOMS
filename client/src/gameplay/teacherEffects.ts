/** Renders the visible side of every event-driven teacher ability.
 *
 * Server fires teacher_ability packets; this module owns the visuals: floor
 * puddles, thrown projectiles, screen filters, banners, etc. Server-side
 * effects (stun, slow) are pushed separately via player_status. */
import * as THREE from "three";
import type { TeacherAbilityPkt, TeacherInfo } from "../net/protocol";
import { showBanner } from "../ui/banner";
import {
  corruptTasks, fakePing, flashOverlay, flickerWorldLights, flipGravity,
  frenchifyTasks, screenFilter, showMathPopup,
} from "./teacherEffectHelpers";
import {
  buildBall, buildBowl, buildFlask, buildLawbook,
  buildPlate, buildScissors, buildWrench, type Projectile,
} from "./teacherEffectModels";

const PUDDLE_GEO = new THREE.CircleGeometry(1, 24);

type TeacherLookup = (id: string) => TeacherInfo | null;
type FlyingProjectile = Projectile & {
  from: THREE.Vector3; to: THREE.Vector3;
  t0: number; durationMs: number;
  onArrive?: () => void; arrived?: boolean;
};

export class TeacherEffects {
  readonly group = new THREE.Group();
  private readonly puddles = new Map<symbol, { mesh: THREE.Mesh; until: number }>();
  private readonly projectiles = new Map<symbol, FlyingProjectile>();

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
        this.throwArc(
          buildFlask(),
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
          buildLawbook(),
          new THREE.Vector3(pkt.x, 1.4, pkt.z),
          new THREE.Vector3(payload.targetX, 1.2, payload.targetZ),
          payload.travelMs ?? 700,
        );
        if (targeted) {
          setTimeout(() => flashOverlay("rgba(80,0,0,0.55)", 250), payload.travelMs ?? 700);
          showBanner(`${teacherName}: ARTICLE 41 OR — YOU OWE DAMAGES!`, 2200);
        }
        break;
      case "dodgeball_throw":
      case "shotput_throw":
      case "basketball_throw": {
        const ball =
          pkt.ability === "shotput_throw"    ? buildBall(0x3a3a3a, 0.18) :
          pkt.ability === "basketball_throw" ? buildBall(0xd97a23, 0.13, true) :
          /* dodgeball */                      buildBall(0xc62828, 0.12);
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
        // Movement-only — TeachersState packet updates position.
        break;
      case "scissor_throw":
      case "plate_smash":
      case "wrench_throw": {
        const proj =
          pkt.ability === "scissor_throw" ? buildScissors() :
          pkt.ability === "plate_smash"   ? buildPlate() :
          /* wrench */                       buildWrench();
        this.throwArc(
          proj,
          new THREE.Vector3(pkt.x, 1.4, pkt.z),
          new THREE.Vector3(payload.targetX, 1.2, payload.targetZ),
          payload.travelMs ?? 600,
        );
        if (targeted) {
          const msg =
            pkt.ability === "scissor_throw" ? `${teacherName}: SCHNIPP!` :
            pkt.ability === "plate_smash"   ? `${teacherName}: SERVICE!` :
            /* wrench */                       `${teacherName}: TOOL TIME!`;
          showBanner(msg, 2000);
          setTimeout(() => flashOverlay("rgba(200,80,40,0.4)", 200), payload.travelMs ?? 600);
        }
        break;
      }
      case "soup_splash":
      case "oil_slick": {
        const isOil = pkt.ability === "oil_slick";
        const radius = payload.radius ?? (isOil ? 2.4 : 1.8);
        const duration = payload.duration ?? (isOil ? 8 : 4);
        const targetX = payload.targetX;
        const targetZ = payload.targetZ;
        const travelMs = payload.travelMs ?? 650;
        this.throwArc(
          buildBowl(isOil ? 0x222018 : 0xcd9b4a),
          new THREE.Vector3(pkt.x, 1.4, pkt.z),
          new THREE.Vector3(targetX, 0.2, targetZ),
          travelMs,
          () => this.spawnPuddle(targetX, targetZ, radius, duration, isOil ? 0x222018 : 0xcd9b4a),
        );
        if (targeted) {
          const msg = isOil
            ? `${teacherName}: ÖL-PFÜTZE!`
            : `${teacherName}: HEISSE SUPPE!`;
          showBanner(msg, 2000);
        }
        break;
      }
      case "circuit_overload":
        if (targeted) {
          flashOverlay("rgba(120,160,255,0.55)", 350);
          showBanner(`${teacherName}: STROMSCHLAG!`, 2200);
        }
        break;
      case "truck_horn":
        if (targeted) {
          screenFilter("blur(2px) saturate(1.2)", 1600, `${teacherName}: HUUUUP!`);
        } else {
          showBanner(`${teacherName}: HUUUUP!`, 1500);
        }
        break;
      case "gear_jam":
        if (targeted) screenFilter("contrast(1.4) hue-rotate(15deg)", 2200, `${teacherName}: GETRIEBE-STAU!`);
        break;
      case "makeup_blur":
        if (targeted) screenFilter("blur(4px) brightness(1.2) saturate(1.5)", 3500, `${teacherName}: STAUB INS GESICHT!`);
        break;
    }
  }

  private spawnPuddle(
    x: number, z: number, radius: number, durationS: number,
    color = 0x6fcf3a,
  ): void {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.55, depthWrite: false,
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

  private throwArc(
    proj: Projectile,
    from: THREE.Vector3,
    to: THREE.Vector3,
    travelMs: number,
    onArrive?: () => void,
  ): void {
    proj.obj.position.copy(from);
    this.group.add(proj.obj);
    this.projectiles.set(Symbol("proj"), {
      ...proj, from: from.clone(), to: to.clone(),
      t0: performance.now(), durationMs: travelMs, onArrive,
    });
  }

  update(): void {
    const now = performance.now();
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
