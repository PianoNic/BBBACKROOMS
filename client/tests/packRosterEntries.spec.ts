import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { mockBackend } from "./backendMocks";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const ABILITIES = [
  "basketball_throw", "dodgeball_throw", "shotput_throw", "silent_steps",
  "lights_off", "chalk_toss", "whistle_blast", "hall_pass", "detention_stare",
  "locker_slam", "roll_call", "pop_quiz", "hurdle_jump", "relay_baton",
  "bench_press", "clipboard_swing", "gym_mat_flip", "stopwatch_click",
  "flashlight_glare", "megaphone_shout", "trophy_toss", "cone_stack",
  "jump_rope_snap", "scoreboard_buzz", "sneaker_squeak", "textbook_drop",
  "marker_squeak", "eraser_clap", "projector_flicker", "backpack_swing",
];

const BIG_ROSTER = Array.from({ length: 122 }, (_, i) => ({
  image: `${String(i + 1).padStart(3, "0")}-Teacher-${i}.jpg`,
  name: `Teacher ${i}`,
  subject: "Fach",
  ability: ABILITIES[i % ABILITIES.length],
}));

test("a pack with an entry per roster teacher imports", async ({ page }) => {
  test.setTimeout(180_000);

  await page.addInitScript(() => sessionStorage.setItem("bbb-intro-seen", "1"));

  await mockBackend(page);
  await page.route("**/roster", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(BIG_ROSTER),
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

  for (let i = 0; i < BIG_ROSTER.length; i++) {
    await page.setInputFiles(`#pack-slot-file-${i}`, {
      name: "portrait.png",
      mimeType: "image/png",
      buffer: PNG,
    });
  }

  await expect(page.locator("#pack-editor-slots .pack-slot[data-ready=\"true\"]")).toHaveCount(122);

  await page.fill("#pack-slot-name-0", "Frau Muster");
  await page.fill("#pack-slot-name-6", "Herr Sechs");
  await page.fill("#pack-slot-name-121", "Herr Beispiel");

  const downloadPromise = page.waitForEvent("download");
  await page.click("#pack-editor-download");
  const download = await downloadPromise;
  const zipPath = await download.path();
  const zipBytes = await readFile(zipPath);
  const zip = await JSZip.loadAsync(zipBytes);
  const manifestFile = zip.file("pack.json");
  if (!manifestFile) throw new Error("pack.json missing from downloaded zip");
  const manifest = JSON.parse(await manifestFile.async("string")) as {
    teachers: Record<string, { image: string; name?: string }>;
  };

  for (let i = 0; i < BIG_ROSTER.length; i++) {
    expect(manifest.teachers[String(i)]).toBeDefined();
  }
  const teacherKeyCount = Object.keys(manifest.teachers).length;
  expect(teacherKeyCount).toBeGreaterThan(122);
  expect(teacherKeyCount).toBeLessThanOrEqual(256);
  expect(manifest.teachers["0"].name).toBe("Frau Muster");
  expect(manifest.teachers["6"].name).toBe("Herr Sechs");
  expect(manifest.teachers["121"].name).toBe("Herr Beispiel");

  await page.click("#pack-editor-install");

  const status = page.locator("#pack-editor-status");
  await expect(status).toHaveText(/installiert/);
  await expect(status).not.toHaveClass(/error/);

  const resolved = await page.evaluate(async () => {
    const mod = await import("/src/core/texturePacks.ts");
    const packs = await mod.listPacks();
    await mod.setActivePackId(packs[0].id);
    return {
      byIndex: mod.resolveTeacherImage(undefined, 6, "/teachers/007-Teacher-6.jpg"),
      derived: mod.resolveTeacherImage(undefined, -1, "/teachers/007-Teacher-6.jpg"),
      derivedName: mod.resolveTeacherName(undefined, -1, "Teacher 6"),
      unknown: mod.resolveTeacherImage(undefined, -1, "/teachers/unmatched.jpg"),
    };
  });

  expect(resolved.derived.startsWith("blob:")).toBe(true);
  expect(resolved.derived).toBe(resolved.byIndex);
  expect(resolved.derivedName).toBe("Herr Sechs");
  expect(resolved.unknown).toBe("/teachers/unmatched.jpg");
});
