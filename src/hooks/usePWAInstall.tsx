import { useState, useEffect } from 'react';

// Détecter si on est dans Tauri
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Si on est dans Tauri, l'application est déjà "installée" (c'est un desktop app)
    if (isTauri()) {
      setIsInstalled(true);
      setIsInstallable(false);
      return;
    }

    // Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Vérifier si l'app est installée via d'autres moyens
    if ((window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Écouter l'événement beforeinstallprompt (uniquement pour PWA web)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    // Dans Tauri, pas besoin d'installation
    if (isTauri()) {
      return { success: false, error: 'Application desktop déjà installée' };
    }

    if (!deferredPrompt) {
      return { success: false, error: 'Installation non disponible' };
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return { success: true };
      } else {
        return { success: false, error: 'Installation annulée' };
      }
    } catch (error) {
      return { success: false, error: 'Erreur lors de l\'installation' };
    }
  };

  return {
    isInstallable: false, // Désactivé pour Tauri
    isInstalled: isTauri() ? true : isInstalled,
    install,
  };
}

