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
      const { data, error } = await supabase
        .from('work_sessions' as any)
        .insert({
          user_id: user.id,
          work_date: today,
          initial_cash: initialCash,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      setWorkSession(data as unknown as WorkSession);
      setIsOpen(true);
      return { error: null };
    } catch (error: any) {
      console.error('Error opening work session:', error);
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

