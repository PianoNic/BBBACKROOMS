import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { decodeBbpack, encodeBbpack } from "../src/core/bbpack";
import { mockBackend } from "./backendMocks";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const ROSTER = [
  {
    image: "001-Rosmarie-Egger.jpg",
    name: "Rosmarie Egger",
    subject: "Sport",
    ability: "basketball_throw",
  },
  {
    image: "002-Monika-Uehlinger.jpg",
    name: "Monika Uehlinger",
    subject: "Sport",
    ability: "dodgeball_throw",
  },
  {
    image: "003-Kurt-Jauch.jpg",
    name: "Kurt Jauch",
    subject: "Sport",
    ability: "shotput_throw",
  },
];

test("pack editor builds a bbpack without any network traffic", async ({ page }) => {
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
  expect(download.suggestedFilename()).toMatch(/\.bbpack$/);

  const packPath = await download.path();
  const packBytes = await readFile(packPath);
  const { manifest, assets } = decodeBbpack(new Uint8Array(packBytes));
  const parsedManifest = manifest as {
    id: string; version: string; name: string; teachers: Record<string, { image: string; name?: string }>;
  };
  expect(parsedManifest.id).toBe("mein-pack");
  expect(parsedManifest.version).toBe("1.0.0");
  expect(parsedManifest.name).toBe("Mein Pack");

  const assetNames = new Set(assets.map((a) => a.name));
  for (const entry of Object.values(parsedManifest.teachers)) {
    expect(assetNames.has(entry.image)).toBe(true);
  }
  for (const asset of assets) {
    expect(asset.mime).toBe("image/jpeg");
  }

  expect(requests).toEqual([]);
  expect(sockets).toEqual([]);
});

test("bbpack encode/decode round-trips and rejects corrupted input", () => {
  const manifest = { id: "spooky-pack", version: "1.0.0", name: "Spooky Pack", teachers: { "0": { image: "a.jpg" } } };
  const assets = [
    { name: "a.jpg", mime: "image/jpeg", bytes: new Uint8Array([1, 2, 3, 4, 5]) },
    { name: "b.png", mime: "image/png", bytes: new Uint8Array([9, 8, 7]) },
  ];

  const encoded = encodeBbpack(manifest, assets);
  const decoded = decodeBbpack(encoded);

  expect(decoded.manifest).toEqual(manifest);
  expect(decoded.assets.length).toBe(assets.length);
  for (let i = 0; i < assets.length; i++) {
    expect(decoded.assets[i].name).toBe(assets[i].name);
    expect(decoded.assets[i].mime).toBe(assets[i].mime);
    expect(Array.from(decoded.assets[i].bytes)).toEqual(Array.from(assets[i].bytes));
  }

  const corruptedMagic = encoded.slice();
  corruptedMagic[0] = 0;
  expect(() => decodeBbpack(corruptedMagic)).toThrow();

  const trailingByte = new Uint8Array(encoded.length + 1);
  trailingByte.set(encoded, 0);
  trailingByte[encoded.length] = 0xff;
  expect(() => decodeBbpack(trailingByte)).toThrow();
});
