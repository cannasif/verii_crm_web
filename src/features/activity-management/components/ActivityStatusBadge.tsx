import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { ActivityStatus } from '../types/activity-types';

interface ActivityStatusBadgeProps {
  status: string | number;
}

function normalizeStatus(status: string | number): ActivityStatus | null {
  if (typeof status === 'number') {
    if (status === ActivityStatus.Scheduled || status === ActivityStatus.Completed || status === ActivityStatus.Cancelled) {
      return status;
    }
    return null;
  }

  if (status === 'Scheduled') return ActivityStatus.Scheduled;
  if (status === 'Completed') return ActivityStatus.Completed;
  if (status === 'Cancelled' || status === 'Canceled') return ActivityStatus.Cancelled;
  return null;
}

export function ActivityStatusBadge({
  status,
}: ActivityStatusBadgeProps): ReactElement {
  const { t } = useTranslation(['activity-management', 'common']);
  const normalized = normalizeStatus(status);

  const config: Record<string, { icon: typeof CalendarClock; className: string; label: string }> = {
    scheduled: {
      icon: CalendarClock,
      className: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20',
      label: t('statusScheduled'),
    },
    completed: {
      icon: CheckCircle2,
      className: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20',
      label: t('statusCompleted'),
    },
    cancelled: {
      icon: XCircle,
      className: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20',
      label: t('statusCanceled'),
    },
    unknown: {
      icon: HelpCircle,
      className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      label: String(status),
    },
  };

  const key =
    normalized === ActivityStatus.Scheduled
      ? 'scheduled'
      : normalized === ActivityStatus.Completed
        ? 'completed'
        : normalized === ActivityStatus.Cancelled
          ? 'cancelled'
          : 'unknown';

  const currentConfig = config[key];
  const Icon = currentConfig.icon;

  return (
    <Badge
      variant="outline"
      className={`${currentConfig.className} font-medium px-2.5 py-0.5 text-xs rounded-md border transition-colors flex w-fit items-center gap-1.5 shadow-sm`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {currentConfig.label}
    </Badge>
  );
}
