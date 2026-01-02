import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Standard ESM-friendly __dirname replacement
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rawBasePath = process.env.BASE_PATH ?? "/";
const normalizedBasePath =
  rawBasePath === "/"
    ? "/"
    : `/${rawBasePath.replace(/^\/+|\/+$/g, "")}/`;

export default defineConfig({
  base:
    process.env.NODE_ENV === "production"
      ? normalizedBasePath
      : rawBasePath === "/"
        ? "/"
        : normalizedBasePath,

  plugins: [
    react(),
    // (We intentionally removed the Replit-only plugins:
    // runtimeErrorOverlay, cartographer, devBanner)
  ],

  resolve: {
    alias: {
      "@": resolve(__dirname, "client", "src"),
      "@shared": resolve(__dirname, "shared"),
      "@assets": resolve(__dirname, "attached_assets"),
    },
  },

  // Your app's source lives in /client
  root: resolve(__dirname, "client"),

  // We still output into dist/public like you had before
  build: {
    outDir: resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },

  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
