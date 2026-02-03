import { useEffect, useState } from 'react';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';

export interface DeepLinkParams {
  path?: string;
  params?: Record<string, string>;
}

/**
 * Hook pour gérer les deep links dans l'application Tauri
 * 
 * Exemple d'utilisation:
 * - nfa-ka-serum://client/123
 * - nfa-ka-serum://loan/456
 * - nfa-ka-serum://payment/789
 * - nfa-ka-serum://dashboard
 * - nfa-ka-serum://client/123?action=edit
 */
export function useDeepLink() {
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [parsedLink, setParsedLink] = useState<DeepLinkParams | null>(null);

  useEffect(() => {
    // Vérifier si on est dans Tauri
    if (typeof window === 'undefined' || !('__TAURI__' in window)) {
      return;
    }

    // Vérifier les deep links au démarrage de l'application
    const checkInitialDeepLinks = async () => {
      try {
        const urls = await getCurrent();
        if (urls && urls.length > 0) {
          const url = urls[0];
          setDeepLink(url);
          parseDeepLink(url);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des deep links initiaux:', error);
      }
    };

    // Écouter les nouveaux deep links pendant l'exécution
    const setupDeepLinkListener = async () => {
      try {
        const unlisten = await onOpenUrl((urls) => {
          if (urls && urls.length > 0) {
            const url = urls[0];
            setDeepLink(url);
            parseDeepLink(url);
          }
        });

        return unlisten;
      } catch (error) {
        console.error('Erreur lors de la configuration du listener deep link:', error);
      }
    };

    let unlistenFn: (() => void) | undefined;

    checkInitialDeepLinks();
    setupDeepLinkListener().then((unlisten) => {
      if (unlisten) {
        unlistenFn = unlisten;
      }
    });

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  const parseDeepLink = (url: string) => {
    try {
      // Format: nfa-ka-serum://path?param1=value1&param2=value2
      const urlObj = new URL(url);
      const path = urlObj.pathname || urlObj.hostname;
      const params: Record<string, string> = {};

      // Parser les paramètres de requête
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      // Extraire l'ID du path si présent (ex: client/123 -> path: client, params.id: 123)
      const pathParts = path.replace(/^\//, '').split('/');
      if (pathParts.length > 1 && pathParts[1]) {
        params.id = pathParts[1];
      }

      const finalPath = pathParts[0] || path.replace(/^\//, '');
      const finalParams = Object.keys(params).length > 0 ? params : undefined;
      setParsedLink({
        path: finalPath,
        params: finalParams,
      });
    } catch (error) {
      console.error('Erreur lors du parsing du deep link:', error);
      setParsedLink(null);
    }
  };

  const clearDeepLink = () => {
    setDeepLink(null);
    setParsedLink(null);
  };

  return {
    deepLink,
    parsedLink,
    clearDeepLink,
  };
}
