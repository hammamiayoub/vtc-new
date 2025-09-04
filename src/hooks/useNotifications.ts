import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Booking } from '../types';

interface NotificationHook {
  unreadCount: number;
  hasNewBookings: boolean;
  markAsRead: () => void;
  refreshNotifications: () => void;
}

export const useDriverNotifications = (driverId: string): NotificationHook => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewBookings, setHasNewBookings] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>(
    localStorage.getItem(`driver_last_checked_${driverId}`) || new Date().toISOString()
  );

  const fetchNotifications = async () => {
    try {
      // Compter les nouvelles réservations depuis la dernière vérification
      const { data: newBookings, error } = await supabase
        .from('bookings')
        .select('id, created_at, status')
        .eq('driver_id', driverId)
        .in('status', ['pending', 'accepted'])
        .gte('created_at', lastChecked)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des notifications:', error);
        return;
      }

      const count = newBookings?.length || 0;
      setUnreadCount(count);
      setHasNewBookings(count > 0);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const markAsRead = () => {
    const now = new Date().toISOString();
    setLastChecked(now);
    localStorage.setItem(`driver_last_checked_${driverId}`, now);
    setUnreadCount(0);
    setHasNewBookings(false);
  };

  const refreshNotifications = () => {
    fetchNotifications();
  };

  useEffect(() => {
    if (driverId) {
      fetchNotifications();
      
      // Vérifier les notifications toutes les 30 secondes
      const interval = setInterval(fetchNotifications, 30000);
      
      // Écouter les changements en temps réel
      const subscription = supabase
        .channel('driver_bookings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `driver_id=eq.${driverId}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        subscription.unsubscribe();
      };
    }
  }, [driverId, lastChecked]);

  return {
    unreadCount,
    hasNewBookings,
    markAsRead,
    refreshNotifications
  };
};

export const useClientNotifications = (clientId: string): NotificationHook => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewBookings, setHasNewBookings] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>(
    localStorage.getItem(`client_last_checked_${clientId}`) || new Date().toISOString()
  );

  const fetchNotifications = async () => {
    try {
      // Compter les mises à jour de réservations depuis la dernière vérification
      const { data: updatedBookings, error } = await supabase
        .from('bookings')
        .select('id, updated_at, status')
        .eq('client_id', clientId)
        .gte('updated_at', lastChecked)
        .neq('status', 'pending') // Exclure les réservations en attente (pas encore traitées)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des notifications:', error);
        return;
      }

      const count = updatedBookings?.length || 0;
      setUnreadCount(count);
      setHasNewBookings(count > 0);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const markAsRead = () => {
    const now = new Date().toISOString();
    setLastChecked(now);
    localStorage.setItem(`client_last_checked_${clientId}`, now);
    setUnreadCount(0);
    setHasNewBookings(false);
  };

  const refreshNotifications = () => {
    fetchNotifications();
  };

  useEffect(() => {
    if (clientId) {
      fetchNotifications();
      
      // Vérifier les notifications toutes les 30 secondes
      const interval = setInterval(fetchNotifications, 30000);
      
      // Écouter les changements en temps réel
      const subscription = supabase
        .channel('client_bookings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `client_id=eq.${clientId}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        subscription.unsubscribe();
      };
    }
  }, [clientId, lastChecked]);

  return {
    unreadCount,
    hasNewBookings,
    markAsRead,
    refreshNotifications
  };
};