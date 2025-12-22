import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initLocalDB } from "./services/localStorage";

// Le service worker est enregistré automatiquement par vite-plugin-pwa

// Initialiser IndexedDB au démarrage de l'application
initLocalDB().catch((error) => {
  console.error('Error initializing local database:', error);
});

createRoot(document.getElementById("root")!).render(<App />);
