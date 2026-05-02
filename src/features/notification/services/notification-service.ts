import * as signalR from '@microsoft/signalr';
import type { NotificationDto } from '../types/notification';
import { useNotificationStore } from '../stores/notification-store';
import { getApiUrl } from '@/lib/axios';
import { showLocalNotification, requestNotificationPermission } from '../utils/web-notifications';
import { useAuthStore } from '@/stores/auth-store';
import { useAppShellStore } from '@/stores/app-shell-store';
import { queryClient } from '@/lib/query-client';

interface AccessControlChangedPayload {
  reason?: string;
  forceBootstrapRefresh?: boolean;
  issuedAt?: string;
}

class NotificationService {
  private hubConnection: signalR.HubConnection | null = null;
  private accessControlRefreshPromise: Promise<void> | null = null;

  private getToken(): string | null {
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  }

  async connect(): Promise<void> {
    const token = this.getToken();
    if (!token) {
      console.warn('[NotificationService] No token available for SignalR connection');
      return;
    }

    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      const apiUrl = await getApiUrl();
      const hubUrl = `${apiUrl}/notificationHub?access_token=${encodeURIComponent(token)}`;

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            const previousRetryCount = retryContext.previousRetryCount;
            if (previousRetryCount === 0) return 0;
            if (previousRetryCount === 1) return 2000;
            if (previousRetryCount === 2) return 10000;
            return 30000;
          },
        })
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.hubConnection.on('ReceiveNotification', (payload: NotificationDto) => {
        this.handleNotification(payload);
      });

      this.hubConnection.on('AccessControlChanged', (payload: AccessControlChangedPayload) => {
        void this.handleAccessControlChanged(payload);
      });

      this.hubConnection.onreconnecting(() => {
        console.log('🔄 SignalR reconnecting');
        useNotificationStore.getState().setConnectionState('reconnecting');
      });

      this.hubConnection.onreconnected((connectionId) => {
        console.log('✅ SignalR reconnected', connectionId);
        useNotificationStore.getState().setConnectionState('connected');
      });

      this.hubConnection.onclose((error) => {
        if (error) {
          console.error('🔌 SignalR connection closed with error:', error);
        } else {
          console.log('🔌 SignalR connection closed');
        }
        useNotificationStore.getState().setConnectionState('disconnected');
      });

      await this.hubConnection.start();
      console.log('✅ SignalR connected to NotificationHub');
      useNotificationStore.getState().setConnectionState('connected');
      
      await requestNotificationPermission();
    } catch (error) {
      console.error('[NotificationService] SignalR connection error:', error);
      useNotificationStore.getState().setConnectionState('disconnected');
    }
  }

  async disconnect(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = null;
    }
    useNotificationStore.getState().setConnectionState('disconnected');
  }

  private handleNotification(payload: NotificationDto): void {
    console.log('📬 SignalR Notification received:', payload);

    const store = useNotificationStore.getState();
    
    const exists = store.realTimeNotifications.some((n) => n.id === payload.id);
    if (exists) {
      console.log('⚠️ Duplicate notification ignored:', payload.id);
      return;
    }

    const notification: NotificationDto = {
      id: payload.id,
      titleKey: payload.titleKey || '',
      titleArgs: payload.titleArgs || null,
      title: payload.title || '',
      messageKey: payload.messageKey || '',
      messageArgs: payload.messageArgs || null,
      message: payload.message || '',
      isRead: payload.isRead || false,
      userId: payload.userId || 0,
      relatedEntityName: payload.relatedEntityName || null,
      relatedEntityId: payload.relatedEntityId || null,
      notificationType: payload.notificationType,
      createdDate: payload.createdDate || new Date().toISOString(),
      updatedDate: payload.updatedDate || null,
      createdBy: payload.createdBy || null,
      updatedBy: payload.updatedBy || null,
      readDate: payload.readDate || null,
      timestamp: payload.createdDate || new Date().toISOString(),
      channel: payload.channel || 'Web',
      severity: payload.severity || 'info',
      recipientUserId: payload.recipientUserId ?? null,
      recipientTerminalUserId: payload.recipientTerminalUserId ?? null,
      relatedEntityType: payload.relatedEntityName || null,
      actionUrl: payload.actionUrl || null,
      terminalActionCode: payload.terminalActionCode || null,
    };

    store.addRealTimeNotification(notification);

    showLocalNotification({
      title: notification.title,
      message: notification.message,
      id: notification.id,
      relatedEntityName: notification.relatedEntityName,
      relatedEntityId: notification.relatedEntityId,
    });
  }

  getConnectionState(): signalR.HubConnectionState | null {
    return this.hubConnection?.state ?? null;
  }

  private async handleAccessControlChanged(payload: AccessControlChangedPayload): Promise<void> {
    if (this.accessControlRefreshPromise) {
      return this.accessControlRefreshPromise;
    }

    this.accessControlRefreshPromise = (async () => {
      const token = this.getToken();
      const userId = useAuthStore.getState().user?.id ?? null;
      if (!token || !userId) {
        return;
      }

      await useAppShellStore.getState().bootstrapAppShell({
        token,
        userId,
        force: payload.forceBootstrapRefresh ?? true,
      });

      await queryClient.invalidateQueries();
      await queryClient.refetchQueries({ type: 'active' });
    })()
      .catch((error) => {
        console.error('[NotificationService] Access control refresh failed:', error);
      })
      .finally(() => {
        this.accessControlRefreshPromise = null;
      });

    return this.accessControlRefreshPromise;
  }
}

export const notificationService = new NotificationService();
