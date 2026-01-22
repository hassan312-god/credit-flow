import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeepLink } from '@/hooks/useDeepLink';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Composant pour gérer les deep links et rediriger vers les bonnes pages
 */
export function DeepLinkHandler() {
  const navigate = useNavigate();
  const { parsedLink, clearDeepLink } = useDeepLink();
  const { user, loading } = useAuth();

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DeepLinkHandler.tsx:13',message:'DeepLinkHandler useEffect',data:{hasParsedLink:!!parsedLink,path:parsedLink?.path,hasUser:!!user,loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!parsedLink || !parsedLink.path) {
      return;
    }

    // Attendre que l'authentification soit chargée
    if (loading) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DeepLinkHandler.tsx:20',message:'Auth still loading, waiting',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return;
    }

    const handleDeepLink = () => {
      const { path, params } = parsedLink;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DeepLinkHandler.tsx:26',message:'handleDeepLink entry',data:{path,params,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      try {
        switch (path) {
          case 'dashboard':
            navigate('/dashboard');
            toast.success('Redirection vers le tableau de bord');
            break;

          case 'client':
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DeepLinkHandler.tsx:28',message:'Client deep link',data:{hasId:!!params?.id,id:params?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            if (params?.id) {
              navigate(`/clients/${params.id}`);
              toast.success('Ouverture du client');
            } else {
              navigate('/clients');
              toast.success('Redirection vers les clients');
            }
            break;

          case 'clients':
            navigate('/clients');
            toast.success('Redirection vers les clients');
            break;

          case 'clients/new':
            navigate('/clients/new');
            toast.success('Création d\'un nouveau client');
            break;

          case 'loan':
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/827e5fe1-6961-4a95-ba4b-63b39b26e372',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DeepLinkHandler.tsx:48',message:'Loan deep link',data:{hasId:!!params?.id,id:params?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            if (params?.id) {
              navigate(`/loans/${params.id}`);
              toast.success('Ouverture du prêt');
            } else {
              navigate('/loans');
              toast.success('Redirection vers les prêts');
            }
            break;

          case 'loans':
            navigate('/loans');
            toast.success('Redirection vers les prêts');
            break;

          case 'loans/new':
            navigate('/loans/new');
            toast.success('Création d\'un nouveau prêt');
            break;

          case 'payment':
            if (params?.id) {
              navigate(`/payments?loan=${params.id}`);
              toast.success('Ouverture du paiement');
            } else {
              navigate('/payments');
              toast.success('Redirection vers les paiements');
            }
            break;

          case 'payments':
            navigate('/payments');
            toast.success('Redirection vers les paiements');
            break;

          case 'recovery':
            navigate('/recovery');
            toast.success('Redirection vers le recouvrement');
            break;

          case 'reports':
            navigate('/reports');
            toast.success('Redirection vers les rapports');
            break;

          case 'users':
            navigate('/users');
            toast.success('Redirection vers les utilisateurs');
            break;

          case 'settings':
            navigate('/settings');
            toast.success('Redirection vers les paramètres');
            break;

          case 'company-funds':
            navigate('/company-funds');
            toast.success('Redirection vers les fonds de l\'entreprise');
            break;

          case 'attendance':
            navigate('/attendance');
            toast.success('Redirection vers la présence');
            break;

          default:
            console.warn('Deep link non reconnu:', path);
            toast.info(`Deep link reçu: ${path}`);
        }

        // Nettoyer le deep link après traitement
        clearDeepLink();
      } catch (error) {
        console.error('Erreur lors du traitement du deep link:', error);
        toast.error('Erreur lors du traitement du deep link');
        clearDeepLink();
      }
    };

    handleDeepLink();
  }, [parsedLink, navigate, clearDeepLink, user, loading]);

  return null; // Ce composant ne rend rien
}
