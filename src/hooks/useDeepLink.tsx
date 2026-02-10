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
    if (typeof window === 'undefined' || !('__TAURI__' in window)) {
      return;
    }

    const parseDeepLink = (url: string) => {
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname || urlObj.hostname;
        const params: Record<string, string> = {};
        urlObj.searchParams.forEach((value, key) => {
          params[key] = value;
        });
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

    const checkInitialDeepLinks = async () => {
      try {
        const urls = await getCurrent();
        if (urls && urls.length > 0) {
          setDeepLink(urls[0]);
          parseDeepLink(urls[0]);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des deep links initiaux:', error);
      }
    };

    let unlistenFn: (() => void) | undefined;

    const setupDeepLinkListener = async () => {
      try {
        const unlisten = await onOpenUrl((urls) => {
          if (urls && urls.length > 0) {
            setDeepLink(urls[0]);
            parseDeepLink(urls[0]);
          }
        });
        return unlisten;
      } catch (error) {
        console.error('Erreur lors de la configuration du listener deep link:', error);
      }
    };

    checkInitialDeepLinks();
    setupDeepLinkListener().then((unlisten) => {
      if (unlisten) unlistenFn = unlisten;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

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
