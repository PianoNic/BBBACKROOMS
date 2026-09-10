import type { ComponentChildren } from "preact";

export function Panel(props: { class?: string; children: ComponentChildren }) {
  return <div class={props.class ? `bb-panel ${props.class}` : "bb-panel"}>{props.children}</div>;
}

export function Heading(props: { children: ComponentChildren; class?: string }) {
  return <h2 class={props.class ? `bb-heading ${props.class}` : "bb-heading"}>{props.children}</h2>;
}

export function Subheading(props: { children: ComponentChildren; class?: string }) {
  return (
    <div class={props.class ? `bb-subheading ${props.class}` : "bb-subheading"}>
      {props.children}
    </div>
  );
}

export function Row(props: { label: ComponentChildren; class?: string; children: ComponentChildren }) {
  return (
    <div class={props.class ? `bb-row ${props.class}` : "bb-row"}>
      <label>{props.label}</label>
      <div class="bb-row-ctrl">{props.children}</div>
    </div>
  );
}

export function Scroll(props: { class?: string; children: ComponentChildren }) {
  return <div class={props.class ? `bb-scroll ${props.class}` : "bb-scroll"}>{props.children}</div>;
}
