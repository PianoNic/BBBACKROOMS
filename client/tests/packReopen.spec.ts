import { test, expect } from "@playwright/test";
import { deflateSync } from "node:zlib";
import { mockBackend } from "./backendMocks";

const ROSTER = [
  {
    image: "001-Test-Teacher.jpg",
    name: "Test Teacher",
    subject: "Sport",
    ability: "test_ability",
  },
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function makeSolidPng(r: number, g: number, b: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0);
  ihdrData.writeUInt32BE(1, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const raw = Buffer.from([0, r, g, b]);
  const idatData = deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdrData),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const PNG_RED = makeSolidPng(220, 20, 20);
const PNG_BLUE = makeSolidPng(20, 20, 220);

test("reopening an installed pack lets you replace a slot and reinstall", async ({ page }) => {
  test.setTimeout(120_000);

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

  await page.locator("#pack-consent-check").check();
  await page.locator("#pack-consent-accept").click();
  await expect(page.locator("#pack-consent")).not.toBeAttached();

  await page.setInputFiles("#pack-slot-file-0", {
    name: "red.png",
    mimeType: "image/png",
    buffer: PNG_RED,
  });
  await expect(page.locator("#pack-slot-0")).toHaveAttribute("data-ready", "true");

  await page.click("#pack-editor-install");
  await expect(page.locator("#pack-editor-status")).toHaveText(/installiert/);
  await expect(page.locator("#pack-editor-status")).not.toHaveClass(/error/);

  const first = await page.evaluate(async () => {
    const mod = await import("/src/core/texturePacks.ts");
    const packs = await mod.listPacks();
    const pack = packs.find((p) => p.id === "mein-pack");
    if (!pack) throw new Error("pack not installed");
    await mod.setActivePackId(pack.id);
    const resolved = mod.resolveTeacherImage(undefined, 0, "/teachers/001-Test-Teacher.jpg");
    return { hash: pack.hash, resolved };
  });
  expect(first.resolved.startsWith("blob:")).toBe(true);

  await page.getByRole("button", { name: "PACK ÖFFNEN" }).click();
  await page.getByRole("button", { name: /Mein Pack v1\.0\.0/ }).click();

  await expect(page.locator("#pack-editor-id")).toHaveValue("mein-pack");
  await expect(page.locator("#pack-editor-version")).toHaveValue("1.0.0");
  await expect(page.locator("#pack-slot-0")).toHaveAttribute("data-ready", "true");

  await page.setInputFiles("#pack-slot-file-0", {
    name: "blue.png",
    mimeType: "image/png",
    buffer: PNG_BLUE,
  });
  await expect(page.locator("#pack-slot-0")).toHaveAttribute("data-ready", "true");

  await page.click("#pack-editor-install");
  await expect(page.locator("#pack-editor-status")).toHaveText(/installiert/);
  await expect(page.locator("#pack-editor-status")).not.toHaveClass(/error/);

  await expect(page.locator("#pack-editor-version")).toHaveValue("1.0.1");

  const second = await page.evaluate(async () => {
    const mod = await import("/src/core/texturePacks.ts");
    const packs = await mod.listPacks();
    const pack = packs.find((p) => p.id === "mein-pack");
    if (!pack) throw new Error("pack not installed");
    await mod.setActivePackId(pack.id);
    const resolved = mod.resolveTeacherImage(undefined, 0, "/teachers/001-Test-Teacher.jpg");
    return { hash: pack.hash, version: pack.version, resolved };
  });

  expect(second.version).toBe("1.0.1");
  expect(second.hash).not.toBe(first.hash);
  expect(second.resolved.startsWith("blob:")).toBe(true);
  expect(second.resolved).not.toBe(first.resolved);
});
