import { type ReactElement, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Receipt, Package, Headphones, Info } from 'lucide-react';
import type { NotificationDto } from '../types/notification';
import { formatNotificationTime } from '../utils/date-utils';
import { notificationApi } from '../api/notification-api';
import { useAuthStore } from '@/stores/auth-store';
import { useAppShellStore } from '@/stores/app-shell-store';

interface NotificationItemProps {
  notification: NotificationDto;
  onNavigate?: (route: string) => void;
}

export function NotificationItem({ notification, onNavigate }: NotificationItemProps): ReactElement {
  const { t } = useTranslation(['notification', 'common']);
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const decrementUnreadCount = useAppShellStore((state) => state.decrementUnreadCount);

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification', 'list'] });
      if (userId) {
        decrementUnreadCount(userId, 1);
      }
    },
  });

  const getRouteForNotification = useCallback((notificationType: string, entityId: number | null): string | null => {
    const typeString = String(notificationType);
    
    if (typeString.endsWith('Approval')) {
      if (typeString.startsWith('Demand')) {
        return '/demands/waiting-approvals';
      }
      if (typeString.startsWith('Quotation')) {
        return '/quotations/waiting-approvals';
      }
      if (typeString.startsWith('Order')) {
        return '/orders/waiting-approvals';
      }
    }
    
    if (typeString.endsWith('Detail')) {
      if (!entityId) return null;
      
      if (typeString.startsWith('Demand')) {
        return `/demands/${entityId}`;
      }
      if (typeString.startsWith('Quotation')) {
        return `/quotations/${entityId}`;
      }
      if (typeString.startsWith('Order')) {
        return `/orders/${entityId}`;
      }
    }

    return null;
  }, []);

  const getRouteForEntity = useCallback((entityName: string | null, entityId: number | null): string | null => {
    if (!entityName || !entityId) return null;

    const routeMap: Record<string, string> = {
      Demand: `/demands/${entityId}`,
      Quotation: `/quotations/${entityId}`,
      Order: `/orders/${entityId}`,
    };

    return routeMap[entityName] || null;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    let route: string | null = null;

    if (notification.actionUrl) {
      route = notification.actionUrl;
    } else if (notification.notificationType) {
      route = getRouteForNotification(notification.notificationType, notification.relatedEntityId);
    } else if (notification.relatedEntityName && notification.relatedEntityId) {
      route = getRouteForEntity(notification.relatedEntityName, notification.relatedEntityId);
    }

    if (route && onNavigate) {
      onNavigate(route);
    }
  }, [notification, markAsReadMutation, getRouteForNotification, getRouteForEntity, onNavigate]);

  const handleMarkAsRead = useCallback((e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    
    if (notification.isRead) return;
    markAsReadMutation.mutate(notification.id);
  }, [notification, markAsReadMutation]);

  const icon = useMemo(() => {
    const notificationType = notification.notificationType;
    const entityName = notification.relatedEntityName || '';

    if (notificationType === 'QuotationDetail' || notificationType === 'QuotationApproval' || entityName.includes('Quotation') || entityName.includes('Teklif')) {
      return <FileText size={16} className="text-pink-400" />;
    }
    if (notificationType === 'OrderDetail' || notificationType === 'OrderApproval' || entityName.includes('Order') || entityName.includes('Sipariş')) {
      return <Package size={16} className="text-orange-400" />;
    }
    if (notificationType === 'DemandDetail' || notificationType === 'DemandApproval' || entityName.includes('Demand') || entityName.includes('Talep')) {
      return <Receipt size={16} className="text-green-400" />;
    }
    if (entityName.includes('Support') || entityName.includes('Ticket')) {
      return <Headphones size={16} className="text-blue-400" />;
    }

    return <Info size={16} className="text-purple-400" />;
  }, [notification.notificationType, notification.relatedEntityName]);

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
      role="button"
      tabIndex={0}
      className={`px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors cursor-pointer group border-l-2 ${
        !notification.isRead ? 'bg-white/5 border-pink-500/50' : 'border-transparent hover:border-pink-500/50'
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm text-white font-medium truncate leading-tight">
          {notification.title}
        </div>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <div className="text-[10px] text-slate-600 mt-1.5 font-medium">
          {formatNotificationTime(notification.timestamp || notification.createdDate)}
        </div>
      </div>

      {!notification.isRead && (
        <div 
          className="w-2 h-2 rounded-full bg-pink-500 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(236,72,153,0.5)]" 
          title={t('unread')}
          onClick={handleMarkAsRead}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleMarkAsRead(e as unknown as React.MouseEvent);
            }
          }}
          role="button"
          tabIndex={0}
        />
      )}
    </div>
  );
}
