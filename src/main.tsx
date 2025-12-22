import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Le service worker est enregistré automatiquement par vite-plugin-pwa

createRoot(document.getElementById("root")!).render(<App />);
