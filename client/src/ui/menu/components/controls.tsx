import type { ComponentChildren, JSX } from "preact";

type ButtonProps = {
  variant?: "primary" | "ghost" | "danger" | "back";
  small?: boolean;
  wide?: boolean;
  class?: string;
} & JSX.IntrinsicElements["button"];

export function Button({ variant, small, wide, class: cls, children, ...rest }: ButtonProps) {
  const classes = ["bb-btn"];
  if (variant) classes.push(variant);
  if (small) classes.push("small");
  if (wide) classes.push("wide");
  if (cls) classes.push(cls);
  return (
    <button type="button" {...rest} class={classes.join(" ")}>
      {children}
    </button>
  );
}

type MenuButtonProps = { class?: string } & JSX.IntrinsicElements["button"];

export function MenuButton({ class: cls, children, ...rest }: MenuButtonProps) {
  return (
    <button type="button" {...rest} class={cls ? `bb-listbtn ${cls}` : "bb-listbtn"}>
      {children}
    </button>
  );
}

type SegmentedOption<T> = { label: string; value: T };

export function Segmented<T extends string | number | boolean>(props: {
  options: SegmentedOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div class="bb-seg" role="group" aria-label={props.ariaLabel}>
      {props.options.map((opt) => (
        <button
          type="button"
          key={String(opt.value)}
          class={opt.value === props.value ? "bb-seg-btn active" : "bb-seg-btn"}
          aria-pressed={opt.value === props.value}
          onClick={() => props.onSelect(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle(props: { value: boolean; onSelect: (value: boolean) => void; ariaLabel?: string }) {
  return (
    <Segmented
      ariaLabel={props.ariaLabel}
      options={[{ label: "ON", value: true }, { label: "OFF", value: false }]}
      value={props.value}
      onSelect={props.onSelect}
    />
  );
}

export function Slider(props: {
  min: number;
  max: number;
  step: number;
  value: number;
  onInput: (value: number) => void;
  onChange?: (value: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      type="range"
      class="bb-range"
      min={props.min}
      max={props.max}
      step={props.step}
      value={props.value}
      disabled={props.disabled}
      aria-label={props.ariaLabel}
      onInput={(e) => props.onInput(parseFloat((e.target as HTMLInputElement).value))}
      onChange={(e) => props.onChange?.(parseFloat((e.target as HTMLInputElement).value))}
    />
  );
}

type TextInputProps = { class?: string } & JSX.IntrinsicElements["input"];

export function TextInput({ class: cls, ...rest }: TextInputProps) {
  return <input {...rest} class={cls ? `bb-input ${cls}` : "bb-input"} />;
}

export function Checkbox(props: {
  id?: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  children: ComponentChildren;
}) {
  return (
    <label class="bb-check-label">
      <input
        type="checkbox"
        id={props.id}
        class="bb-check"
        checked={props.checked}
        onChange={(e) => props.onToggle((e.target as HTMLInputElement).checked)}
      />
      <span>{props.children}</span>
    </label>
  );
}
