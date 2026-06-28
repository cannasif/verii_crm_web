import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowRight, ArrowUp, Minus } from 'lucide-react';
import { ActivityPriority } from '../types/activity-types';

interface ActivityPriorityBadgeProps {
  priority?: string | number;
}

function normalizePriority(priority?: string | number): ActivityPriority | null {
  if (priority === null || priority === undefined) return null;

  if (typeof priority === 'number') {
    if (priority === ActivityPriority.Low || priority === ActivityPriority.Medium || priority === ActivityPriority.High) {
      return priority;
    }
    return null;
  }

  if (priority === 'Low') return ActivityPriority.Low;
  if (priority === 'Medium') return ActivityPriority.Medium;
  if (priority === 'High') return ActivityPriority.High;
  return null;
}

export function ActivityPriorityBadge({
  priority,
}: ActivityPriorityBadgeProps): ReactElement {
  const { t } = useTranslation(['activity-management', 'common']);

  if (priority === null || priority === undefined) {
    return (
      <span className="text-muted-foreground text-xs flex items-center gap-1">
        <Minus size={12} />
        -
      </span>
    );
  }

  const normalized = normalizePriority(priority);

  const config: Record<string, { label: string; icon: typeof ArrowDown; className: string }> = {
    low: {
      label: t('priorityLow'),
      icon: ArrowDown,
      className: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/20',
    },
    medium: {
      label: t('priorityMedium'),
      icon: ArrowRight,
      className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20',
    },
    high: {
      label: t('priorityHigh'),
      icon: ArrowUp,
      className: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20',
    },
    unknown: {
      label: String(priority),
      icon: Minus,
      className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    },
  };

  const key =
    normalized === ActivityPriority.Low
      ? 'low'
      : normalized === ActivityPriority.Medium
        ? 'medium'
        : normalized === ActivityPriority.High
          ? 'high'
          : 'unknown';

  const currentConfig = config[key];
  const Icon = currentConfig.icon;

  return (
    <Badge
      variant="outline"
      className={`${currentConfig.className} font-medium px-2 py-0.5 text-xs rounded-md border transition-colors flex w-fit items-center gap-1.5 shadow-sm`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {currentConfig.label}
    </Badge>
  );
}
