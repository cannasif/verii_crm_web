import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { notificationService } from '../services/notification-service';

export function useNotificationConnection(): void {
  const { isAuthenticated } = useAuthStore();
  const connectedRef = useRef(false);

  useEffect(() => {
    const shouldConnect = isAuthenticated();

    if (shouldConnect && !connectedRef.current) {
      connectedRef.current = true;

      notificationService.connect().catch((error) => {
        console.error('[useNotificationConnection] Failed to connect to SignalR:', error);
        connectedRef.current = false;
      });
    }

    if (!shouldConnect && connectedRef.current) {
      connectedRef.current = false;
      notificationService.disconnect().catch((error) => {
        console.error('[useNotificationConnection] Failed to disconnect from SignalR:', error);
      });
    }

    return () => {
      if (connectedRef.current) {
        connectedRef.current = false;
        notificationService.disconnect().catch(() => {});
      }
    };
  }, [isAuthenticated]);
}

