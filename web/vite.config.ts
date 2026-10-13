import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  // "/" for the desktop app (app://) ; set VITE_BASE=/carsales-desktop/ for GitHub Pages hosting
  base: process.env.VITE_BASE || "/",
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [".modal.host"],
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    // Installable web app (phones / browser). The service worker is only registered in the browser,
    // never inside the Electron shell (which has its own bundle auto-update).
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png"],
      manifest: {
        name: "CarSales AI OS",
        short_name: "CarSales",
        description: "CarSales AI OS by CarSalesSoftware.com — the dealership operating system.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: process.env.VITE_BASE || "/",
        scope: process.env.VITE_BASE || "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: (process.env.VITE_BASE || "/") + "index.html",
        navigateFallbackDenylist: [/^\/functions\//, /supabase\.co/],
        runtimeCaching: [{ urlPattern: /^https:\/\/imagescdn\.dealercarsearch\.com\/.*/i, handler: "CacheFirst", options: { cacheName: "vehicle-photos", expiration: { maxEntries: 400, maxAgeSeconds: 7 * 24 * 3600 } } }],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
