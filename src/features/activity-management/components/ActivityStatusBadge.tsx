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
  const { t } = useTranslation();
  const normalized = normalizeStatus(status);

  const config: Record<string, { icon: typeof CalendarClock; className: string; label: string }> = {
    scheduled: {
      icon: CalendarClock,
      className: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20 hover:bg-violet-100 dark:hover:bg-violet-500/20',
      label: t('activityManagement.statusScheduled', 'Planlandı'),
    },
    completed: {
      icon: CheckCircle2,
      className: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20 hover:bg-green-100 dark:hover:bg-green-500/20',
      label: t('activityManagement.statusCompleted', 'Tamamlandı'),
    },
    cancelled: {
      icon: XCircle,
      className: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20',
      label: t('activityManagement.statusCanceled', 'İptal Edildi'),
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
