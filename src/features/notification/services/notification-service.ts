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

const ACCESS_CONTROL_QUERY_PREFIXES = [
  'activityManagement.',
  'demand.',
  'quotation.',
  'order.',
  'approval.',
] as const;

const ACCESS_CONTROL_QUERY_ROOTS = new Set([
  'permissions',
  'users',
  'auth',
]);

class NotificationService {
  private hubConnection: signalR.HubConnection | null = null;
  private accessControlRefreshPromise: Promise<void> | null = null;
  private connectPromise: Promise<void> | null = null;
  private activeToken: string | null = null;
  private manualDisconnect = false;

  private getToken(): string | null {
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  }

  private buildHubConnection(apiUrl: string): signalR.HubConnection {
    const hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiUrl}/notificationHub`, {
        accessTokenFactory: () => this.getToken() ?? '',
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.elapsedMilliseconds >= 60_000) {
            return null;
          }

          const previousRetryCount = retryContext.previousRetryCount;
          if (previousRetryCount === 0) return 0;
          if (previousRetryCount === 1) return 2_000;
          if (previousRetryCount === 2) return 10_000;
          return Math.min(30_000, 5_000 * (previousRetryCount + 1));
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    hubConnection.serverTimeoutInMilliseconds = 60_000;
    hubConnection.keepAliveIntervalInMilliseconds = 15_000;

    hubConnection.on('ReceiveNotification', (payload: NotificationDto) => {
      this.handleNotification(payload);
    });

    hubConnection.on('AccessControlChanged', (payload: AccessControlChangedPayload) => {
      void this.handleAccessControlChanged(payload);
    });

    hubConnection.onreconnecting(() => {
      console.log('🔄 SignalR reconnecting');
      useNotificationStore.getState().setConnectionState('reconnecting');
    });

    hubConnection.onreconnected(() => {
      console.log('✅ SignalR reconnected');
      useNotificationStore.getState().setConnectionState('connected');
      void this.handleAccessControlChanged({
        forceBootstrapRefresh: true,
        reason: 'signalr-reconnected',
      });
    });

    hubConnection.onclose((error) => {
      if (error) {
        console.error('🔌 SignalR connection closed with error:', error);
      } else {
        console.log('🔌 SignalR connection closed');
      }
      useNotificationStore.getState().setConnectionState('disconnected');
      this.hubConnection = null;
      this.connectPromise = null;

      if (!this.manualDisconnect && this.getToken()) {
        globalThis.setTimeout(() => {
          void this.connect().catch(() => undefined);
        }, 5_000);
      }
    });

    return hubConnection;
  }

  private async startConnectionWithRetry(connection: signalR.HubConnection): Promise<boolean> {
    let attempt = 0;

    while (!this.manualDisconnect) {
      try {
        await connection.start();
        return true;
      } catch (error) {
        attempt += 1;
        console.error('[NotificationService] SignalR start attempt failed:', error);
        const delayMs = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
        await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
      }
    }

    return false;
  }

  async connect(): Promise<void> {
    const token = this.getToken();
    if (!token) {
      console.warn('[NotificationService] No token available for SignalR connection');
      return;
    }

    if (this.hubConnection && this.activeToken !== token) {
      await this.disconnect();
    }

    if (
      this.hubConnection?.state === signalR.HubConnectionState.Connected ||
      this.hubConnection?.state === signalR.HubConnectionState.Connecting ||
      this.hubConnection?.state === signalR.HubConnectionState.Reconnecting
    ) {
      return this.connectPromise ?? Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.manualDisconnect = false;

    this.connectPromise = (async () => {
      try {
        const apiUrl = await getApiUrl();
        const hubConnection = this.buildHubConnection(apiUrl);
        this.hubConnection = hubConnection;
        this.activeToken = token;

        const started = await this.startConnectionWithRetry(hubConnection);
        if (!started) {
          return;
        }
        console.log('✅ SignalR connected to NotificationHub');
        useNotificationStore.getState().setConnectionState('connected');

        await requestNotificationPermission();
      } catch (error) {
        console.error('[NotificationService] SignalR connection error:', error);
        useNotificationStore.getState().setConnectionState('disconnected');
        this.hubConnection = null;
        throw error;
      } finally {
        this.connectPromise = null;
      }
    })();

    return this.connectPromise;
  }

  async disconnect(): Promise<void> {
    this.manualDisconnect = true;
    this.activeToken = null;

    const connection = this.hubConnection;
    this.hubConnection = null;

    if (connection) {
      await connection.stop();
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

      await queryClient.invalidateQueries({
        predicate: (query) => {
          const [root] = query.queryKey;
          if (typeof root !== 'string') {
            return false;
          }

          return (
            ACCESS_CONTROL_QUERY_ROOTS.has(root) ||
            ACCESS_CONTROL_QUERY_PREFIXES.some((prefix) => root.startsWith(prefix))
          );
        },
        refetchType: 'active',
      });
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
