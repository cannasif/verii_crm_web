import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Notification01Icon } from 'hugeicons-react';
import { NotificationDropdown } from './NotificationDropdown';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useAppShellStore } from '@/stores/app-shell-store';

export function NotificationIcon(): ReactElement {
  const { t } = useTranslation(['notification', 'common']);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [shouldFetchUnread, setShouldFetchUnread] = useState(false);
  const unreadCount = useAppShellStore((state) =>
    userId ? state.unreadCounts[String(userId)]?.data ?? 0 : 0
  );
  const refreshUnreadCount = useAppShellStore((state) => state.refreshUnreadCount);
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    const timer = window.setTimeout(() => setShouldFetchUnread(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shouldFetchUnread || !userId) return;
    void refreshUnreadCount(userId);
  }, [refreshUnreadCount, shouldFetchUnread, userId]);

  return (
    <NotificationDropdown>
      <button
        className={cn(
          "relative p-2 rounded-xl transition-all duration-300 group outline-none", // p-2.5'ten p-2'ye çekildi
          "hover:bg-slate-100 dark:hover:bg-white/10",
          "active:scale-95"
        )}
        aria-label={`${t('notifications')}${hasUnread ? ` (${unreadCount} ${t('new')})` : ''}`}
      >
        <Notification01Icon 
          size={20} // 22'den 20'ye düşürüldü, daha zarif
          className={cn(
            "transition-colors duration-300",
            "text-slate-500 group-hover:text-pink-500 dark:text-slate-400 dark:group-hover:text-pink-400"
          )} 
        />
        
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2"> 
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className={cn(
              "relative inline-flex rounded-full h-2 w-2 bg-pink-500 border", // 2.5'tan 2'ye, border-2'den border'e
              "border-white dark:border-[#0c0516]"
            )}></span>
          </span>
        )}
      </button>
    </NotificationDropdown>
  );
}
