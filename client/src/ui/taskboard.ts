import type { Quests } from "../gameplay/quests";
import { tasks, taskCounter } from "./hud/state";

export class TaskBoard {
  constructor(private readonly quests: Quests) {
    quests.onChange(() => this.render());
    this.render();
  }

  private render(): void {
    tasks.value = this.quests.list().map((o) => {
      const sub =
        o.spots.length > 1
          ? ` (${o.spots.filter((s) => s.done).length}/${o.spots.length})`
          : "";
      return { text: o.text + sub, done: o.done };
    });
    taskCounter.value = `${this.quests.doneCount()} / ${this.quests.total()}`;
  }
}
