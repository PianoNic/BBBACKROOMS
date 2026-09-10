import { test, expect } from "@playwright/test";
import { mockBackend } from "./backendMocks";

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
];

function buildWavFile(dataLength = 200): Buffer {
  const header = Buffer.alloc(44);
  const sampleRate = 8000;
  const bitsPerSample = 16;
  const channels = 1;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, Buffer.alloc(dataLength, 0)]);
}

test("a pack with a replaced sound resolves to a blob url once active", async ({ page }) => {
  test.setTimeout(90_000);

  await page.addInitScript(() => sessionStorage.setItem("nachsitzen-intro-seen", "1"));

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

  const defaultBefore = await page.evaluate(() => {
    const w = window as unknown as {
      nachsitzenPackAudioDev?: { resolveSound: (id: string, defaultUrl: string) => string };
    };
    return w.nachsitzenPackAudioDev?.resolveSound("pickup", "/sounds/actions/pickup.ogg");
  });
  expect(defaultBefore).toBe("/sounds/actions/pickup.ogg");

  const openButton = page.locator("#pack-editor-open");
  await openButton.scrollIntoViewIfNeeded();
  await openButton.click();

  await expect(page.locator("#pack-editor")).toBeVisible();

  await page.locator("#pack-consent-check").check();
  await page.locator("#pack-consent-accept").click();
  await expect(page.locator("#pack-consent")).not.toBeAttached();

  await page.locator("#pack-editor-tab-audio").click();
  await expect(page.locator("#pack-editor-audio")).toBeVisible();

  await page.setInputFiles("#pack-audio-file-pickup", {
    name: "custom-pickup.wav",
    mimeType: "audio/wav",
    buffer: buildWavFile(),
  });

  await expect(page.locator("#pack-audio-row-pickup .pack-audio-row-filename")).toHaveText("custom-pickup.wav");

  const installButton = page.locator("#pack-editor-install");
  await expect(installButton).toBeEnabled();
  await installButton.click();

  const status = page.locator("#pack-editor-status");
  await expect(status).toHaveText(/installiert/);
  await expect(status).not.toHaveClass(/error/);

  const resolvedAfterActivation = await page.evaluate(async () => {
    const mod = await import("/src/core/texturePacks.ts");
    await mod.setActivePackId("mein-pack");
    const w = window as unknown as {
      nachsitzenPackAudioDev?: { resolveSound: (id: string, defaultUrl: string) => string };
    };
    return w.nachsitzenPackAudioDev?.resolveSound("pickup", "/sounds/actions/pickup.ogg");
  });

  expect(resolvedAfterActivation?.startsWith("blob:")).toBe(true);

  const resolvedAfterDeactivation = await page.evaluate(async () => {
    const mod = await import("/src/core/texturePacks.ts");
    await mod.setActivePackId(null);
    const w = window as unknown as {
      nachsitzenPackAudioDev?: { resolveSound: (id: string, defaultUrl: string) => string };
    };
    return w.nachsitzenPackAudioDev?.resolveSound("pickup", "/sounds/actions/pickup.ogg");
  });

  expect(resolvedAfterDeactivation).toBe("/sounds/actions/pickup.ogg");
});
