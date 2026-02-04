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
          // Simplifié pour éviter les dépendances circulaires
          if (id.includes('node_modules')) {
            // React et écosystème - chunk séparé
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Bibliothèques volumineuses - chunks séparés
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('jspdf') || id.includes('exceljs') || id.includes('html2canvas')) {
              return 'export-vendor';
            }
            // Tout le reste dans vendor pour éviter les circularités
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 2000,
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
