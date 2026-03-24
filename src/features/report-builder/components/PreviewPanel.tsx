import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ReportChart } from './ReportChart';
import { cn } from '@/lib/utils';
import type { ChartType } from '../types';
import { BarChart3, DatabaseZap, Loader2 } from 'lucide-react';

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
}: PreviewPanelProps): ReactElement {
  const { t } = useTranslation('common');
  const resolvedTitle = title ?? t('common.reportBuilder.preview');

  return (
    <div className={cn('flex h-full flex-col rounded-lg border bg-card p-4', minHeightClassName, className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-muted-foreground text-sm font-medium">{resolvedTitle}</h3>
          {subtitle && <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>}
        </div>
        {!loading && !error && !empty && (
          <div className="flex gap-2">
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
              {columns.length} {t('common.reportBuilder.columns')}
            </span>
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
              {rows.length} {t('common.reportBuilder.rows')}
            </span>
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
          <ReportChart columns={columns} rows={rows} chartType={chartType} />
        </div>
      )}
    </div>
  );
}
