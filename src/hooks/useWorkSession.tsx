import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface WorkSession {
  id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  work_date: string;
  initial_cash: number | null;
  final_cash: number | null;
  notes: string | null;
}

export function useWorkSession() {
  const { user, role } = useAuth();
  const [workSession, setWorkSession] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setIsOpen(false);
      return;
    }
    
    if (role === 'admin') {
      // Les administrateurs ne peuvent pas ouvrir/fermer une journée (rôle de supervision uniquement)
      setLoading(false);
      setIsOpen(false);
      return;
    }

    const fetchWorkSession = async () => {
      try {
        const { data, error } = await supabase
          .from('work_sessions' as any)
          .select('*')
          .eq('user_id', user.id)
          .eq('work_date', today)
          .is('closed_at', null)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setWorkSession(data as unknown as WorkSession);
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      } catch (error) {
        console.error('Error fetching work session:', error);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkSession();
  }, [user, role, today]);

  const openWorkSession = async (initialCash: number = 0, notes?: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // Vérifier d'abord si une session existe déjà pour aujourd'hui
      const { data: existingSession, error: checkError } = await supabase
        .from('work_sessions' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('work_date', today)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError;
      }

      // Cast pour accéder aux propriétés
      const session = existingSession as any;

      // Si une session existe déjà et est fermée, on ne peut pas la rouvrir
      if (session && session.status === 'closed') {
        return { error: 'Une session fermée existe déjà pour aujourd\'hui. Vous ne pouvez pas en créer une nouvelle.' };
      }

      // Si une session ouverte existe déjà, on la retourne
      if (session && session.status === 'open') {
        setWorkSession(session as WorkSession);
        setIsOpen(true);
        return { error: null };
      }

      // Sinon, créer une nouvelle session avec upsert pour éviter les doublons
      const { data, error } = await supabase
        .from('work_sessions' as any)
        .upsert({
          user_id: user.id,
          work_date: today,
          initial_cash: initialCash,
          notes: notes || null,
          status: 'open',
          closed_at: null,
        }, {
          onConflict: 'user_id,work_date',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) throw error;

      setWorkSession(data as unknown as WorkSession);
      setIsOpen(true);
      return { error: null };
    } catch (error: any) {
      console.error('Error opening work session:', error);
      
      // Gérer spécifiquement l'erreur de contrainte unique
      if (error.code === '23505' || error.message?.includes('unique constraint')) {
        return { error: 'Une session existe déjà pour aujourd\'hui. Veuillez fermer la session existante avant d\'en créer une nouvelle.' };
      }
      
      return { error: error.message || 'Erreur lors de l\'ouverture de la journée' };
    }
  };

  const closeWorkSession = async (finalCash: number, notes?: string) => {
    if (!workSession) return { error: 'No open work session' };

    try {
      const { data, error } = await supabase
        .from('work_sessions' as any)
        .update({
          closed_at: new Date().toISOString(),
          final_cash: finalCash,
          notes: notes || workSession.notes,
        })
        .eq('id', workSession.id)
        .select()
        .single();

      if (error) throw error;

      setWorkSession(data as unknown as WorkSession);
      setIsOpen(false);
      return { error: null };
    } catch (error: any) {
      console.error('Error closing work session:', error);
      return { error: error.message || 'Erreur lors de la fermeture de la journée' };
    }
  };

  // Admin ne peut pas effectuer d'opérations métier (supervision uniquement)
  const canPerformOperations = role !== 'admin' && isOpen;

  return {
    workSession,
    isOpen,
    loading,
    canPerformOperations,
    openWorkSession,
    closeWorkSession,
    today: format(new Date(), 'dd MMM yyyy', { locale: fr }),
  };
}

