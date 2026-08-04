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
  'salesmen360',
]);

class NotificationService {
  private hubConnection: signalR.HubConnection | null = null;
  private accessControlRefreshPromise: Promise<void> | null = null;
  private connectPromise: Promise<void> | null = null;
  private activeToken: string | null = null;
  private manualDisconnect = false;
  private reconnectTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

  private getToken(): string | null {
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  }

  private scheduleReconnect(delayMilliseconds: number): void {
    if (this.manualDisconnect || !this.getToken() || this.reconnectTimer) return;

    this.reconnectTimer = globalThis.setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch(() => undefined);
    }, delayMilliseconds);
  }

  private buildHubConnection(
    apiUrl: string,
    transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
  ): signalR.HubConnection {
    const useDirectWebSocket = transport === signalR.HttpTransportType.WebSockets;
    const hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiUrl}/notificationHub`, {
        accessTokenFactory: () => this.getToken() ?? '',
        transport,
        // Negotiate ve WebSocket isteklerinin farklı IIS worker/sunucularına düşmesi
        // "connection ID is not present" hatası üretir. Doğrudan WebSocket bağlantısı
        // bu iki aşamalı bağımlılığı kaldırır. LongPolling fallback'i negotiate kullanır.
        skipNegotiation: useDirectWebSocket,
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
      if (this.hubConnection !== hubConnection) return;
      useNotificationStore.getState().setConnectionState('reconnecting');
    });

    hubConnection.onreconnected(() => {
      if (this.hubConnection !== hubConnection) return;
      useNotificationStore.getState().setConnectionState('connected');
      void this.handleAccessControlChanged({
        forceBootstrapRefresh: true,
        reason: 'signalr-reconnected',
      });
    });

    hubConnection.onclose((error) => {
      if (this.hubConnection !== hubConnection) return;
      if (error) {
        console.error('🔌 SignalR connection closed with error:', error);
      }
      useNotificationStore.getState().setConnectionState('disconnected');
      this.hubConnection = null;
      this.connectPromise = null;

      if (!this.manualDisconnect && this.getToken()) {
        this.scheduleReconnect(5_000);
      }
    });

    return hubConnection;
  }

  private async createStartedConnection(apiUrl: string): Promise<signalR.HubConnection | null> {
    const transports = [
      signalR.HttpTransportType.WebSockets,
      signalR.HttpTransportType.LongPolling,
    ] as const;

    for (const transport of transports) {
      if (this.manualDisconnect) return null;

      const connection = this.buildHubConnection(apiUrl, transport);
      this.hubConnection = connection;
      try {
        await connection.start();
        return connection;
      } catch (error) {
        const transportName = transport === signalR.HttpTransportType.WebSockets
          ? 'WebSockets'
          : 'LongPolling';
        console.warn(`[NotificationService] ${transportName} bağlantısı başlatılamadı.`, error);
        if (this.hubConnection === connection) {
          this.hubConnection = null;
        }
        try {
          await connection.stop();
        } catch {
          // Başlamamış bağlantının kapatılması ek hata üretmemeli.
        }
      }
    }

    return null;
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
        this.activeToken = token;

        const hubConnection = await this.createStartedConnection(apiUrl);
        if (!hubConnection) {
          throw new Error('SignalR bağlantısı desteklenen transportlarla başlatılamadı.');
        }
        this.hubConnection = hubConnection;
        useNotificationStore.getState().setConnectionState('connected');

        await requestNotificationPermission();
      } catch (error) {
        console.error('[NotificationService] SignalR connection error:', error);
        useNotificationStore.getState().setConnectionState('disconnected');
        this.hubConnection = null;
        this.scheduleReconnect(30_000);
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

    if (this.reconnectTimer) {
      globalThis.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const connection = this.hubConnection;
    this.hubConnection = null;

    if (connection) {
      await connection.stop();
    }
    useNotificationStore.getState().setConnectionState('disconnected');
  }

  private handleNotification(payload: NotificationDto): void {
    const store = useNotificationStore.getState();

    const exists = store.realTimeNotifications.some((n) => n.id === payload.id);
    if (exists) {
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

    const userId = useAuthStore.getState().user?.id ?? null;
    if (userId && notification.userId === userId && notification.isRead !== true) {
      const unreadEntry = useAppShellStore.getState().unreadCounts[String(userId)];
      const nextUnreadCount = (unreadEntry?.data ?? 0) + 1;
      useAppShellStore.getState().setUnreadCount(userId, nextUnreadCount);
    }

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
