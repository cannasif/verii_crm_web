import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { notificationService } from '../services/notification-service';

export function useNotificationConnection(): void {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const connectionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const shouldConnect = !!token && !!userId;
    const nextConnectionKey = shouldConnect ? `${userId}:${token}` : null;

    if (shouldConnect && connectionKeyRef.current !== nextConnectionKey) {
      connectionKeyRef.current = nextConnectionKey;

      notificationService.connect().catch((error) => {
        console.error('[useNotificationConnection] Failed to connect to SignalR:', error);
        connectionKeyRef.current = null;
      });
    }

    if (!shouldConnect && connectionKeyRef.current) {
      connectionKeyRef.current = null;
      notificationService.disconnect().catch((error) => {
        console.error('[useNotificationConnection] Failed to disconnect from SignalR:', error);
      });
    }

    return () => {
      if (connectionKeyRef.current) {
        connectionKeyRef.current = null;
        notificationService.disconnect().catch(() => {});
      }
    };
  }, [token, userId]);
}
