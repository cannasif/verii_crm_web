import { resolveAppPath } from '@/lib/axios';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showLocalNotification = (notification: {
  title: string;
  message: string;
  id: number;
  relatedEntityName?: string | null;
  relatedEntityId?: number | null;
}): void => {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    const notificationOptions: NotificationOptions = {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `notification-${notification.id}`,
      requireInteraction: false,
      data: {
        notificationId: notification.id,
        relatedEntityName: notification.relatedEntityName,
        relatedEntityId: notification.relatedEntityId,
      },
    };

    const browserNotification = new Notification(notification.title, notificationOptions);

    browserNotification.onclick = () => {
      window.focus();
      browserNotification.close();
      
      if (notification.relatedEntityName && notification.relatedEntityId) {
        const routeMap: Record<string, string> = {
          Demand: `/demands/${notification.relatedEntityId}`,
          Quotation: `/quotations/${notification.relatedEntityId}`,
          Order: `/orders/${notification.relatedEntityId}`,
        };
        const route = routeMap[notification.relatedEntityName];
        if (route) {
          window.location.href = resolveAppPath(route);
        }
      }
    };

    setTimeout(() => {
      browserNotification.close();
    }, 5000);
  }
};
