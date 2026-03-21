import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ToastProps {
  message: string;
  variant: 'success' | 'error';
  onDismiss?: () => void;
  className?: string;
}

export function Toast({ message, variant, onDismiss, className }: ToastProps): ReactElement {
  const { t } = useTranslation('common');
  const isSuccess = variant === 'success';
  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border px-3 py-2 text-sm shadow-sm',
        isSuccess
          ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span>{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
            aria-label={t('common.reportBuilder.dismiss')}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
