import { taskCounter } from "./state";

export function TaskCounter() {
  return <div id="task-counter">{taskCounter.value}</div>;
}
