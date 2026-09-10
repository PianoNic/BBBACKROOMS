import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

const DEV_BACKEND = process.env.VITE_DEV_BACKEND ?? "http://localhost:8000";

export default defineConfig({
  plugins: [preact()],
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
