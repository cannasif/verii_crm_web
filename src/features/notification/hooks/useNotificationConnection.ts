import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useAppShellStore } from '@/stores/app-shell-store';
import { notificationService } from '../services/notification-service';

export function useNotificationConnection(): void {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const bootstrapStatus = useAppShellStore((state) => state.bootstrapStatus);

  useEffect(() => {
    const shouldConnect = !!token && !!userId && bootstrapStatus === 'ready';
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
  }, [bootstrapStatus, token, userId]);
}
