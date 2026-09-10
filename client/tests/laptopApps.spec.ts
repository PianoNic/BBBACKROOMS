import { test, expect } from "@playwright/test";
import { mockBackend } from "./backendMocks";

type Sent = { type: string; laptopId?: string; choice?: string };

declare global {
  interface Window {
    __sent: Sent[];
    __laptop: {
      open: (id: string, game: string, done: boolean, challenge?: unknown) => void;
      applyResult: (pkt: unknown) => void;
      isOpen: () => boolean;
      close: () => void;
    };
  }
}

async function bootLaptop(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => sessionStorage.setItem("nachsitzen-intro-seen", "1"));
  await mockBackend(page);
  await page.goto("/");
  await page.waitForFunction(() => document.getElementById("menu-root") !== null);
  await page.evaluate(async () => {
    const mod = await import("/src/ui/laptop/index.tsx");
    window.__sent = [];
    const net = {
      send: (pkt: Sent) => window.__sent.push(pkt),
      onPacket: () => undefined,
      close: () => undefined,
    };
    window.__laptop = new mod.LaptopOverlay(net as never);
  });
}

test("a Moodle quiz laptop app renders and reports the chosen answer", async ({ page }) => {
  await bootLaptop(page);

  await page.evaluate(() =>
    window.__laptop.open("lap-quiz", "moodle_quiz", false, {
      course: { name: "Mathematik", code: "M101" },
      quizTitle: "Abschlusstest",
      question: "Wie viele Ecken hat ein Würfel?",
      options: ["6", "8", "12"],
    }),
  );

  await expect(page.locator("#laptop .browser.shell-moodle")).toBeVisible();
  await expect(page.locator("#laptop .toolbar .url")).toHaveText(
    "https://moodle.backrooms-baden.ch/",
  );

  await page.locator("#laptop .moodle-login-btn").click();
  await expect(page.locator("#laptop .m-quiz-question")).toHaveText(
    "Wie viele Ecken hat ein Würfel?",
  );

  await page.locator("#laptop .m-quiz-option", { hasText: "8" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__sent))
    .toEqual([{ type: "gamble_play", laptopId: "lap-quiz", choice: "8" }]);

  await page.evaluate(() =>
    window.__laptop.applyResult({
      type: "gamble_result",
      laptopId: "lap-quiz",
      game: "moodle_quiz",
      win: true,
      choice: "8",
    }),
  );
  await expect(page.locator("#laptop .challenge-status.win")).toBeVisible();
  await expect(page.locator("#laptop")).toHaveCount(0, { timeout: 6000 });
});

test("a casino laptop app renders and Escape closes the window", async ({ page }) => {
  await bootLaptop(page);

  await page.evaluate(() => window.__laptop.open("lap-coin", "coinflip", false));

  await expect(page.locator("#laptop .browser.shell-casino")).toBeVisible();
  await expect(page.locator("#laptop .game.coinflip .choice")).toHaveCount(2);

  await page.locator("#laptop .game.coinflip .choice", { hasText: "tails" }).click();
  await page.locator("#laptop .game.coinflip button.flip").click();
  await expect
    .poll(() => page.evaluate(() => window.__sent))
    .toEqual([{ type: "gamble_play", laptopId: "lap-coin", choice: "tails" }]);

  await page.keyboard.press("Escape");
  await expect(page.locator("#laptop")).toHaveCount(0);
});
