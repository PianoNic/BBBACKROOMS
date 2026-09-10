/** Moodle's task strip — yellow callout above the page content with a
 *  Lucide pin icon and the "find X" hint. */
import { Icon } from "../../Icon";
import { Pin } from "../../icons";

export function MoodleTask(props: { text: string }) {
  return (
    <div class="moodle-task">
      <span class="task-pin"><Icon node={Pin} size={14} /></span>
      <span class="task-text">{props.text}</span>
    </div>
  );
}
