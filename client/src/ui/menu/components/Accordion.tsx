import { useId, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

export function Accordion(props: {
  title: string;
  defaultOpen?: boolean;
  collapsible: boolean;
  children: ComponentChildren;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const id = useId();
  if (!props.collapsible) {
    return (
      <section class="bb-accordion is-static" id={`section-${id}`}>
        <h3 class="bb-accordion-title">{props.title}</h3>
        <div class="bb-accordion-body">{props.children}</div>
      </section>
    );
  }
  return (
    <section class={open ? "bb-accordion is-open" : "bb-accordion"} id={`section-${id}`}>
      <button
        type="button"
        class="bb-accordion-trigger"
        aria-expanded={open}
        aria-controls={`panel-${id}`}
        onClick={() => setOpen(!open)}
      >
        <span>{props.title}</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div class="bb-accordion-body" id={`panel-${id}`} hidden={!open}>
        {props.children}
      </div>
    </section>
  );
}
