import { AMBIENCE } from "../rendering/ambience";

let amount = 0;
let phase = 0;

export function shake(strength: number): void {
  amount = Math.min(AMBIENCE.cues.shakeMax, amount + strength);
}

export function tickShake(dt: number): void {
  amount *= Math.exp(-AMBIENCE.cues.shakeDecay * dt);
  if (amount < 0.0002) amount = 0;
  phase += dt;
}

export function readShakeOffset(): { yaw: number; pitch: number } {
  if (amount <= 0) return { yaw: 0, pitch: 0 };
  const yaw = (Math.sin(phase * 47) * 0.6 + Math.sin(phase * 83 + 1.3) * 0.4) * amount;
  const pitch = (Math.sin(phase * 59 + 0.7) * 0.6 + Math.sin(phase * 71 + 2.1) * 0.4) * amount;
  return { yaw, pitch };
}
