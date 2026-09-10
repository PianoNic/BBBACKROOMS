import type { RosterEntry } from "../../../../net/protocol";
import { resolveTeacherName, resolveTeacherThumb } from "../../../../core/texturePacks";

export function TeacherGrid(props: {
  roster: RosterEntry[];
  selected: Set<string>;
  isAdmin: boolean;
  onToggle: (image: string) => void;
}) {
  return (
    <div class="teacher-grid">
      {props.roster.map((t, index) => {
        const name = resolveTeacherName(t.ability, index, t.name);
        const active = props.selected.has(t.image);
        return (
          <button
            type="button"
            key={t.image}
            class={active ? "teacher-tile active" : "teacher-tile"}
            disabled={!props.isAdmin}
            onClick={() => props.onToggle(t.image)}
          >
            <img src={resolveTeacherThumb(t.ability, index, t.image)} alt={name} />
            <span>{name}</span>
          </button>
        );
      })}
    </div>
  );
}
