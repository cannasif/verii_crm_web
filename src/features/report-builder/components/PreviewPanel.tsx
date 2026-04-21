import { lazy, Suspense, type ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ChartType, ReportWidgetAppearance } from '../types';
import { BarChart3, DatabaseZap, Loader2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
}: PreviewPanelProps): ReactElement {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);
  const resolvedTitle = title ?? t('common.reportBuilder.preview');
  const tone = appearance?.tone ?? 'neutral';
  const accentColor = appearance?.accentColor ?? '#1d4ed8';
  const showStats = appearance?.showStats ?? true;
  const themePreset = appearance?.themePreset ?? 'executive';
  const titleAlign = appearance?.titleAlign ?? 'left';
  const sectionLabel = appearance?.sectionLabel?.trim();
  const backgroundStyle = appearance?.backgroundStyle ?? 'card';
  const toneClassName =
    tone === 'bold'
      ? 'border-transparent bg-slate-950 text-white shadow-lg'
      : tone === 'soft'
        ? 'border-primary/20 bg-linear-to-br from-primary/5 via-background to-background'
        : 'border bg-card';
  const subtitleClassName = tone === 'bold' ? 'text-slate-300' : 'text-muted-foreground';
  const titleClassName = tone === 'bold' ? 'text-slate-200' : 'text-muted-foreground';
  const sectionBadgeClassName =
    themePreset === 'performance'
      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
      : themePreset === 'operations'
        ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
        : 'bg-blue-500/10 text-blue-700 border-blue-500/20';
  const metricClassName = tone === 'bold'
    ? 'rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200'
    : 'rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground';
  const backgroundClassName =
    backgroundStyle === 'glass'
      ? 'backdrop-blur-md bg-white/70 dark:bg-slate-950/70'
      : backgroundStyle === 'gradient'
        ? 'bg-linear-to-br from-white via-slate-50 to-primary/5 dark:from-slate-950 dark:via-slate-950 dark:to-primary/10'
        : backgroundStyle === 'muted'
          ? 'bg-muted/60'
          : '';
  const chartSkeleton = <Skeleton className="h-full min-h-[240px] w-full rounded-2xl" />;

  return (
    <div
      className={cn('flex h-full flex-col rounded-2xl p-4 transition-colors', toneClassName, backgroundClassName, minHeightClassName, className)}
      style={{ borderTop: `4px solid ${accentColor}` }}
    >
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
        {showStats && !loading && !error && !empty && (
          <div className="flex items-center gap-2">
            <span className={metricClassName}>
              {columns.length} {t('common.reportBuilder.columns')}
            </span>
            <span className={metricClassName}>
              {rows.length} {t('common.reportBuilder.rows')}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0 rounded-full"
              onClick={() => setExpanded(true)}
              aria-label={t('common.expand')}
            >
              <Maximize2 className="size-4" />
            </Button>
          </div>
        )}
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
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-sm">
          <div className="flex size-14 items-center justify-center rounded-2xl border bg-muted/40">
            <BarChart3 className="size-6" />
          </div>
          <div className="space-y-1 text-center">
            <p className="font-medium">{t('common.reportBuilder.previewEmptyTitle')}</p>
            <p className="max-w-sm text-xs">{t('common.reportBuilder.previewEmpty')}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-[11px]">
            <DatabaseZap className="size-3.5" />
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
        <DialogContent className="max-w-[min(1400px,96vw)] w-[96vw] h-[92vh] p-0 overflow-hidden">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{resolvedTitle}</DialogTitle>
            <DialogDescription>{subtitle || t('common.reportBuilder.preview')}</DialogDescription>
          </DialogHeader>
          <div className="h-full min-h-0 p-6">
            <div className="h-full rounded-2xl border bg-background p-4">
              <Suspense fallback={chartSkeleton}>
                <ReportChart columns={columns} rows={rows} chartType={chartType} appearance={appearance} labelOverrides={labelOverrides} className="h-full max-h-none" />
              </Suspense>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
