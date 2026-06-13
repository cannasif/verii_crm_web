import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Eye,
  FileText,
  Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const VISIBILITY_ENTITY_ICON_MAP: Record<string, LucideIcon> = {
  Activity: CalendarDays,
  Quotation: FileText,
  Demand: ClipboardList,
  Order: Package,
  Salesman360: BarChart3,
};

const VISIBILITY_ENTITY_ACCENT_MAP: Record<string, string> = {
  Activity: 'violet',
  Quotation: 'pink',
  Demand: 'sky',
  Order: 'emerald',
  Salesman360: 'orange',
};

type EntityAccentClasses = {
  iconWrap: string;
  icon: string;
};

export function getVisibilityEntityAccentClasses(entityType: string): EntityAccentClasses {
  const accent = VISIBILITY_ENTITY_ACCENT_MAP[entityType] ?? 'pink';
  const map: Record<string, EntityAccentClasses> = {
    violet: {
      iconWrap: 'bg-violet-100 border-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20',
      icon: 'text-violet-600 dark:text-violet-400',
    },
    pink: {
      iconWrap: 'bg-pink-100 border-pink-100 dark:bg-pink-500/10 dark:border-pink-500/20',
      icon: 'text-pink-600 dark:text-pink-400',
    },
    sky: {
      iconWrap: 'bg-sky-100 border-sky-100 dark:bg-sky-500/10 dark:border-sky-500/20',
      icon: 'text-sky-600 dark:text-sky-400',
    },
    emerald: {
      iconWrap: 'bg-emerald-100 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
    },
    orange: {
      iconWrap: 'bg-orange-100 border-orange-100 dark:bg-orange-500/10 dark:border-orange-500/20',
      icon: 'text-orange-600 dark:text-orange-400',
    },
  };
  return map[accent];
}

export function getVisibilityEntityIcon(entityType: string): LucideIcon {
  return VISIBILITY_ENTITY_ICON_MAP[entityType] ?? Eye;
}

export function getVisibilityScopeBadgeClassName(scopeType: number | null, isUnassigned = false): string {
  if (isUnassigned || scopeType == null) {
    return 'border-slate-200/80 bg-slate-100/90 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400';
  }

  switch (scopeType) {
    case 1:
      return 'border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300';
    case 2:
      return 'border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300';
    case 3:
      return 'border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200';
    case 4:
      return 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300';
    default:
      return 'border-slate-200/80 bg-slate-100/90 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400';
  }
}
