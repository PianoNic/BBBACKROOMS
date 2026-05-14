import type { Quests } from "../gameplay/quests";
import { icon, Check, Square } from "./icons";

export class TaskBoard {
  readonly board: HTMLDivElement;
  readonly counter: HTMLDivElement;

  constructor(private readonly quests: Quests) {
    this.board = document.createElement("div");
    this.board.id = "taskboard";
    this.counter = document.createElement("div");
    this.counter.id = "task-counter";

    document.body.append(this.board, this.counter);
    quests.onChange(() => this.render());
    this.render();
  }

  private render(): void {
    this.board.replaceChildren();
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = "TASKS";
    this.board.appendChild(title);

    for (const o of this.quests.list()) {
      const row = document.createElement("div");
      row.className = "row" + (o.done ? " done" : "");
      const box = document.createElement("span");
      box.className = "box";
      box.appendChild(icon(o.done ? Check : Square, 14));
      const text = document.createElement("span");
      text.className = "text";
      const sub =
        o.spots.length > 1
          ? ` (${o.spots.filter((s) => s.done).length}/${o.spots.length})`
          : "";
      text.textContent = o.text + sub;
      row.append(box, text);
      this.board.appendChild(row);
    }

    this.counter.textContent = `${this.quests.doneCount()} / ${this.quests.total()}`;
  }
}
