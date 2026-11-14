import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  define: { global: "globalThis" },
  resolve: { alias: { buffer: "buffer/" } },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    fs: { strict: true },
    proxy: {
      "/rpc": {
        target: "https://rpc.testnet.near.org",
        changeOrigin: true,
        rewrite: () => "/",
      },
    },
  },
  build: { target: "es2022", chunkSizeWarningLimit: 650 },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    proxy: {
      "/rpc": {
        target: "https://rpc.testnet.near.org",
        changeOrigin: true,
        rewrite: () => "/",
      },
    },
  },
});
