import type { ScreenDirection } from "../../screenTransition";

export const DURATION = 600;
export const EASING = "cubic-bezier(0.45, 0.05, 0.55, 0.95)";
const NEAR_Z = 420;
const FAR_Z = -560;

export function exitKeyframes(direction: ScreenDirection): Keyframe[] {
  const endZ = direction === "forward" ? NEAR_Z : FAR_Z;
  const midZ = endZ / 2;
  return [
    { offset: 0, transform: "translate3d(0, 0, 0)", opacity: 1, filter: "blur(0px)" },
    { offset: 0.45, transform: `translate3d(0, -7px, ${midZ}px)` },
    { offset: 1, transform: `translate3d(0, 0, ${endZ}px)`, opacity: 0, filter: "blur(7px)" },
  ];
}

export function enterKeyframes(direction: ScreenDirection): Keyframe[] {
  const startZ = direction === "forward" ? FAR_Z : NEAR_Z;
  const midZ = startZ / 2;
  return [
    { offset: 0, transform: `translate3d(0, 10px, ${startZ}px)`, opacity: 0, filter: "blur(8px)" },
    { offset: 0.55, transform: `translate3d(0, -4px, ${midZ}px)` },
    { offset: 1, transform: "translate3d(0, 0, 0)", opacity: 1, filter: "blur(0px)" },
  ];
}

export function runAnimation(
  target: HTMLElement,
  keyframes: Keyframe[],
  fill: FillMode,
): Promise<void> {
  const animation = target.animate(keyframes, { duration: DURATION, easing: EASING, fill });
  return animation.finished.then(() => undefined).catch(() => undefined);
}
