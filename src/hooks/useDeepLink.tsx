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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:23',message:'useEffect entry',data:{hasTauri:typeof window !== 'undefined' && '__TAURI__' in window},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Vérifier si on est dans Tauri
    if (typeof window === 'undefined' || !('__TAURI__' in window)) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:26',message:'Not in Tauri, exiting',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return;
    }

    // Vérifier les deep links au démarrage de l'application
    const checkInitialDeepLinks = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:32',message:'Checking initial deep links',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        const urls = await getCurrent();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:34',message:'Initial deep links received',data:{urlCount:urls?.length || 0,firstUrl:urls?.[0] || null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (urls && urls.length > 0) {
          const url = urls[0];
          setDeepLink(url);
          parseDeepLink(url);
        }
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:40',message:'Error checking initial deep links',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        console.error('Erreur lors de la vérification des deep links initiaux:', error);
      }
    };

    // Écouter les nouveaux deep links pendant l'exécution
    const setupDeepLinkListener = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:45',message:'Setting up deep link listener',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        const unlisten = await onOpenUrl((urls) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:47',message:'Deep link received via listener',data:{urlCount:urls?.length || 0,firstUrl:urls?.[0] || null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          if (urls && urls.length > 0) {
            const url = urls[0];
            setDeepLink(url);
            parseDeepLink(url);
          }
        });

        return unlisten;
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:56',message:'Error setting up listener',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        console.error('Erreur lors de la configuration du listener deep link:', error);
      }
    };

    let unlistenFn: (() => void) | undefined;

    checkInitialDeepLinks();
    setupDeepLinkListener().then((unlisten) => {
      if (unlisten) {
        unlistenFn = unlisten;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:65',message:'Listener setup complete',data:{hasUnlisten:!!unlistenFn},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
    });

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  const parseDeepLink = (url: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:76',message:'parseDeepLink entry',data:{url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      // Format: nfa-ka-serum://path?param1=value1&param2=value2
      const urlObj = new URL(url);
      const path = urlObj.pathname || urlObj.hostname;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:80',message:'URL parsed',data:{pathname:urlObj.pathname,hostname:urlObj.hostname,path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const params: Record<string, string> = {};

      // Parser les paramètres de requête
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      // Extraire l'ID du path si présent (ex: client/123 -> path: client, params.id: 123)
      const pathParts = path.replace(/^\//, '').split('/');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:91',message:'Path parts extracted',data:{pathParts,pathPartsLength:pathParts.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (pathParts.length > 1 && pathParts[1]) {
        params.id = pathParts[1];
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:94',message:'ID extracted from path',data:{id:pathParts[1],basePath:pathParts[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }

      const finalPath = pathParts[0] || path.replace(/^\//, '');
      const finalParams = Object.keys(params).length > 0 ? params : undefined;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:99',message:'parseDeepLink result',data:{finalPath,finalParams},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setParsedLink({
        path: finalPath,
        params: finalParams,
      });
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDeepLink.tsx:107',message:'parseDeepLink error',data:{error:error instanceof Error ? error.message : String(error),url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
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
