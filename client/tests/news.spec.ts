import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test, expect, type Page } from "@playwright/test";
import { mockBackend } from "./backendMocks";

const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
const CURRENT_VERSION = (JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string }).version;

type AnnouncementFixture = {
  id: string;
  date: string;
  title: string;
  body: string;
  pinned?: boolean;
  level?: "info" | "important";
};

const INFO_ONLY: AnnouncementFixture[] = [
  { id: "a-info", date: "2026-01-01", title: "Info-Update", body: "Nur eine Information." },
];

const WITH_IMPORTANT: AnnouncementFixture[] = [
  { id: "a-info", date: "2026-01-01", title: "Info-Update", body: "Nur eine Information." },
  { id: "a-important", date: "2026-02-01", title: "Wartungsfenster", body: "Wichtige Ankündigung.", level: "important" },
  { id: "a-pinned", date: "2026-01-15", title: "Angeheftete News", body: "Angeheftete Ankündigung.", pinned: true },
];

async function mockAnnouncements(page: Page, list: AnnouncementFixture[]): Promise<void> {
  await page.route("**/announcements", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(list) }),
  );
}

async function skipIntro(page: Page): Promise<void> {
  await page.addInitScript(() => sessionStorage.setItem("bbb-intro-seen", "1"));
}

async function primeSeen(page: Page, version: string, ids: string[]): Promise<void> {
  await page.addInitScript(
    ([v, seenIds]) => {
      localStorage.setItem("nachsitzen_news_version", v as string);
      localStorage.setItem("nachsitzen_news_seen", JSON.stringify(seenIds));
    },
    [version, ids],
  );
}

test("NEWS button shows the unread badge when there is unseen news", async ({ page }) => {
  await skipIntro(page);
  await primeSeen(page, CURRENT_VERSION, []);
  await mockBackend(page);
  await mockAnnouncements(page, INFO_ONLY);

  await page.goto("/");

  await expect(page.getByRole("button", { name: "PLAY" })).toBeVisible();
  await expect(page.locator("nav.menu .news-dot")).toBeVisible();
  await expect(page.getByRole("heading", { name: "NEWS" })).toHaveCount(0);
});

test("the news screen auto-opens once for an unseen important announcement", async ({ page }) => {
  await skipIntro(page);
  await primeSeen(page, CURRENT_VERSION, []);
  await mockBackend(page);
  await mockAnnouncements(page, WITH_IMPORTANT);

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "NEWS" })).toBeVisible();
  await expect(page.getByText("Wartungsfenster")).toBeVisible();
  await expect(page.locator(".news-item-badge", { hasText: "Wichtig" })).toBeVisible();
});

test("the news screen does not auto-open again once the seen state is stored", async ({ page }) => {
  await skipIntro(page);
  await primeSeen(page, CURRENT_VERSION, WITH_IMPORTANT.map((entry) => entry.id));
  await mockBackend(page);
  await mockAnnouncements(page, WITH_IMPORTANT);

  await page.goto("/");

  await expect(page.getByRole("button", { name: "PLAY" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "NEWS" })).toHaveCount(0);
  await expect(page.locator("nav.menu .news-dot")).toHaveCount(0);
});

test("switching to the Änderungen tab shows a version heading from the changelog", async ({ page }) => {
  await skipIntro(page);
  await primeSeen(page, CURRENT_VERSION, INFO_ONLY.map((entry) => entry.id));
  await mockBackend(page);
  await mockAnnouncements(page, INFO_ONLY);

  await page.goto("/");

  await page.getByRole("button", { name: "NEWS" }).click();
  await expect(page.getByRole("heading", { name: "NEWS" })).toBeVisible();

  await page.getByRole("tab", { name: "Änderungen" }).click();

  await expect(page.getByRole("tab", { name: "Änderungen" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("v1.6.0")).toBeVisible();
});

test("going back from the news screen clears the badge", async ({ page }) => {
  await skipIntro(page);
  await primeSeen(page, CURRENT_VERSION, []);
  await mockBackend(page);
  await mockAnnouncements(page, INFO_ONLY);

  await page.goto("/");

  await expect(page.locator("nav.menu .news-dot")).toBeVisible();

  await page.getByRole("button", { name: "NEWS" }).click();
  await expect(page.getByRole("heading", { name: "NEWS" })).toBeVisible();

  await page.getByRole("button", { name: "← BACK" }).click();

  await expect(page.getByRole("button", { name: "PLAY" })).toBeVisible();
  await expect(page.locator("nav.menu .news-dot")).toHaveCount(0);
});
