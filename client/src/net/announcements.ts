export type Announcement = {
  id: string;
  date: string;
  title: string;
  body: string;
  pinned: boolean;
  level: "info" | "important";
};

export type AnnouncementsResult = {
  ok: boolean;
  announcements: Announcement[];
};

const API = import.meta.env.VITE_SERVER_URL ?? "";

export async function fetchAnnouncementsResult(): Promise<AnnouncementsResult> {
  try {
    const r = await fetch(`${API}/announcements`);
    if (!r.ok) return { ok: false, announcements: [] };
    return { ok: true, announcements: (await r.json()) as Announcement[] };
  } catch {
    return { ok: false, announcements: [] };
  }
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  return (await fetchAnnouncementsResult()).announcements;
}
