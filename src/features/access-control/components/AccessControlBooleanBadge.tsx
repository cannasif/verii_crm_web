import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';

type AccessControlBooleanBadgeProps = {
  value: boolean;
  yesLabel: string;
  noLabel: string;
  variant?: 'active' | 'admin';
};

export function AccessControlBooleanBadge({
  value,
  yesLabel,
  noLabel,
  variant = 'active',
}: AccessControlBooleanBadgeProps): ReactElement {
  const yesClassName =
    variant === 'admin'
      ? 'border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-200'
      : 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300';

  return (
    <div className="flex justify-center">
      {value ? (
        <span
          className={cn(
            'inline-flex min-w-[3.25rem] items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
            yesClassName
          )}
        >
          {yesLabel}
        </span>
      ) : (
        <span
          className="inline-flex min-w-[3.25rem] items-center justify-center rounded-full border border-red-200/80 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300"
        >
          {noLabel}
        </span>
      )}
    </div>
  );
}
