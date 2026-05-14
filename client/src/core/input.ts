import { getSettings } from "./settings";

const BASE_LOOK = 0.002;

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
      this.locked = document.pointerLockElement === this.target;
      this.keys.clear();
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
    const r = { yaw: this.yawDelta, pitch: this.pitchDelta };
    this.yawDelta = 0;
    this.pitchDelta = 0;
    return r;
  }
}
