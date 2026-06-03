/** Client side of optional OAuth accounts.
 *
 *  All calls are credentialed (the session lives in an HttpOnly cookie, so JS
 *  can't read it directly — `getMe()` is the read path). Everything degrades to
 *  "logged out" on any error, so a missing/old backend never breaks the title. */

const API = import.meta.env.VITE_SERVER_URL ?? "";

export type Account = {
  accountId: number;
  provider: string;
  displayName: string | null;
  email: string | null;
  xp: number;
  coins: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
};

export type Providers = { google: boolean; microsoft: boolean };

export async function getMe(): Promise<Account | null> {
  try {
    const r = await fetch(`${API}/auth/me`, { credentials: "include" });
    if (!r.ok) return null;
    const data = (await r.json()) as { account: Account | null };
    return data.account ?? null;
  } catch {
    return null;
  }
}

export async function getProviders(): Promise<Providers> {
  try {
    const r = await fetch(`${API}/auth/providers`, { credentials: "include" });
    if (!r.ok) return { google: false, microsoft: false };
    return (await r.json()) as Providers;
  } catch {
    return { google: false, microsoft: false };
  }
}

/** Full-page navigation — OAuth must be a top-level redirect, not a fetch. */
export function loginUrl(provider: "google" | "microsoft"): string {
  return `${API}/auth/${provider}/login`;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    /* ignore — UI re-renders as logged out regardless */
  }
}

/** Short-lived token to authenticate the WebSocket. null = guest. */
export async function getWsTicket(): Promise<string | null> {
  try {
    const r = await fetch(`${API}/auth/ws-ticket`, { credentials: "include" });
    if (!r.ok) return null;
    const data = (await r.json()) as { ticket?: string };
    return data.ticket ?? null;
  } catch {
    return null;
  }
}
