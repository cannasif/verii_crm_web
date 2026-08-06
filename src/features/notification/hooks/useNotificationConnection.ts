import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { notificationService } from '../services/notification-service';

export function useNotificationConnection(): void {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id ?? null);

  useEffect(() => {
    const shouldConnect = !!token && !!userId;
    let isCurrentEffect = true;

    if (shouldConnect) {
      notificationService.connect().catch((error) => {
        if (isCurrentEffect) {
          console.error('[useNotificationConnection] Failed to connect to SignalR:', error);
        }
      });
    } else {
      notificationService.disconnect().catch((error) => {
        console.error('[useNotificationConnection] Failed to disconnect from SignalR:', error);
      });
    }

    return () => {
      isCurrentEffect = false;
    };
  }, [token, userId]);
}
