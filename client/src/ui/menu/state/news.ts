import { signal } from "@preact/signals";
import type { Announcement } from "../../../net/announcements";
import { fetchAnnouncementsResult } from "../../../net/announcements";
import type { ReleaseNote } from "../../../core/releaseNotes";
import { currentVersion, releaseNotes } from "../../../core/releaseNotes";
import { NEWS_SEEN_IDS_KEY, NEWS_VERSION_KEY } from "./storageKeys";
import { navigate, route } from "../routes";

export const announcements = signal<Announcement[]>([]);
export const announcementsFailed = signal(false);
export const newsLoaded = signal(false);
export const changelogNotes = signal<ReleaseNote[]>(releaseNotes());
export const hasUnread = signal(false);

let loadStarted = false;
let autoOpened = false;

function readSeenVersion(): string | null {
  try {
    return localStorage.getItem(NEWS_VERSION_KEY);
  } catch {
    return null;
  }
}

function readSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NEWS_SEEN_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function computeUnread(list: Announcement[]): boolean {
  const seenVersion = readSeenVersion();
  const seenIds = readSeenIds();
  if (seenVersion !== currentVersion()) return true;
  return list.some((entry) => entry.level === "important" && !seenIds.has(entry.id));
}

export async function loadNews(): Promise<void> {
  if (loadStarted) return;
  loadStarted = true;

  const result = await fetchAnnouncementsResult();
  announcements.value = result.announcements;
  announcementsFailed.value = !result.ok;
  newsLoaded.value = true;
  hasUnread.value = computeUnread(result.announcements);

  if (!autoOpened && hasUnread.value && route.value === "title") {
    autoOpened = true;
    navigate("news");
  }
}

export function markNewsSeen(): void {
  try {
    localStorage.setItem(NEWS_VERSION_KEY, currentVersion());
    localStorage.setItem(NEWS_SEEN_IDS_KEY, JSON.stringify(announcements.value.map((entry) => entry.id)));
  } catch {}
  hasUnread.value = false;
}
