import { signal } from "@preact/signals";
import { getMe, getProviders, logout } from "../../../net/auth";
import type { Account, Providers } from "../../../net/auth";

export const account = signal<Account | null>(null);
export const providers = signal<Providers>({ google: false, microsoft: false });
export const accountLoaded = signal(false);

export type LoginStatus = "ok" | "error" | "blocked" | null;

function readLoginStatus(): LoginStatus {
  const params = new URLSearchParams(location.search);
  const status = params.get("login");
  if (status !== "ok" && status !== "error" && status !== "blocked") return null;
  params.delete("login");
  const qs = params.toString();
  history.replaceState(null, "", location.pathname + (qs ? `?${qs}` : "") + location.hash);
  return status;
}

export const loginStatus: LoginStatus = readLoginStatus();

export async function refreshAccount(): Promise<void> {
  const [me, provs] = await Promise.all([getMe(), getProviders()]);
  account.value = me;
  providers.value = provs;
  accountLoaded.value = true;
}

export async function signOut(): Promise<void> {
  await logout();
  await refreshAccount();
}
