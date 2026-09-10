import type { Announcement } from "../../../../net/announcements";
import { announcements, announcementsFailed, newsLoaded } from "../../state/news";
import { MarkdownBody } from "./markdown";

function sortedAnnouncements(list: Announcement[]): Announcement[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.date.localeCompare(a.date);
  });
}

export function AnnouncementsTab() {
  if (!newsLoaded.value) return <p class="news-empty">Lädt…</p>;

  const list = sortedAnnouncements(announcements.value);

  return (
    <>
      {announcementsFailed.value ? (
        <p class="news-note">Ankündigungen konnten nicht geladen werden.</p>
      ) : null}
      {list.length === 0 ? (
        <p class="news-empty">Keine Ankündigungen.</p>
      ) : (
        <ul class="news-list">
          {list.map((entry) => (
            <li key={entry.id} class={entry.level === "important" ? "news-item important" : "news-item"}>
              <div class="news-item-head">
                <span class="news-item-title">{entry.title}</span>
                {entry.level === "important" ? <span class="news-item-badge">Wichtig</span> : null}
                {entry.pinned ? <span class="news-item-pin">Angeheftet</span> : null}
              </div>
              <div class="news-item-date">{entry.date}</div>
              <div class="news-item-body">
                <MarkdownBody text={entry.body} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
