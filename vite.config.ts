import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/** Identificação do build, mostrada em Ajustes para saber que versão o aparelho roda. */
const COMMIT = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);
const BUILD_ID = [new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC", COMMIT].filter(Boolean).join(" · ");

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  resolve: {
    alias: {
      html2canvas: "/src/stub-vazio.ts",
      canvg: "/src/stub-vazio.ts",
      dompurify: "/src/stub-vazio.ts",
    },
  },
  plugins: [
    react(),
    VitePWA({
      // "prompt" + registro próprio (src/atualizacao.ts): o script que o plugin
      // injeta sozinho só chama `register()` — ele nunca procura versão nova
      // enquanto o app está aberto nem recarrega quando ela chega, e uma PWA de
      // iPhone/iPad que fica meses suspensa no multitarefa nunca via a mudança.
      registerType: "prompt",
      injectRegister: null,
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
          },
          {
            // imagens de execução da biblioteca de exercícios (funcionam offline após o 1º acesso)
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/yuhonas\/free-exercise-db@.*\.jpg$/,
            handler: "CacheFirst",
            options: { cacheName: "exercicio-imgs", expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 180 } }
          }
        ]
      }
    })
  ]
});
