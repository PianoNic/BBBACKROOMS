import { useEffect, useRef } from "preact/hooks";
import { setCompassCanvas } from "../compass";
import { compassEnabled, compassLabel } from "./state";

export function TaskCompass() {
  const ref = useRef<HTMLCanvasElement>(null);
  const enabled = compassEnabled.value;

  useEffect(() => {
    if (!enabled) return;
    const ctx = ref.current?.getContext("2d") ?? null;
    setCompassCanvas(ctx);
    return () => setCompassCanvas(null);
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div id="task-compass">
      <canvas ref={ref} width={110} height={110} />
      <div class="label">{compassLabel.value}</div>
    </div>
  );
}
