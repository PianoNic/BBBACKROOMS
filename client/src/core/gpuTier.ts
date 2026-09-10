let cachedRenderer: string | null | undefined;

function probeRendererString(): string | null {
  if (cachedRenderer !== undefined) return cachedRenderer;
  cachedRenderer = null;
  let canvas: HTMLCanvasElement | null = null;
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    if (typeof document === "undefined") return cachedRenderer;
    canvas = document.createElement("canvas");
    gl = (canvas.getContext("webgl2") as WebGL2RenderingContext | null)
      ?? (canvas.getContext("webgl") as WebGLRenderingContext | null)
      ?? (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return cachedRenderer;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (ext) {
      const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      if (typeof renderer === "string" && renderer.length > 0) cachedRenderer = renderer;
    }
  } catch {
    cachedRenderer = null;
  } finally {
    try {
      const loseExt = gl?.getExtension("WEBGL_lose_context");
      loseExt?.loseContext();
    } catch {}
  }
  return cachedRenderer;
}

export function gpuRendererString(): string | null {
  return probeRendererString();
}
