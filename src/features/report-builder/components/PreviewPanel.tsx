import { lazy, Suspense, type ReactElement, type ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ChartType, ReportWidgetAppearance } from '../types';
import { BarChart3, DatabaseZap, Loader2, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const ReportChart = lazy(() =>
  import('./ReportChart').then((module) => ({ default: module.ReportChart }))
);

interface PreviewPanelProps {
  columns: string[];
  rows: unknown[][];
  chartType: ChartType;
  loading: boolean;
  error: string | null;
  empty: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
  minHeightClassName?: string;
  appearance?: ReportWidgetAppearance;
  labelOverrides?: Record<string, string>;
  headerActions?: ReactNode;
}

export function PreviewPanel({
  columns,
  rows,
  chartType,
  loading,
  error,
  empty,
  className,
  title,
  subtitle,
  minHeightClassName,
  appearance,
  labelOverrides,
  headerActions,
}: PreviewPanelProps): ReactElement {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);
  const resolvedTitle = title ?? t('common.reportBuilder.preview');
  const tone = appearance?.tone ?? 'neutral';
  const showStats = appearance?.showStats ?? true;
  const themePreset = appearance?.themePreset ?? 'executive';
  const titleAlign = appearance?.titleAlign ?? 'left';
  const sectionLabel = appearance?.sectionLabel?.trim();
  const backgroundStyle = appearance?.backgroundStyle ?? 'card';
  const toneClassName =
    tone === 'bold'
      ? 'border-transparent bg-slate-950 text-white shadow-xl shadow-slate-950/20'
      : tone === 'soft'
        ? 'border-indigo-100 dark:border-indigo-500/20 bg-linear-to-br from-indigo-50/50 to-white dark:from-indigo-500/5 dark:to-slate-950'
        : 'border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03]';
  const subtitleClassName = tone === 'bold' ? 'text-slate-400 font-medium' : 'text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-0.5';
  const titleClassName = tone === 'bold' ? 'text-white font-black italic uppercase' : 'text-slate-800 dark:text-white font-black uppercase tracking-tight';
  const sectionBadgeClassName =
    themePreset === 'performance'
      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
      : themePreset === 'operations'
        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
        : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20';
  const metricClassName = tone === 'bold'
    ? 'rounded-md bg-white/10 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 text-white/80 border border-white/10'
    : 'rounded-md bg-slate-100 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10';
  const backgroundClassName =
    backgroundStyle === 'glass'
      ? 'backdrop-blur-md bg-white/80 dark:bg-slate-950/80 shadow-sm'
      : backgroundStyle === 'gradient'
        ? 'bg-linear-to-br from-white via-slate-50 to-indigo-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-500/5'
        : backgroundStyle === 'muted'
          ? 'bg-slate-50/50 dark:bg-white/2'
          : '';
  const chartSkeleton = <Skeleton className="h-full min-h-[240px] w-full rounded-2xl" />;

  return (
    <div
      className={cn('flex h-full flex-col rounded-2xl p-4 relative overflow-hidden', toneClassName, backgroundClassName, minHeightClassName, className)}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className={cn(titleAlign === 'center' && 'w-full text-center')}>
          {sectionLabel ? (
            <div className={cn('mb-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]', sectionBadgeClassName)}>
              {sectionLabel}
            </div>
          ) : null}
          <h3 className={cn('text-sm font-semibold tracking-tight', titleClassName, titleAlign === 'center' && 'text-center')}>{resolvedTitle}</h3>
          {subtitle && <p className={cn('mt-1 text-xs', subtitleClassName)}>{subtitle}</p>}
        </div>
        {(showStats && !loading && !error && !empty) || headerActions ? (
          <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
            {showStats && !loading && !error && !empty ? (
              <>
                <span className={metricClassName}>
                  {columns.length} {t('common.reportBuilder.columns')}
                </span>
                <span className={metricClassName}>
                  {rows.length} {t('common.reportBuilder.rows')}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-8 shrink-0 rounded-lg transition-all",
                    tone === 'bold' ? "hover:bg-white/10 text-white" : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-indigo-500"
                  )}
                  onClick={() => setExpanded(true)}
                  aria-label={t('common.expand')}
                >
                  <Maximize2 className="size-4" />
                </Button>
              </>
            ) : null}
            {headerActions}
          </div>
        ) : null}
      </div>
      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
          <Loader2 className="size-6 animate-spin" />
          <span>{t('common.reportBuilder.loadingPreview')}</span>
        </div>
      )}
      {error && !loading && (
        <div className="text-destructive flex flex-1 items-center justify-center text-sm">
          {error}
        </div>
      )}
      {empty && !loading && !error && (
        <div className="text-slate-400 dark:text-slate-500 flex flex-1 flex-col items-center justify-center gap-4 text-sm animate-in fade-in zoom-in-95">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 shadow-inner group">
            <BarChart3 className="size-8 text-slate-300 dark:text-slate-600 transition-transform group-hover:scale-110" />
          </div>
          <div className="space-y-1.5 text-center">
            <p className="font-black uppercase tracking-widest text-xs italic text-slate-600 dark:text-slate-400">{t('common.reportBuilder.previewEmptyTitle')}</p>
            <p className="max-w-[200px] text-[10px] font-bold uppercase tracking-wider leading-relaxed opacity-60">{t('common.reportBuilder.previewEmpty')}</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            <DatabaseZap className="size-3" />
            {t('common.reportBuilder.previewEmptyHint')}
          </div>
        </div>
      )}
      {!loading && !error && !empty && (
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={chartSkeleton}>
            <ReportChart columns={columns} rows={rows} chartType={chartType} appearance={appearance} labelOverrides={labelOverrides} />
          </Suspense>
        </div>
      )}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="!max-w-[min(900px,98vw)] w-[98vw] h-auto max-h-[94vh] p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden">
          <div className="flex flex-col bg-white/95 dark:bg-[#120D19]/95 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden max-h-[94vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 px-8 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                  <BarChart3 className="size-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{resolvedTitle}</DialogTitle>
                  <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mt-0.5">{subtitle || t('common.reportBuilder.preview')}</DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setExpanded(false)} className="rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500">
                  <X className="size-6" />
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4">
              <div className="h-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-2 shadow-inner relative overflow-hidden ">
                <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Suspense fallback={chartSkeleton}>
                  <ReportChart columns={columns} rows={rows} chartType={chartType} appearance={appearance} labelOverrides={labelOverrides} isExpanded={true} className="h-full w-full max-h-none relative z-10" />
                </Suspense>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
