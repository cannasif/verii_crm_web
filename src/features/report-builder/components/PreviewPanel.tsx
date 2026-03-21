import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ReportChart } from './ReportChart';
import { cn } from '@/lib/utils';
import type { ChartType } from '../types';

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
        <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
          {t('common.reportBuilder.loadingPreview')}
        </div>
      )}
      {error && !loading && (
        <div className="text-destructive flex flex-1 items-center justify-center text-sm">
          {error}
        </div>
      )}
      {empty && !loading && !error && (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          {t('common.reportBuilder.previewEmpty')}
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
