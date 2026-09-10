import { signal } from "@preact/signals";
import {
  cacheRoster as cacheRosterCore, getActivePackId, importPackFromFile, listPacks as listPacksCore,
  removePack as removePackCore, setActivePackId as setActivePackIdCore, type PackSummary,
} from "../../../core/texturePacks";
import type { RosterEntry } from "../../../net/protocol";

export const packs = signal<PackSummary[]>([]);
export const activePackId = signal<string | null>(getActivePackId());
export const packEditorRoster = signal<RosterEntry[] | null>(null);

export async function refreshPacks(): Promise<void> {
  packs.value = await listPacksCore();
  activePackId.value = getActivePackId();
}

export async function useActivePack(id: string | null): Promise<void> {
  await setActivePackIdCore(id);
  activePackId.value = getActivePackId();
}

export async function removeInstalledPack(id: string): Promise<void> {
  await removePackCore(id);
  await refreshPacks();
}

export async function importPack(file: File): Promise<PackSummary> {
  const stored = await importPackFromFile(file);
  await refreshPacks();
  return { id: stored.id, name: stored.name, version: stored.version, hash: stored.hash, teacherCount: Object.keys(stored.teachers).length };
}

export function cacheRoster(entries: RosterEntry[]): void {
  cacheRosterCore(entries);
}
