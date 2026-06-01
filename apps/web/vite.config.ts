import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PROXY_TARGET = process.env.VITE_PROXY_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
