import { playFootstep } from "../core/audio";

export type ScreenDirection = "forward" | "back";

const DURATION = 600;
const EASING = "cubic-bezier(0.45, 0.05, 0.55, 0.95)";
const NEAR_Z = 420;
const FAR_Z = -560;
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

let transitioning = false;

export function isTransitioning(): boolean {
  return transitioning;
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function focusFirst(screen: HTMLElement): void {
  const target = screen.querySelector<HTMLElement>(FOCUSABLE);
  target?.focus({ preventScroll: true });
}

function getStage(screen: HTMLElement): Element | null {
  const parent = screen.parentElement;
  return parent?.classList.contains("screen-stage") ? parent : null;
}

function setStageTransitioning(stage: Element | null, on: boolean): void {
  stage?.classList.toggle("is-transitioning", on);
}

function exitKeyframes(direction: ScreenDirection): Keyframe[] {
  const endZ = direction === "forward" ? NEAR_Z : FAR_Z;
  const midZ = endZ / 2;
  return [
    { offset: 0, transform: "translate3d(0, 0, 0)", opacity: 1, filter: "blur(0px)" },
    { offset: 0.45, transform: `translate3d(0, -7px, ${midZ}px)` },
    { offset: 1, transform: `translate3d(0, 0, ${endZ}px)`, opacity: 0, filter: "blur(7px)" },
  ];
}

function enterKeyframes(direction: ScreenDirection): Keyframe[] {
  const startZ = direction === "forward" ? FAR_Z : NEAR_Z;
  const midZ = startZ / 2;
  return [
    { offset: 0, transform: `translate3d(0, 10px, ${startZ}px)`, opacity: 0, filter: "blur(8px)" },
    { offset: 0.55, transform: `translate3d(0, -4px, ${midZ}px)` },
    { offset: 1, transform: "translate3d(0, 0, 0)", opacity: 1, filter: "blur(0px)" },
  ];
}

function runAnimation(target: HTMLElement, keyframes: Keyframe[], fill: FillMode): Promise<void> {
  const animation = target.animate(keyframes, { duration: DURATION, easing: EASING, fill });
  return animation.finished.then(() => undefined).catch(() => undefined);
}

async function withTransition(fn: () => Promise<void>): Promise<void> {
  transitioning = true;
  try {
    await fn();
  } finally {
    transitioning = false;
  }
}

export function swapScreens(
  stage: HTMLElement,
  from: HTMLElement,
  to: HTMLElement,
  direction: ScreenDirection,
): Promise<void> {
  stage.appendChild(to);

  if (prefersReducedMotion()) {
    from.remove();
    focusFirst(to);
    return Promise.resolve();
  }

  setStageTransitioning(stage, true);
  return withTransition(async () => {
    playFootstep(0.4);
    try {
      await Promise.all([
        runAnimation(from, exitKeyframes(direction), "forwards"),
        runAnimation(to, enterKeyframes(direction), "none"),
      ]);
      focusFirst(to);
    } finally {
      from.remove();
      setStageTransitioning(stage, false);
    }
  });
}

export function enterScreen(screen: HTMLElement, direction: ScreenDirection): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve();
  const stage = getStage(screen);
  setStageTransitioning(stage, true);
  return withTransition(async () => {
    playFootstep(0.4);
    try {
      await runAnimation(screen, enterKeyframes(direction), "none");
      focusFirst(screen);
    } finally {
      setStageTransitioning(stage, false);
    }
  });
}

export function exitScreen(screen: HTMLElement, direction: ScreenDirection): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve();
  const stage = getStage(screen);
  setStageTransitioning(stage, true);
  return withTransition(async () => {
    playFootstep(0.4);
    try {
      await runAnimation(screen, exitKeyframes(direction), "forwards");
    } finally {
      setStageTransitioning(stage, false);
    }
  });
}
