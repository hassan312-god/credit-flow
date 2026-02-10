import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AttendanceAlert {
  type: 'late' | 'absent';
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

export function useAttendanceAlerts() {
  const { role } = useAuth();
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);

  useEffect(() => {
    if (role !== 'admin' && role !== 'directeur') {
      return;
    }

    // Check for alerts every minute
    const interval = setInterval(() => {
      checkAlerts();
    }, 60000); // Check every minute

    // Initial check
    checkAlerts();

    return () => clearInterval(interval);
  }, [role]);

  const checkAlerts = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const currentTime = format(new Date(), 'HH:mm:ss');

      // Get all active work schedules for today
      const dayOfWeek = new Date().getDay();
      const { data: schedule, error: scheduleError } = await supabase
        .from('work_schedule' as any)
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .single();

      if (scheduleError || !schedule) {
        return; // No schedule for today
      }

      // Check for late employees (15 minutes after scheduled start)
      const lateThreshold = new Date();
      const scheduleAny = schedule as any;
      lateThreshold.setHours(parseInt(scheduleAny.start_time.split(':')[0]));
      lateThreshold.setMinutes(parseInt(scheduleAny.start_time.split(':')[1]) + 15);
      lateThreshold.setSeconds(0);

      if (new Date() >= lateThreshold) {
        // Get all users who should have started but haven't or are late
        const { data: sessions, error: sessionsError } = await supabase
          .from('work_sessions' as any)
          .select('id, user_id, work_date, opened_at, closed_at')
          .eq('work_date', today);

        if (!sessionsError && sessions) {
          // Get all active users (excluding admins)
          // First, get user IDs with the specified roles
          const { data: userRoles, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id')
            .in('role', ['agent_credit', 'caissier', 'recouvrement']);

          if (rolesError || !userRoles || userRoles.length === 0) {
            return;
          }

          const userIds = userRoles.map(ur => ur.user_id);

          // Then, get profiles for these users
          const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

          if (!usersError && users) {
            const newAlerts: AttendanceAlert[] = [];

            users.forEach((user) => {
              const session = sessions.find((s: any) => s.user_id === user.id);
              
              if (!session) {
                // Absent - no session opened
                newAlerts.push({
                  type: 'absent',
                  userId: user.id,
                  userName: user.full_name || user.email,
                  message: `${user.full_name || user.email} est absent aujourd'hui`,
                  timestamp: new Date().toISOString(),
                });
              } else if ((session as any).is_late && (session as any).status === 'open') {
                // Late
                newAlerts.push({
                  type: 'late',
                  userId: user.id,
                  userName: user.full_name || user.email,
                  message: `${user.full_name || user.email} est en retard de ${(session as any).late_minutes || 0} minutes`,
                  timestamp: new Date().toISOString(),
                });
              }
            });

            // Show toast notifications for new alerts
            newAlerts.forEach((alert) => {
              if (alert.type === 'absent') {
                toast.warning(alert.message, {
                  duration: 10000,
                });
              } else if (alert.type === 'late') {
                toast.error(alert.message, {
                  duration: 8000,
                });
              }
            });

            setAlerts(newAlerts);
          }
        }
      }
    } catch (error) {
      console.error('Error checking attendance alerts:', error);
    }
  };

  return { alerts, checkAlerts };
}

