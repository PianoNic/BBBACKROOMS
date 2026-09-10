import { Icon } from "../../Icon";
import { Pin } from "../../icons";

export function TaskBar(props: { text: string }) {
  return (
    <div class="task-bar">
      <span class="task-pin"><Icon node={Pin} size={14} /></span>
      <span class="task-text">{props.text}</span>
    </div>
  );
}
