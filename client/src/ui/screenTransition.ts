export type ScreenDirection = "forward" | "back";

let transitioning = false;

export function isTransitioning(): boolean {
  return transitioning;
}

export function setTransitioning(on: boolean): void {
  transitioning = on;
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export async function enterScreen(screen: HTMLElement, direction: ScreenDirection): Promise<void> {
  if (prefersReducedMotion()) return;
  const { enterKeyframes, runAnimation } = await import("./menu/transition/keyframes");
  setTransitioning(true);
  try {
    await runAnimation(screen, enterKeyframes(direction), "none");
  } finally {
    setTransitioning(false);
  }
}

export async function exitScreen(screen: HTMLElement, direction: ScreenDirection): Promise<void> {
  if (prefersReducedMotion()) return;
  const { exitKeyframes, runAnimation } = await import("./menu/transition/keyframes");
  setTransitioning(true);
  try {
    await runAnimation(screen, exitKeyframes(direction), "forwards");
  } finally {
    setTransitioning(false);
  }
}
