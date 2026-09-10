import { hideToast } from "../toast";
import { toastState } from "./state";

export function Toast() {
  const state = toastState.value;

  const fire = (): void => {
    state.action?.run();
    hideToast();
  };

  return (
    <div id="toast" class={state.visible ? undefined : "hidden"}>
      <span>{state.text}</span>
      {state.action ? (
        <button type="button" class="toast-undo" onClick={fire}>
          {state.action.label}
        </button>
      ) : null}
    </div>
  );
}
