import { loadingText } from "./state";

export function Loading() {
  const text = loadingText.value;
  if (text === null) return null;
  return (
    <div id="loading">
      <div class="spinner" />
      <div class="msg">{text}</div>
    </div>
  );
}
