export type Announcement = {
  id: string;
  date: string;
  title: string;
  body: string;
  pinned: boolean;
  level: "info" | "important";
};

const API = import.meta.env.VITE_SERVER_URL ?? "";

export async function fetchAnnouncements(): Promise<Announcement[]> {
  try {
    const r = await fetch(`${API}/announcements`);
    if (!r.ok) return [];
    return (await r.json()) as Announcement[];
  } catch {
    return [];
  }
}
