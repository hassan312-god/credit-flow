import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initLocalDB } from "./services/localStorage";
import { initAutoSync } from "./services/autoSyncService";

// Initialiser IndexedDB au démarrage de l'application
initLocalDB().catch((error) => {
  console.error('Error initializing local database:', error);
});

// Initialiser la synchronisation automatique
initAutoSync();

createRoot(document.getElementById("root")!).render(<App />);
