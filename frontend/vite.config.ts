import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // ── Alias de chemins ──────────────────────────────────
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@modules": path.resolve(__dirname, "./src/modules"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@assets": path.resolve(__dirname, "./src/assets"),
    },
  },

  // ── Optimisation des dépendances ──────────────────────
  optimizeDeps: {
    include: ["@ant-design/cssinjs"],
  },

  // ── Serveur de développement ──────────────────────────
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    // Proxy API vers le backend Django (évite les problèmes CORS en dev)
    proxy: {
      "/api": {
        // Réseau Docker par défaut (nom DNS « backend »). Pour un lancement
        // manuel hors Docker : VITE_PROXY_TARGET=http://127.0.0.1:8000 npm run dev
        target: (globalThis as any).process?.env?.VITE_PROXY_TARGET || "http://backend:8000",
        changeOrigin: true,
        secure: false,
      },
    },
    // HMR WebSocket
    hmr: {
      clientPort: 3000,
    },
  },

  // ── Build de production ───────────────────────────────
  build: {
    outDir: "dist",
    sourcemap: false,        // Pas de sourcemap en prod (sécurité)
    minify: "terser",
    rollupOptions: {
      output: {
        // Code splitting — charge uniquement ce qui est nécessaire
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "ui-vendor": ["recharts", "lucide-react"],
          "form-vendor": ["react-hook-form", "zod", "@hookform/resolvers"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },

  // ── Variables d'environnement ─────────────────────────
  // Toutes les variables VITE_* sont exposées au frontend
  // Ne jamais mettre de secrets dans des variables VITE_*
  envPrefix: "VITE_",

  // ── Tests (Vitest) ────────────────────────────────────
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
