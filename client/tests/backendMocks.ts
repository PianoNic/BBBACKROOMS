import type { Page } from "@playwright/test";

const JSON_ROUTES: Record<string, unknown> = {
  "**/auth/me": { account: null },
  "**/auth/providers": { google: false, microsoft: false },
  "**/auth/ws-ticket": { ticket: "" },
  "**/version": { version: "0.0.0-test" },
  "**/shop/catalog": [],
  "**/shop/me": { signedIn: false, balance: 0, owned: [], equipped: {} },
  "**/lobbies": [],
  "**/turn-credentials": { iceServers: [] },
  "**/announcements": [],
};

export async function mockBackend(page: Page): Promise<void> {
  for (const [pattern, body] of Object.entries(JSON_ROUTES)) {
    await page.route(pattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      }),
    );
  }
}
