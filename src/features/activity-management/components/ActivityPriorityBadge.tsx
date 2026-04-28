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
      className: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20',
    },
    medium: {
      label: t('priorityMedium'),
      icon: ArrowRight,
      className: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20 hover:bg-orange-100 dark:hover:bg-orange-500/20',
    },
    high: {
      label: t('priorityHigh'),
      icon: ArrowUp,
      className: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20',
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
