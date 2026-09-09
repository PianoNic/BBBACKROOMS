import { test, expect } from "@playwright/test";
import { mockBackend } from "./backendMocks";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const ROSTER = [
  {
    image: "001-Yasmin-Caduff.jpg",
    name: "Yasmin Caduff",
    subject: "Sport",
    ability: "basketball_throw",
  },
  {
    image: "002-Matteo-Rohrer.jpg",
    name: "Matteo Rohrer",
    subject: "Sport",
    ability: "dodgeball_throw",
  },
  {
    image: "003-Ladina-Wettstein.jpg",
    name: "Ladina Wettstein",
    subject: "Sport",
    ability: "shotput_throw",
  },
];

test("pack editor builds a zip without any network traffic", async ({ page }) => {
  test.setTimeout(90_000);

  await page.addInitScript(() => sessionStorage.setItem("bbb-intro-seen", "1"));

  await mockBackend(page);
  await page.route("**/roster", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ROSTER),
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "OPTIONS" }).click();

  const openButton = page.locator("#pack-editor-open");
  await openButton.scrollIntoViewIfNeeded();
  await openButton.click();

  await expect(page.locator("#pack-editor")).toBeVisible();
  await page.waitForLoadState("networkidle");

  const requests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (
      /^(https?|wss?):/.test(url) &&
      !url.includes("/@vite/") &&
      !url.includes("/@react-refresh") &&
      !url.includes("__vite")
    ) {
      requests.push(url);
    }
  });

  const sockets: string[] = [];
  page.on("websocket", (ws) => sockets.push(ws.url()));

  await page.locator("#pack-consent-check").check();
  await page.locator("#pack-consent-accept").click();
  await expect(page.locator("#pack-consent")).not.toBeAttached();

  await page.setInputFiles("#pack-slot-file-0", {
    name: "portrait.png",
    mimeType: "image/png",
    buffer: PNG,
  });

  await expect(page.locator("#pack-slot-0")).toHaveAttribute("data-ready", "true");

  const downloadPromise = page.waitForEvent("download");
  await page.click("#pack-editor-download");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.zip$/);

  expect(requests).toEqual([]);
  expect(sockets).toEqual([]);
});
