import { useEffect, useState, type ReactElement } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const SHOW_DELAY_MS = 180;
const HIDE_DELAY_MS = 220;

export function GlobalNetworkIndicator(): ReactElement | null {
  const { t } = useTranslation('common');
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [visible, setVisible] = useState(false);
  const [activeApiRequestCount, setActiveApiRequestCount] = useState(0);

  const isBusy = isFetching > 0 || isMutating > 0 || activeApiRequestCount > 0;

  useEffect(() => {
    const handleApiActivity = (event: Event): void => {
      const detail = (event as CustomEvent<{ activeCount?: number }>).detail;
      const nextCount = detail?.activeCount;
      setActiveApiRequestCount(typeof nextCount === 'number' ? Math.max(0, nextCount) : 0);
    };

    window.addEventListener('crm-api-activity', handleApiActivity);
    return () => window.removeEventListener('crm-api-activity', handleApiActivity);
  }, []);

  useEffect(() => {
    const delay = isBusy ? SHOW_DELAY_MS : HIDE_DELAY_MS;
    const timeoutId = window.setTimeout(() => {
      setVisible(isBusy);
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [isBusy]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[1100] flex justify-center"
      role="status"
      aria-live="polite"
      aria-label={t('loading', { defaultValue: 'Loading...' })}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-transparent">
        <div className="h-full w-1/2 animate-[crm-network-progress_1.1s_ease-in-out_infinite] rounded-full bg-[var(--crm-brand-primary)] shadow-[0_0_12px_var(--crm-brand-ring)]" />
      </div>
      <div
        className={cn(
          'mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-md',
          'border-slate-200 bg-white/90 text-slate-700',
          'dark:border-white/10 dark:bg-slate-950/85 dark:text-slate-200'
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--crm-brand-text)]" />
        {t('loading', { defaultValue: 'Loading...' })}
      </div>
    </div>
  );
}
