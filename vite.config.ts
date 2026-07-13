import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.png"],
      manifest: {
        name: "BIRL! — Plataforma de Treinos",
        short_name: "BIRL!",
        description: "Registro pessoal de treinos, evolução e medidas",
        theme_color: "#0c0c0d",
        background_color: "#0c0c0d",
        display: "standalone",
        lang: "pt-BR",
        icons: [
          { src: "icon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      },
      workbox: {
        // o app antigo em /legacy fica fora do controle do service worker
        navigateFallbackDenylist: [/^\/legacy/],
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ]
});
