import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs";
import path from "node:path";

// All project files live at the top level (no folders), so the icons are here too.
// This tiny plugin copies them into the built site so the manifest and home-screen icon can find them.
const ROOT_ASSETS = ["favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
function copyRootAssets() {
  return {
    name: "copy-root-assets",
    apply: "build",
    generateBundle() {
      for (const file of ROOT_ASSETS) {
        this.emitFile({ type: "asset", fileName: file, source: fs.readFileSync(path.resolve(file)) });
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    copyRootAssets(),
    VitePWA({
      registerType: "autoUpdate", // new versions install quietly; your saved data is NOT in the cache
      manifest: {
        id: "/",
        name: "Monthly Budget",
        short_name: "Budget",
        description: "Personal monthly budget, savings and safe-to-spend tracker. Your data stays on this device.",
        lang: "en-GB",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#EAEFF2",
        theme_color: "#10352F",
        categories: ["finance", "productivity"],
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 900 },
});
