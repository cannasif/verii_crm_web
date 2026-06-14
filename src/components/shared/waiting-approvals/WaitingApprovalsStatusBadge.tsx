import { type ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WaitingApprovalsStatusBadgeProps {
  status: number;
  label: string;
  className?: string;
}

export function WaitingApprovalsStatusBadge({
  status,
  label,
  className,
}: WaitingApprovalsStatusBadgeProps): ReactElement {
  return (
    <Badge
      variant="outline"
      className={cn(
        'px-2.5 py-1 font-semibold text-[11px] uppercase tracking-wider shadow-sm border-0',
        status === 1
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
          : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
        className,
      )}
    >
      {label}
    </Badge>
  );
}
