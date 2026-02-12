import { type ReactElement, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Search } from 'lucide-react'; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notificationApi } from '../api/notification-api';
import { useUnreadCount } from '../hooks/useUnreadCount';
import { useNotificationStore } from '../stores/notification-store';
import { NotificationItem } from './NotificationItem';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  children: ReactElement;
}

export function NotificationDropdown({ children }: NotificationDropdownProps): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: unreadCount = 0 } = useUnreadCount();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['notification', 'list'],
    queryFn: ({ pageParam = 1 }) => 
      notificationApi.getUserNotifications(pageParam, 20, 'Id', 'desc'),
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: isOpen,
    staleTime: 30000,
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['notification', 'unread-count'] });
    },
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  const handleNavigate = useCallback((route: string): void => {
    navigate(route);
    setIsOpen(false);
  }, [navigate]);

  const handleScroll = useCallback((): void => {
    const container = scrollContainerRef.current;
    if (!container || isFetchingNextPage || !hasNextPage) return;
    
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (scrollBottom < 200) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isOpen) return;
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isOpen, handleScroll]);

  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    const container = scrollContainerRef.current;
    if (!trigger || !container || !isOpen || !hasNextPage) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage && hasNextPage) {
          fetchNextPage();
        }
      },
      { root: container, rootMargin: '200px', threshold: 0.1 }
    );
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [isOpen, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleMarkAllAsRead = useCallback(async (): Promise<void> => {
    if (unreadCount === 0) return;
    markAllAsReadMutation.mutate();
  }, [unreadCount, markAllAsReadMutation]);

  const handleClose = useCallback((e?: React.MouseEvent): void => {
    e?.stopPropagation();
    setIsOpen(false);
  }, []);

  const { realTimeNotifications } = useNotificationStore();
  
  const apiNotifications = data?.pages.flatMap((page) => page.data) ?? [];
  
  const mergedNotifications = [
    ...realTimeNotifications.filter((n) => !apiNotifications.some((apiN) => apiN.id === n.id)),
    ...apiNotifications,
  ].sort((a, b) => {
    const dateA = new Date(a.createdDate || a.timestamp || 0).getTime();
    const dateB = new Date(b.createdDate || b.timestamp || 0).getTime();
    return dateB - dateA;
  });
  
  const notifications = mergedNotifications;
  const isLoadingInitial = isLoading && notifications.length === 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className={cn(
          "w-80 p-0 border shadow-2xl overflow-hidden z-50 transition-all duration-300", // w-96'dan w-80'e düşürüldü
          "bg-white/90 dark:bg-[#0c0516]/90 backdrop-blur-xl", // Opaklık azaltıldı
          "border-slate-200/60 dark:border-white/10 rounded-2xl",
          "animate-in fade-in zoom-in-95"
        )}
      >
        <div className="p-3.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              {t('notification.title')}
            </span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-pink-500 text-white px-1.5 py-0.5 rounded-md leading-none">
                {unreadCount}
              </span>
            )}
          </div>
          <button 
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-90"
            aria-label={t('notification.close')}
          >
            <X size={16} />
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          className="max-h-[350px] overflow-y-auto custom-scrollbar"
        >
          {isLoadingInitial ? (
            <div className="p-10 text-center">
              <div className="w-5 h-5 border-2 border-pink-500/20 border-t-pink-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search size={20} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-[13px] font-medium italic">
                {t('notification.noNotifications')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-white/5">
              {notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  onNavigate={handleNavigate}
                />
              ))}
              {hasNextPage && <div ref={loadMoreTriggerRef} className="h-4" />}
            </div>
          )}
        </div>

        <div className="p-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/5">
          <button 
            type="button"
            onClick={handleMarkAllAsRead} 
            className={cn(
              "w-full py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-lg",
              "text-slate-500 hover:text-pink-500 dark:text-slate-400 dark:hover:text-pink-400",
              "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
            disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
          >
            {t('notification.markAllAsRead')}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}