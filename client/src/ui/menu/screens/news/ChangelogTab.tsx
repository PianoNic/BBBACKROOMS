import { changelogNotes } from "../../state/news";

export function ChangelogTab() {
  const notes = changelogNotes.value;

  if (notes.length === 0) return <p class="news-empty">Keine Änderungen.</p>;

  return (
    <ul class="news-list">
      {notes.map((note) => (
        <li key={note.version} class="news-item">
          <div class="news-item-head">
            <span class="news-item-title">{`v${note.version}`}</span>
          </div>
          <div class="news-item-date">{note.date}</div>
          <ul class="news-md-list">
            {note.entries.map((entry, i) => <li key={i}>{entry}</li>)}
          </ul>
        </li>
      ))}
    </ul>
  );
}
