import { useEffect, useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminNotification {
  id: string;
  notification_type: string;
  message: string;
  related_user_name: string | null;
  is_read: boolean;
  created_at: string;
}

export function AdminNotifications() {
  const { role, user } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!isAdmin || !user) return;
    fetchNotifications();
  }, [isAdmin, user]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_notifications' as any)
        .select('*')
        .eq('admin_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications((data || []) as unknown as AdminNotification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('admin_notifications' as any)
        .update({ is_read: true })
        .eq('id', id);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from('admin_notifications' as any)
        .update({ is_read: true })
        .eq('admin_user_id', user.id)
        .eq('is_read', false);
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await supabase
        .from('admin_notifications' as any)
        .delete()
        .eq('id', id);
      
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  if (!isAdmin) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatTime = (date: string) => 
    format(new Date(date), 'dd MMM à HH:mm', { locale: fr });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'director_login':
        return '👤';
      default:
        return '🔔';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={markAllAsRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-muted-foreground text-sm">
            Aucune notification
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`flex items-start gap-3 p-3 cursor-pointer ${
                !notification.is_read ? 'bg-primary/5' : ''
              }`}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
            >
              <span className="text-lg">{getNotificationIcon(notification.notification_type)}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(notification.created_at)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
