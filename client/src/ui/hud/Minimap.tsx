import { useEffect, useRef } from "preact/hooks";
import { setMinimapCanvas } from "../minimap";

export function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d") ?? null;
    setMinimapCanvas(ctx);
    return () => setMinimapCanvas(null);
  }, []);

  return <canvas ref={ref} width={200} height={200} id="minimap" />;
}
