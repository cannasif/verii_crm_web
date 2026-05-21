import { type ReactElement } from 'react';
import { cn } from '@/lib/utils';

interface ErpIntegrationPillProps {
  integrated: boolean;
  label: string;
  className?: string;
}

export function ErpIntegrationPill({ integrated, label, className }: ErpIntegrationPillProps): ReactElement {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight',
        integrated
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300'
          : 'border-slate-300/80 bg-slate-100/80 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400',
        className
      )}
    >
      {label}
    </span>
  );
}
