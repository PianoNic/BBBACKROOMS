import { test, expect, type Page, type Locator } from "@playwright/test";
import { mockBackend } from "./backendMocks";

interface Viewport {
  name: string;
  width: number;
  height: number;
}

const VIEWPORTS: Viewport[] = [
  { name: "phone-portrait", width: 360, height: 740 },
  { name: "phone-landscape", width: 740, height: 360 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "desktop", width: 1920, height: 1080 },
  { name: "ultrawide", width: 3440, height: 1440 },
];

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function assertInsideViewport(locator: Locator, viewport: Viewport): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function settle(page: Page): Promise<void> {
  await expect(page.locator(".screen-stage > .screen")).toHaveCount(1);
  await expect(page.locator(".screen-stage")).not.toHaveClass(/is-transitioning/);
}

async function assertScreen(
  page: Page,
  viewport: Viewport,
  screenName: string,
  primaryAction: Locator,
): Promise<void> {
  await expect(primaryAction).toBeVisible();
  await settle(page);
  await assertNoHorizontalOverflow(page);
  await assertInsideViewport(primaryAction, viewport);
  await page.screenshot({ path: `test-results/responsive/${viewport.name}-${screenName}.png` });
}

for (const viewport of VIEWPORTS) {
  test(`${viewport.name} menu walk-through fits the viewport`, async ({ page }) => {
    test.setTimeout(120_000);

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(() => sessionStorage.setItem("bbb-intro-seen", "1"));
    await mockBackend(page);

    await page.goto("/");

    const menu = page.locator("nav.menu");
    const playButton = menu.getByRole("button", { name: "PLAY" });
    await assertScreen(page, viewport, "title", playButton);

    await playButton.click();
    const createLobbyButton = page.getByRole("button", { name: "+ CREATE NEW LOBBY" });
    await assertScreen(page, viewport, "servers", createLobbyButton);

    await page.getByRole("button", { name: "← BACK" }).click();
    await expect(playButton).toBeVisible();

    await menu.getByRole("button", { name: "OPTIONS" }).click();
    const optionsBackButton = page.getByRole("button", { name: "← BACK" });
    await assertScreen(page, viewport, "options", optionsBackButton);

    await optionsBackButton.click();
    await expect(playButton).toBeVisible();

    await menu.getByRole("button", { name: "SHOP" }).click();
    const shopBackButton = page.getByRole("button", { name: "← BACK" });
    await assertScreen(page, viewport, "shop", shopBackButton);

    await shopBackButton.click();
    await expect(playButton).toBeVisible();

    await menu.getByRole("button", { name: "TUTORIAL" }).click();
    const tutorialBackButton = page.getByRole("button", { name: "← BACK" });
    await assertScreen(page, viewport, "tutorial", tutorialBackButton);

    await tutorialBackButton.click();
    await expect(playButton).toBeVisible();
  });
}
