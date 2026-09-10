import { test, expect } from "@playwright/test";
import { mockBackend } from "./backendMocks";

test("title screens transition forward and back through the screen stage", async ({ page }) => {
  test.setTimeout(60_000);

  await page.addInitScript(() => sessionStorage.setItem("nachsitzen-intro-seen", "1"));

  await mockBackend(page);

  await page.goto("/");

  await expect(page.getByRole("button", { name: "PLAY" })).toBeVisible();

  await page.getByRole("button", { name: "PLAY" }).click();

  await expect(page.getByRole("heading", { name: "SERVERS" })).toBeVisible();

  await expect(page.locator(".screen-stage > .screen")).toHaveCount(1);

  await page.getByRole("button", { name: "← BACK" }).click();

  await expect(page.getByRole("button", { name: "PLAY" })).toBeVisible();
  await expect(page.locator(".screen-stage > .screen")).toHaveCount(1);
});
