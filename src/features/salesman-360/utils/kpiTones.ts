/**
 * Shared accent system for salesman-360 KPI surfaces.
 * Keeps color meaningful (brand / success / warning / neutral) instead of an
 * arbitrary rainbow per card, which is what a senior-grade dashboard expects.
 */
export type KpiTone = 'primary' | 'secondary' | 'success' | 'warning' | 'neutral';

export const KPI_TONE_ICON_CLASSNAME: Record<KpiTone, string> = {
  primary: 'border-primary/25 bg-accent text-primary dark:border-primary/30 dark:bg-primary/12',
  secondary:
    'border-violet-200/80 bg-violet-50 text-violet-600 dark:border-violet-400/25 dark:bg-violet-500/12 dark:text-violet-300',
  success:
    'border-emerald-200/80 bg-emerald-50 text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-500/12 dark:text-emerald-300',
  warning:
    'border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-400/25 dark:bg-amber-500/12 dark:text-amber-300',
  neutral:
    'border-slate-200/90 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/8 dark:text-slate-300',
};

export const KPI_TONE_SOLID_CLASSNAME: Record<KpiTone, string> = {
  primary: 'bg-[image:var(--crm-brand-gradient)]',
  secondary: 'bg-violet-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  neutral: 'bg-slate-400 dark:bg-slate-500',
};

export const KPI_TONE_BORDER_LEFT_CLASSNAME: Record<KpiTone, string> = {
  primary: 'border-l-primary',
  secondary: 'border-l-violet-500',
  success: 'border-l-emerald-500',
  warning: 'border-l-amber-500',
  neutral: 'border-l-slate-400 dark:border-l-slate-500',
};
