import { test, expect, type Page } from "@playwright/test";
import { mockBackend } from "./backendMocks";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const STAGE_ORDER = ["stage-black", "stage-entry", "stage-shake", "stage-hold", "stage-fade"];

async function prepareJumpscarePage(page: Page): Promise<void> {
  await page.addInitScript(() => sessionStorage.setItem("nachsitzen-intro-seen", "1"));
  await mockBackend(page);
  await page.route("**/teachers/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PNG }),
  );
  await page.goto("/");
  await page.addScriptTag({
    type: "module",
    content: "import { jumpscare } from '/src/ui/jumpscare.ts';"
      + "import { JUMPSCARE_VARIANTS, totalDurationMs } from '/src/ui/jumpscareTiming.ts';"
      + "window.__jumpscare = jumpscare;"
      + "window.__variants = JUMPSCARE_VARIANTS;"
      + "window.__total = totalDurationMs;",
  });
  await page.waitForFunction(() => typeof (window as unknown as { __jumpscare?: unknown }).__jumpscare === "function");
}

async function triggerAndWatch(page: Page): Promise<void> {
  await page.evaluate((imageUrl) => {
    const w = window as unknown as {
      __jumpscare: (imageUrl: string, name?: string, subject?: string) => void;
      __jumpscareClasses: string[];
      __jumpscareObserver?: MutationObserver;
      __jumpscareDeltas: number[];
      __jumpscareRaf: number;
    };
    w.__jumpscareClasses = [];
    w.__jumpscareDeltas = [];

    const record = (target: Element): void => {
      w.__jumpscareClasses.push(target.className);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof Element && node.id === "jumpscare") record(node);
          }
        } else if (mutation.type === "attributes" && mutation.attributeName === "class") {
          record(mutation.target as Element);
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    w.__jumpscareObserver = observer;

    let last = performance.now();
    const sample = (now: number): void => {
      w.__jumpscareDeltas.push(now - last);
      last = now;
      w.__jumpscareRaf = requestAnimationFrame(sample);
    };
    w.__jumpscareRaf = requestAnimationFrame(sample);

    w.__jumpscare(imageUrl, "Frau Test", "Deutsch");
  }, "/teachers/stub.png");
}

async function collectJumpscareResult(page: Page): Promise<{
  classes: string[];
  deltas: number[];
  exists: boolean;
}> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __jumpscareClasses: string[];
      __jumpscareDeltas: number[];
      __jumpscareObserver?: MutationObserver;
      __jumpscareRaf: number;
    };
    cancelAnimationFrame(w.__jumpscareRaf);
    w.__jumpscareObserver?.disconnect();
    return {
      classes: w.__jumpscareClasses,
      deltas: w.__jumpscareDeltas,
      exists: !!document.getElementById("jumpscare"),
    };
  });
}

function assertStageOrder(classes: string[]): void {
  let cursor = 0;
  for (const entry of classes) {
    if (cursor < STAGE_ORDER.length && entry.includes(STAGE_ORDER[cursor])) cursor++;
  }
  expect(cursor).toBe(STAGE_ORDER.length);
}

function countCutToggles(classes: string[]): { onCount: number; offCount: number } {
  let onCount = 0;
  let offCount = 0;
  let wasCut = false;
  for (const entry of classes) {
    const isCut = entry.includes("stage-cut");
    if (isCut && !wasCut) onCount++;
    if (!isCut && wasCut) offCount++;
    wasCut = isCut;
  }
  return { onCount, offCount };
}

test("jumpscare overlay runs the full stage sequence and cleans itself up", async ({ page }) => {
  test.setTimeout(60_000);

  await prepareJumpscarePage(page);
  await triggerAndWatch(page);

  await expect(page.locator("#jumpscare")).toBeVisible();

  await page.waitForTimeout(2500);

  const result = await collectJumpscareResult(page);

  expect(result.exists).toBe(false);
  assertStageOrder(result.classes);

  const { onCount, offCount } = countCutToggles(result.classes);
  expect(onCount).toBeGreaterThanOrEqual(2);
  expect(offCount).toBeGreaterThanOrEqual(2);

  const deltas = result.deltas.slice(1);
  expect(deltas.length).toBeGreaterThan(0);
  expect(Math.max(...deltas)).toBeLessThan(50);
});

test("jumpscare overlay is captured mid-sequence", async ({ page }) => {
  test.setTimeout(60_000);

  await prepareJumpscarePage(page);
  await triggerAndWatch(page);

  await expect(page.locator("#jumpscare")).toBeVisible();
  await page.waitForTimeout(250);
  await page.screenshot({ path: "test-results/jumpscare-shake.png" });
  await page.waitForTimeout(650);
  await page.screenshot({ path: "test-results/jumpscare-hold.png" });

  await page.waitForTimeout(1600);
  const result = await collectJumpscareResult(page);
  expect(result.exists).toBe(false);
  assertStageOrder(result.classes);
});

test("jumpscare overlay skips the flicker under reduced motion", async ({ page }) => {
  test.setTimeout(60_000);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepareJumpscarePage(page);
  await triggerAndWatch(page);

  await expect(page.locator("#jumpscare")).toBeVisible();

  await page.waitForTimeout(2500);

  const result = await collectJumpscareResult(page);

  expect(result.exists).toBe(false);
  const { onCount } = countCutToggles(result.classes);
  expect(onCount).toBe(0);
});
