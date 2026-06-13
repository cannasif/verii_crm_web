const ROLE_BADGE_CLASS_BY_KEY: Record<string, string> = {
  admin:
    'border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300',
  user: 'border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300',
  manager:
    'border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200',
  supervisor:
    'border-orange-200/80 bg-orange-50 text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300',
};

const DEFAULT_ROLE_BADGE_CLASSNAME =
  'border-slate-200/80 bg-slate-50 text-slate-700 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-300';

export function getUserRoleBadgeClassName(role: string | null | undefined): string {
  const normalized = role?.trim().toLowerCase() ?? '';
  if (!normalized) return DEFAULT_ROLE_BADGE_CLASSNAME;
  return ROLE_BADGE_CLASS_BY_KEY[normalized] ?? DEFAULT_ROLE_BADGE_CLASSNAME;
}

export function getUserActiveStatusBadgeClassName(isActive: boolean): string {
  if (isActive) {
    return 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300';
  }
  return 'border-slate-200/80 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-400';
}

export const USER_CONFIRMED_BADGE_CLASSNAME =
  'border-sky-200/70 bg-sky-50/90 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300';
