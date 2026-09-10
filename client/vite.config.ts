import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { execSync } from "node:child_process";

const DEV_BACKEND = process.env.VITE_DEV_BACKEND ?? "http://localhost:8000";

function buildDate(): string {
  if (process.env.BUILD_DATE) return process.env.BUILD_DATE;
  try {
    const date = execSync("git log -1 --format=%cd --date=short", { encoding: "utf8" }).trim();
    if (date) return date;
  } catch {}
  return new Date().toISOString().slice(0, 10);
}

export default defineConfig({
  plugins: [preact()],
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate()),
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      "/ws": { target: DEV_BACKEND, ws: true, changeOrigin: true },
      "/lobbies": { target: DEV_BACKEND, changeOrigin: true },
      "/healthz": { target: DEV_BACKEND, changeOrigin: true },
      "/version": { target: DEV_BACKEND, changeOrigin: true },
      "/auth": { target: DEV_BACKEND, changeOrigin: true },
      "/shop": { target: DEV_BACKEND, changeOrigin: true },
      "/turn-credentials": { target: DEV_BACKEND, changeOrigin: true },
      "/roster": { target: DEV_BACKEND, changeOrigin: true },
    },
  },
});
