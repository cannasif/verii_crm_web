import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Notification01Icon } from 'hugeicons-react';
import { useUnreadCount } from '../hooks/useUnreadCount';
import { NotificationDropdown } from './NotificationDropdown';
import { cn } from '@/lib/utils';

export function NotificationIcon(): ReactElement {
  const { t } = useTranslation();
  const { data: unreadCount = 0 } = useUnreadCount();
  const hasUnread = unreadCount > 0;

  return (
    <NotificationDropdown>
      <button
        className={cn(
          "relative p-2 rounded-xl transition-all duration-300 group outline-none", // p-2.5'ten p-2'ye çekildi
          "hover:bg-slate-100 dark:hover:bg-white/10",
          "active:scale-95"
        )}
        aria-label={`${t('notification.notifications')}${hasUnread ? ` (${unreadCount} ${t('notification.new')})` : ''}`}
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