import { getSettings } from "./settings";

const BASE_LOOK = 0.002;
// Cap how far the camera can swing in a single frame so a stutter (GC,
// network burst, tab refocus) can't dump a huge accumulated mouse delta
// into one update and snap the view to the pitch cap. ~57° / frame is
// well above any sane single-frame turn but blocks the runaway case.
const MAX_LOOK_DELTA = 1.0;

export class InputState {
  readonly keys = new Set<string>();
  yawDelta = 0;
  pitchDelta = 0;
  locked = false;

  constructor(private readonly target: HTMLElement) {
    addEventListener("keydown", (e) => this.keys.add(e.code));
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    addEventListener("blur", () => this.keys.clear());

    document.addEventListener("pointerlockchange", () => {
      const wasLocked = this.locked;
      this.locked = document.pointerLockElement === this.target;
      // Only drop held keys when lock is LOST. Clearing on re-lock too
      // (the old behaviour) made held W/A/S/D vanish whenever the lock
      // briefly flickered, so the player stopped moving until they
      // released and re-pressed the key.
      if (wasLocked && !this.locked) this.keys.clear();
      // Drop any queued mouse delta when the lock state changes so a
      // pending swing doesn't fire when locking back in.
      this.yawDelta = 0;
      this.pitchDelta = 0;
    });
    addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      const s = BASE_LOOK * getSettings().mouseSensitivity;
      this.yawDelta -= e.movementX * s;
      this.pitchDelta -= e.movementY * s;
    });
  }

  requestLock(): void {
    this.target.requestPointerLock();
  }

  consumeMouse(): { yaw: number; pitch: number } {
    const yaw = Math.max(-MAX_LOOK_DELTA, Math.min(MAX_LOOK_DELTA, this.yawDelta));
    const pitch = Math.max(-MAX_LOOK_DELTA, Math.min(MAX_LOOK_DELTA, this.pitchDelta));
    this.yawDelta = 0;
    this.pitchDelta = 0;
    return { yaw, pitch };
  }
}
