import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "./" : "/",
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    hmr: process.env.TAURI_DEV ? {
      protocol: "ws",
      host: "localhost",
      port: 8080,
    } : undefined,
  },
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    // PWA désactivé - Application desktop Tauri uniquement
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Ne pas séparer React dans un chunk à part : le code qui utilise
          // React.createContext (composants UI, Radix) doit avoir React
          // dans le même graphe de modules pour éviter "createContext of undefined".
          if (id.includes('node_modules')) {
            // Chunks séparés sans cycle : chart et supabase uniquement.
            // jspdf/exceljs/html2canvas restent dans vendor pour éviter
            // la dépendance circulaire vendor -> export-vendor -> vendor.
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // Tout le reste (React, jspdf, exceljs, etc.) dans vendor
            return 'vendor';
          }
        },
      },
    },
    // Limite à 1 Go pour éviter les avertissements (app desktop, vendor volumineux)
    chunkSizeWarningLimit: 1024 * 1024,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'recharts',
      'date-fns'
    ],
    force: true,
  },
}));
