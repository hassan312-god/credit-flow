import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
          // Séparer les grandes bibliothèques
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('jspdf') || id.includes('exceljs') || id.includes('html2canvas')) {
              return 'export-vendor';
            }
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            // Autres dépendances node_modules
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500, // Augmenter la limite pour éviter les warnings
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
}));
