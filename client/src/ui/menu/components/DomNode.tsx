import { useEffect, useRef } from "preact/hooks";

export function DomNode(props: { node: HTMLElement; class?: string }) {
  const holder = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = holder.current;
    if (!host) return;
    host.appendChild(props.node);
    return () => {
      if (props.node.parentElement === host) host.removeChild(props.node);
    };
  }, [props.node]);

  return <div class={props.class} ref={holder} />;
}
