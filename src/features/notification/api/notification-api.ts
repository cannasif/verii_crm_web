import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse } from '@/types/api';
import type { NotificationDto, GetPagedNotificationsRequest } from '../types/notification';
import { NotificationType } from '../types/notification';

type NotificationTypeValue = keyof typeof NotificationType;

const mapNotificationType = (type: unknown): NotificationTypeValue => {
  if (typeof type === 'string') {
    const validTypes: NotificationTypeValue[] = [
      'DemandDetail',
      'DemandApproval',
      'QuotationDetail',
      'QuotationApproval',
      'OrderDetail',
      'OrderApproval',
    ];
    if (validTypes.includes(type as NotificationTypeValue)) {
      return type as NotificationTypeValue;
    }
  }
  return 'DemandDetail';
};

const mapNotification = (item: unknown): NotificationDto => {
  const notification = item as Record<string, unknown>;
  
  const mappedNotification = {
    id: Number(notification.id) || 0,
    titleKey: String(notification.titleKey || ''),
    titleArgs: notification.titleArgs as string | null,
    title: String(notification.title || ''),
    messageKey: String(notification.messageKey || ''),
    messageArgs: notification.messageArgs as string | null,
    message: String(notification.message || ''),
    isRead: Boolean(notification.isRead),
    userId: Number(notification.userId || notification.recipientUserId || 0),
    relatedEntityName: (notification.relatedEntityName || notification.relatedEntityType) as string | null,
    relatedEntityId: notification.relatedEntityId as number | null,
    notificationType: mapNotificationType(notification.notificationType || notification.type),
    createdDate: String(notification.createdDate || notification.timestamp || new Date().toISOString()),
    updatedDate: notification.updatedDate as string | null,
    createdBy: notification.createdBy as number | null,
    updatedBy: notification.updatedBy as number | null,
    readDate: notification.readDate as string | null,
    timestamp: String(notification.timestamp || notification.createdDate || new Date().toISOString()),
    channel: (notification.channel as 'Terminal' | 'Web') || 'Web',
    severity: (notification.severity as 'info' | 'warning' | 'error') || 'info',
    recipientUserId: notification.recipientUserId as number | null,
    recipientTerminalUserId: notification.recipientTerminalUserId as number | null,
    relatedEntityType: (notification.relatedEntityType || notification.relatedEntityName) as string | null,
    actionUrl: notification.actionUrl as string | null,
    terminalActionCode: notification.terminalActionCode as string | null,
  };
  
  return mappedNotification;
};

interface BackendPagedResponse {
  items: unknown[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export const notificationApi = {
  getUserNotifications: async (
    pageNumber: number = 1,
    pageSize: number = 10,
    sortBy: string = 'Id',
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Promise<PagedResponse<NotificationDto>> => {
    try {
      const response = await api.post<ApiResponse<BackendPagedResponse>>('/api/Notification/user-notifications/query', {
        pageNumber,
        pageSize,
        search: '',
        sortBy,
        sortDirection,
        filterLogic: 'and',
        filters: [],
      });
      
      if (!response || !response.success || !response.data) {
        throw new Error(response?.message || 'Bildirimler yüklenemedi');
      }
      
      const pagedData = response.data;
      
      return {
        data: Array.isArray(pagedData.items) ? pagedData.items.map(mapNotification) : [],
        totalCount: pagedData.totalCount || 0,
        pageNumber: pagedData.pageNumber || pageNumber,
        pageSize: pagedData.pageSize || pageSize,
        totalPages: pagedData.totalPages || 0,
        hasPreviousPage: pagedData.hasPreviousPage || false,
        hasNextPage: pagedData.hasNextPage || false,
      };
    } catch (error) {
      console.error('getUserNotifications error:', error);
      return {
        data: [],
        totalCount: 0,
        pageNumber,
        pageSize,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      };
    }
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<number>>('/api/Notification/unread-count');
      if (response.success && response.data !== undefined && response.data !== null) {
        return typeof response.data === 'number' ? response.data : 0;
      }
      return 0;
    } catch (error) {
      console.error('getUnreadCount error:', error);
      return 0;
    }
  },

  markAsRead: async (id: number): Promise<boolean> => {
    const response = await api.put<ApiResponse<boolean>>(`/api/Notification/mark-as-read/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Bildirim okundu olarak işaretlenemedi');
  },

  markAllAsRead: async (): Promise<boolean> => {
    const response = await api.put<ApiResponse<boolean>>('/api/Notification/mark-all-as-read');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Tüm bildirimler okundu olarak işaretlenemedi');
  },

  deleteNotification: async (id: number): Promise<boolean> => {
    const response = await api.delete<ApiResponse<boolean>>(`/api/Notification/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Bildirim silinemedi');
  },

  getPagedNotifications: async (
    params: GetPagedNotificationsRequest = {}
  ): Promise<PagedResponse<NotificationDto>> => {
    return notificationApi.getUserNotifications(
      params.pageNumber ?? 1,
      params.pageSize ?? 10,
      params.sortBy ?? 'Id',
      (params.sortDirection as 'asc' | 'desc') ?? 'desc'
    );
  },
};
