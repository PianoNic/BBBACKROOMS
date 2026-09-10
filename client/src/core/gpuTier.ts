import type { GraphicsTier } from "../rendering/ambience";

export type GpuClass = "software" | "integrated" | "discrete" | "unknown";

const SOFTWARE_RENDERER_PATTERNS: RegExp[] = [
  /swiftshader/i,
  /llvmpipe/i,
  /softpipe/i,
  /software/i,
  /microsoft basic render/i,
  /mesa offscreen/i,
];

const INTEGRATED_RENDERER_PATTERNS: RegExp[] = [
  /intel/i,
  /iris/i,
  /\buhd\b/i,
  /hd graphics/i,
  /radeon\s*\(?tm\)?\s*vega/i,
  /vega\s*\d/i,
  /adreno/i,
  /\bmali\b/i,
  /apple\s*(gpu|m\d)/i,
];

const DISCRETE_RENDERER_PATTERNS: RegExp[] = [
  /nvidia/i,
  /geforce/i,
  /quadro/i,
  /\brtx\b/i,
  /\bgtx\b/i,
  /radeon\s*(rx|pro|r9|r7|r5)\b/i,
];

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

let cachedClass: GpuClass | undefined;

export function classifyGpu(): GpuClass {
  if (cachedClass !== undefined) return cachedClass;
  try {
    const renderer = probeRendererString();
    if (renderer) {
      if (SOFTWARE_RENDERER_PATTERNS.some((p) => p.test(renderer))) {
        cachedClass = "software";
        return cachedClass;
      }
      if (INTEGRATED_RENDERER_PATTERNS.some((p) => p.test(renderer))) {
        cachedClass = "integrated";
        return cachedClass;
      }
      if (DISCRETE_RENDERER_PATTERNS.some((p) => p.test(renderer))) {
        cachedClass = "discrete";
        return cachedClass;
      }
    }
    const cores = typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 8;
    cachedClass = cores <= 8 ? "integrated" : "discrete";
  } catch {
    cachedClass = "unknown";
  }
  return cachedClass;
}

export function isIntegratedGpu(): boolean {
  return classifyGpu() === "integrated";
}

export function isSoftwareRenderer(): boolean {
  return classifyGpu() === "software";
}

export function gpuRendererString(): string | null {
  return probeRendererString();
}

export function defaultGraphicsTierForHardware(): GraphicsTier {
  try {
    const cls = classifyGpu();
    return cls === "software" || cls === "integrated" ? "niedrig" : "mittel";
  } catch {
    return "mittel";
  }
}
