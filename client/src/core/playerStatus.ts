/** Live debuff state pushed by the server (slow / stun timers).
 *
 * The teacher abilities apply timed effects. The server is the source of
 * truth and ticks down on each loop iteration; the client mirrors the
 * latest values so the player's movement code can read them without doing
 * its own timer math. */

let slowUntilMs = 0;
let slowFactor = 1;
let stunUntilMs = 0;
let hasteUntilMs = 0;
let hasteFactor = 1;
let carryingChair = false;
const CHAIR_CARRY_SLOW = 0.55;

export function setCarryingChair(v: boolean): void {
  carryingChair = v;
}

export function isCarryingChair(): boolean {
  return carryingChair;
}

export function setStatus(
  slowMs: number, factor: number, stunMs: number,
  hasteMsArg = 0, hasteFactorArg = 1,
): void {
  const now = performance.now();
  slowUntilMs = now + slowMs;
  slowFactor = factor;
  stunUntilMs = now + stunMs;
  if (hasteMsArg > 0) {
    hasteUntilMs = now + hasteMsArg;
    hasteFactor = hasteFactorArg;
  }
}

export function speedMultiplier(): number {
  const now = performance.now();
  let base = now < slowUntilMs ? slowFactor : 1;
  if (now < hasteUntilMs) base *= hasteFactor;
  return carryingChair ? base * CHAIR_CARRY_SLOW : base;
}

export function hasteRemaining(): number {
  return Math.max(0, hasteUntilMs - performance.now());
}

export function isStunned(): boolean {
  return performance.now() < stunUntilMs;
}
