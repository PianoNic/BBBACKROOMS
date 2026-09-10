import { h } from "preact";
import type { IconNode } from "lucide";

export function Icon(props: {
  node: IconNode;
  size?: number;
  strokeWidth?: number;
  class?: string;
}) {
  const size = props.size ?? 16;
  return (
    <svg
      class={props.class}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={props.strokeWidth ?? 2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      {props.node.map(([tag, attrs], i) => h(tag, { ...attrs, key: i }))}
    </svg>
  );
}
