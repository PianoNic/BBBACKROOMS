import type { RosterEntry } from "./protocol";

const API = import.meta.env.VITE_SERVER_URL ?? "";

export async function fetchRoster(): Promise<RosterEntry[]> {
  const r = await fetch(`${API}/roster`);
  if (!r.ok) throw new Error(`failed to load roster (${r.status})`);
  return (await r.json()) as RosterEntry[];
}
