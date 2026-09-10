import { Segmented, Slider, Toggle } from "../../components/controls";
import { Row } from "../../components/layout";

export function SliderRow(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <Row label={props.label}>
      <div class="options-slider-ctrl">
        <Slider
          min={props.min} max={props.max} step={props.step} value={props.value}
          ariaLabel={props.label} onInput={props.onChange}
        />
        <span class="options-slider-value">{props.format(props.value)}</span>
      </div>
    </Row>
  );
}

export function SelectRow<V extends string | number | boolean>(props: {
  label: string;
  value: V;
  options: { label: string; value: V }[];
  onChange: (value: V) => void;
}) {
  return (
    <Row label={props.label}>
      <Segmented options={props.options} value={props.value} ariaLabel={props.label} onSelect={props.onChange} />
    </Row>
  );
}

export function ToggleRow(props: {
  label: string;
  note?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Row label={props.note ? `${props.label} (${props.note})` : props.label}>
      <Toggle value={props.value} ariaLabel={props.label} onSelect={props.onChange} />
    </Row>
  );
}
