import { Icon } from "../Icon";
import { Check, Square } from "../icons";
import { tasks } from "./state";

export function TaskBoard() {
  return (
    <div id="taskboard">
      <div class="title">TASKS</div>
      {tasks.value.map((t, i) => (
        <div class={"row" + (t.done ? " done" : "")} key={i}>
          <span class="box">
            <Icon node={t.done ? Check : Square} size={14} />
          </span>
          <span class="text">{t.text}</span>
        </div>
      ))}
    </div>
  );
}
