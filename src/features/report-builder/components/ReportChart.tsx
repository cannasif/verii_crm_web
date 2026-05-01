import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ChartType, ReportWidgetAppearance, ReportWidgetTableColumnSetting } from '../types';
import { useRechartsModule } from '@/lib/useRechartsModule';
import { Button } from '@/components/ui/button';
import { formatSystemCurrency, formatSystemDate, formatSystemNumber } from '@/lib/system-settings';
import { TrendingUp } from 'lucide-react';

type ColumnItem = string | { name: string; sqlType?: string; dotNetType?: string; isNullable?: boolean };

interface ReportChartProps {
  columns: string[] | ColumnItem[];
  rows: unknown[][];
  chartType: ChartType;
  className?: string;
  appearance?: ReportWidgetAppearance;
  labelOverrides?: Record<string, string>;
  isExpanded?: boolean;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#a4de6c'];

function ensureRowArray(row: unknown): unknown[] {
  if (Array.isArray(row)) return row;
  if (row !== null && typeof row === 'object') return Object.values(row);
  return [];
}

function columnToLabel(col: ColumnItem): string {
  return typeof col === 'string' ? col : (col?.name ?? '');
}

function normalizeColumns(cols: ColumnItem[], labelOverrides?: Record<string, string>): string[] {
  return (cols ?? []).map((c) => {
    const label = columnToLabel(c);
    return labelOverrides?.[label] || label;
  });
}

function getRawColumns(cols: ColumnItem[]): string[] {
  return (cols ?? []).map((c) => columnToLabel(c));
}

function buildPalette(accentColor?: string): string[] {
  return [accentColor || COLORS[0], ...COLORS.filter((color) => color !== accentColor)];
}

function formatKpiValue(value: number, format: NonNullable<ReportWidgetAppearance['kpiFormat']>): string {
  if (format === 'currency') {
    return formatSystemCurrency(value);
  }
  if (format === 'percent') {
    return `${formatSystemNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
  }
  return formatSystemNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatMetricValue(
  value: number,
  format: NonNullable<ReportWidgetAppearance['valueFormat']>,
  decimalPlaces: number
): string {
  if (format === 'currency') {
    return formatSystemCurrency(value);
  }
  if (format === 'percent') {
    return `${formatSystemNumber(value, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    })}%`;
  }
  return formatSystemNumber(value, {
    minimumFractionDigits: format === 'default' ? 0 : decimalPlaces,
    maximumFractionDigits: format === 'default' ? 2 : decimalPlaces,
  });
}

function renderCellValue(cell: unknown, appearance?: ReportWidgetAppearance): string {
  return renderCellValueWithSetting(cell, appearance);
}

function renderCellValueWithSetting(
  cell: unknown,
  appearance?: ReportWidgetAppearance,
  columnSetting?: ReportWidgetTableColumnSetting,
): string {
  const format = columnSetting?.valueFormat ?? appearance?.valueFormat ?? 'default';
  const decimalPlaces = columnSetting?.decimalPlaces ?? appearance?.decimalPlaces ?? 0;
  if (typeof cell === 'number') {
    return formatMetricValue(cell, format, decimalPlaces);
  }
  if (typeof cell === 'string' && cell.trim() !== '' && !Number.isNaN(Number(cell))) {
    return formatMetricValue(Number(cell), format, decimalPlaces);
  }
  return String(cell ?? '');
}

function getColumnWidthClass(width?: ReportWidgetTableColumnSetting['width']): string {
  if (width === 'sm') return 'min-w-[140px]';
  if (width === 'md') return 'min-w-[220px]';
  if (width === 'lg') return 'min-w-[320px]';
  return 'min-w-[112px]';
}

function getColumnAlignClass(align?: ReportWidgetTableColumnSetting['align'], columnLabel?: string): string {
  if (columnLabel?.toLowerCase().includes('öncelik') || columnLabel?.toLowerCase().includes('priority')) return 'text-left';
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

function formatAxisTooltipLabel(value: unknown): string {
  if (typeof value !== 'string') return String(value ?? '');
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime()) && value.includes('T')) {
    return formatSystemDate(parsed);
  }
  return value;
}

export function ReportChart({ columns, rows, chartType, className, appearance, labelOverrides }: ReportChartProps): ReactElement {
  const { t } = useTranslation('common');
  const [showAllSeries, setShowAllSeries] = useState(false);
  const needsRecharts =
    chartType === 'bar' ||
    chartType === 'stackedBar' ||
    chartType === 'line' ||
    chartType === 'pie' ||
    chartType === 'donut';
  const recharts = useRechartsModule(needsRecharts);
  const Recharts = recharts;
  const palette = useMemo(() => buildPalette(appearance?.accentColor), [appearance?.accentColor]);
  const tableDensity = appearance?.tableDensity ?? 'comfortable';
  const hiddenColumns = appearance?.hiddenColumns ?? [];
  const tableColumnOrder = appearance?.tableColumnOrder ?? [];
  const tableColumnSettings = appearance?.tableColumnSettings ?? [];
  const themePreset = appearance?.themePreset ?? 'executive';
  const kpiFormat = appearance?.kpiFormat ?? 'number';
  const kpiLayout = appearance?.kpiLayout ?? 'split';
  const valueFormat = appearance?.valueFormat ?? 'default';
  const decimalPlaces = appearance?.decimalPlaces ?? 0;
  const seriesVisibilityMode = appearance?.seriesVisibilityMode ?? 'auto';
  const maxVisibleSeries = appearance?.maxVisibleSeries ?? 8;
  const seriesOverflowMode = appearance?.seriesOverflowMode ?? 'others';
  const rawColumns = useMemo(() => getRawColumns(columns), [columns]);
  const columnLabels = useMemo(() => normalizeColumns(columns, labelOverrides), [columns, labelOverrides]);
  const normalizedRows = useMemo(
    () => (Array.isArray(rows) ? rows.map(ensureRowArray) : []),
    [rows]
  );
  const visibleColumnIndexes = useMemo(() => {
    const allIndexes = rawColumns.map((_, index) => index);
    const explicitIndexes = tableColumnOrder
      .map((name) => rawColumns.findIndex((raw) => raw === name))
      .filter((index) => index >= 0);
    const remainingIndexes = allIndexes.filter((index) => !explicitIndexes.includes(index));
    return [...explicitIndexes, ...remainingIndexes].filter((index) => !hiddenColumns.includes(rawColumns[index]));
  }, [hiddenColumns, rawColumns, tableColumnOrder]);
  const orderedColumnLabels = useMemo(() => visibleColumnIndexes.map((index) => columnLabels[index]), [columnLabels, visibleColumnIndexes]);
  const orderedRawColumns = useMemo(() => visibleColumnIndexes.map((index) => rawColumns[index]), [rawColumns, visibleColumnIndexes]);
  const orderedColumnSettings = useMemo(
    () =>
      orderedRawColumns.map((column) => tableColumnSettings.find((item) => item.key === column)),
    [orderedRawColumns, tableColumnSettings],
  );
  const orderedRows = useMemo(
    () => normalizedRows.map((row) => visibleColumnIndexes.map((index) => row[index])),
    [normalizedRows, visibleColumnIndexes],
  );

  const tableData = useMemo(() => {
    return normalizedRows.map((row) => {
      const obj: Record<string, unknown> = {};
      columnLabels.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }, [columnLabels, normalizedRows]);

  const multiSeriesChartData = useMemo(() => {
    if (!(chartType === 'bar' || chartType === 'stackedBar' || chartType === 'line')) return null;
    if (columnLabels.length < 3) return null;

    const axisKey = columnLabels[0];
    const legendKey = columnLabels[1];
    const metricKeys = columnLabels.slice(2);
    if (metricKeys.length === 0) return null;

    const pivot = new Map<string, Record<string, unknown>>();
    const seriesKeys: string[] = [];

    tableData.forEach((item) => {
      const axisValue = String(item[axisKey] ?? '');
      const legendValue = String(item[legendKey] ?? '');
      const row = pivot.get(axisValue) ?? { [axisKey]: axisValue };

      metricKeys.forEach((metricKey) => {
        const seriesKey = metricKeys.length === 1 ? legendValue : `${legendValue} · ${metricKey}`;
        if (!seriesKeys.includes(seriesKey)) seriesKeys.push(seriesKey);
        const rawValue = item[metricKey];
        const numericValue =
          typeof rawValue === 'number'
            ? rawValue
            : typeof rawValue === 'string' && rawValue.trim() !== '' && !Number.isNaN(Number(rawValue))
              ? Number(rawValue)
              : 0;
        row[seriesKey] = numericValue;
      });

      pivot.set(axisValue, row);
    });

    return {
      axisKey,
      seriesKeys,
      data: Array.from(pivot.values()),
    };
  }, [chartType, columnLabels, tableData]);

  const multiSeriesSummary = useMemo(() => {
    if (!multiSeriesChartData) return null;
    const totals = multiSeriesChartData.seriesKeys
      .map((seriesKey) => ({
        key: seriesKey,
        total: multiSeriesChartData.data.reduce((sum, row) => {
          const rawValue = row[seriesKey];
          const numericValue =
            typeof rawValue === 'number'
              ? rawValue
              : typeof rawValue === 'string' && rawValue.trim() !== '' && !Number.isNaN(Number(rawValue))
                ? Number(rawValue)
                : 0;
          return sum + numericValue;
        }, 0),
      }))
      .sort((a, b) => b.total - a.total);

    const effectiveLimit =
      seriesVisibilityMode === 'all'
        ? totals.length
        : Math.max(1, Math.min(maxVisibleSeries, totals.length));
    const canExpand = seriesVisibilityMode === 'auto' && totals.length > effectiveLimit;
    const baseVisibleSeries =
      seriesVisibilityMode === 'all' || showAllSeries || !canExpand
        ? (seriesVisibilityMode === 'limited' ? totals.slice(0, effectiveLimit) : totals)
        : totals.slice(0, effectiveLimit);
    const hiddenSeries = totals.filter((item) => !baseVisibleSeries.some((visible) => visible.key === item.key));
    const visibleSeries = seriesOverflowMode === 'others' && hiddenSeries.length > 0 && seriesVisibilityMode !== 'all'
      ? [...baseVisibleSeries, { key: '__others__', total: hiddenSeries.reduce((sum, item) => sum + item.total, 0) }]
      : baseVisibleSeries;
    return {
      totals,
      visibleSeriesKeys: visibleSeries.map((item) => item.key),
      topSeries: baseVisibleSeries.slice(0, 5),
      canExpand,
      hiddenCount: hiddenSeries.length,
      hiddenSeries,
    };
  }, [maxVisibleSeries, multiSeriesChartData, seriesOverflowMode, seriesVisibilityMode, showAllSeries]);

  const displayChartData = useMemo(() => {
    if (!multiSeriesChartData || !multiSeriesSummary) return multiSeriesChartData?.data ?? null;
    if (!(seriesOverflowMode === 'others' && multiSeriesSummary.hiddenSeries.length > 0 && seriesVisibilityMode !== 'all')) {
      return multiSeriesChartData.data;
    }
    return multiSeriesChartData.data.map((row) => {
      const othersValue = multiSeriesSummary.hiddenSeries.reduce((sum, item) => {
        const rawValue = row[item.key];
        const numericValue =
          typeof rawValue === 'number'
            ? rawValue
            : typeof rawValue === 'string' && rawValue.trim() !== '' && !Number.isNaN(Number(rawValue))
              ? Number(rawValue)
              : 0;
        return sum + numericValue;
      }, 0);
      return {
        ...row,
        __others__: othersValue,
      };
    });
  }, [multiSeriesChartData, multiSeriesSummary, seriesOverflowMode, seriesVisibilityMode]);

  const [labelKey, valueKeys] = useMemo(() => {
    if (columnLabels.length === 0) return [undefined, [] as string[]];
    if (chartType === 'pie' || chartType === 'donut') {
      const valueCol =
        columnLabels.find((_, i) => {
          const sample = normalizedRows[0]?.[i];
          return typeof sample === 'number' || (typeof sample === 'string' && !Number.isNaN(Number(sample)));
        }) ?? columnLabels[0];
      const labelCol = columnLabels.find((c) => c !== valueCol) ?? columnLabels[0];
      return [labelCol, [valueCol]];
    }
    const labelCol = columnLabels[0];
    const valueCols = columnLabels.slice(1);
    return [labelCol, valueCols];
  }, [columnLabels, normalizedRows, chartType]);

  const matrixData = useMemo(() => {
    if (chartType !== 'matrix' || columnLabels.length < 3) return null;

    const rowKey = columnLabels[0];
    const legendKey = columnLabels[1];
    const metricKeys = columnLabels.slice(2);
    const rowLabels: string[] = [];
    const columnHeaders: string[] = [];
    const grid = new Map<string, Record<string, number | string>>();

    tableData.forEach((item) => {
      const rowLabel = String(item[rowKey] ?? '');
      const legendLabel = String(item[legendKey] ?? '');
      if (!rowLabels.includes(rowLabel)) rowLabels.push(rowLabel);

      metricKeys.forEach((metricKey) => {
        const header = metricKeys.length > 1 ? `${legendLabel} · ${metricKey}` : legendLabel;
        if (!columnHeaders.includes(header)) columnHeaders.push(header);
        const currentRow = grid.get(rowLabel) ?? {};
        currentRow[header] = (item[metricKey] as number | string | undefined) ?? '';
        grid.set(rowLabel, currentRow);
      });
    });

    return { rowKey, rowLabels, columnHeaders, grid };
  }, [chartType, columnLabels, tableData]);

  const renderSeriesTooltip = (tooltipProps: {
    active?: boolean;
    payload?: ReadonlyArray<{ color?: string; dataKey?: string; value?: unknown }>;
    label?: unknown;
  }): ReactElement | null => {
    if (!tooltipProps.active || !tooltipProps.payload?.length) return null;

    const items = [...tooltipProps.payload]
      .map((item) => ({
        key: String(item.dataKey ?? ''),
        label:
          String(item.dataKey ?? '') === '__others__'
            ? t('common.reportBuilder.seriesOthersTooltip')
            : String(item.dataKey ?? ''),
        value:
          typeof item.value === 'number'
            ? item.value
            : typeof item.value === 'string' && item.value.trim() !== '' && !Number.isNaN(Number(item.value))
              ? Number(item.value)
              : 0,
        color: item.color,
      }))
      .sort((a, b) => b.value - a.value);

    return (
      <div className="w-[min(560px,calc(100vw-3rem))] rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur-sm">
        <div className="mb-2 border-b pb-2 text-sm font-semibold text-foreground">
          {formatAxisTooltipLabel(tooltipProps.label)}
        </div>
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="break-words text-foreground" title={item.label}>{item.label}</span>
              </div>
              <span className="shrink-0 text-right font-semibold tabular-nums text-foreground">
                {formatMetricValue(item.value, valueFormat, decimalPlaces)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (columnLabels.length === 0 || normalizedRows.length === 0) {
    return (
      <div className={cn('flex h-48 items-center justify-center text-muted-foreground text-sm', className)}>
        {t('common.noData')}
      </div>
    );
  }

  if (chartType === 'table') {
    const tableText = tableDensity === 'compact' ? 'text-[11px]' : 'text-xs';
    return (
      <div className={cn('flex h-full min-h-0 w-full flex-col', className)}>
        <div
          className="h-full min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] shadow-inner"
          style={{ scrollbarGutter: 'stable' }}
        >
          <table className={cn('w-max min-w-full border-collapse text-left', tableText)}>
            <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-950/95">
              <tr>
                {orderedColumnLabels.map((col, i) => (
                  <th
                    key={col || i}
                    scope="col"
                    className={cn(
                      'whitespace-nowrap px-3 text-left align-middle font-black uppercase tracking-widest text-[10px] text-slate-600 dark:text-slate-400',
                      tableDensity === 'compact' ? 'py-3' : 'py-3.5',
                      getColumnWidthClass(orderedColumnSettings[i]?.width),
                      getColumnAlignClass(orderedColumnSettings[i]?.align, col),
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderedRows.slice(0, 5000).map((row, ri) => (
                <tr
                  key={ri}
                  className={cn(
                    'border-b border-slate-100 dark:border-white/5',
                    ri % 2 === 1 ? 'bg-slate-50/40 dark:bg-white/[0.02]' : '',
                  )}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={cn(
                        'whitespace-nowrap px-3 align-top font-medium text-slate-700 dark:text-slate-300',
                        tableDensity === 'compact' ? 'py-2.5' : 'py-3',
                        getColumnWidthClass(orderedColumnSettings[ci]?.width),
                        getColumnAlignClass(orderedColumnSettings[ci]?.align, orderedColumnLabels[ci]),
                      )}
                    >
                      {renderCellValueWithSetting(cell, appearance, orderedColumnSettings[ci])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (chartType === 'matrix' && matrixData) {
    return (
      <div className={cn('flex h-full min-h-0 w-full flex-col', className)}>
        <div
          className="h-full min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] shadow-inner"
          style={{ scrollbarGutter: 'stable' }}
        >
          <table className="w-max min-w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 border-b border-slate-200 bg-indigo-50/95 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-indigo-950/90">
              <tr>
                <th
                  scope="col"
                  className="min-w-[112px] whitespace-nowrap px-3 py-3.5 text-left align-middle font-black uppercase tracking-widest text-[10px] text-slate-600 dark:text-slate-400"
                >
                  {matrixData.rowKey}
                </th>
                {matrixData.columnHeaders.map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="min-w-[112px] whitespace-nowrap px-3 py-3.5 text-left align-middle font-black uppercase tracking-widest text-[10px] text-slate-600 dark:text-slate-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixData.rowLabels.map((rowLabel, ri) => {
                const cells = matrixData.grid.get(rowLabel) ?? {};
                return (
                  <tr
                    key={rowLabel}
                    className={cn(
                      'border-b border-slate-100 dark:border-white/5',
                      ri % 2 === 1 ? 'bg-slate-50/40 dark:bg-white/[0.02]' : '',
                    )}
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap bg-slate-50/80 px-3 py-3.5 text-left align-top font-bold text-slate-900 dark:bg-white/5 dark:text-white"
                    >
                      {rowLabel}
                    </th>
                    {matrixData.columnHeaders.map((header) => (
                      <td key={`${rowLabel}-${header}`} className="whitespace-nowrap px-3 py-3.5 align-top text-slate-600 dark:text-slate-400">
                        {renderCellValue(cells[header] ?? '', appearance)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!Recharts) {
    return (
      <div className={cn('flex h-48 items-center justify-center text-muted-foreground text-sm', className)}>
        {t('common.reportBuilder.loadingChart')}
      </div>
    );
  }

  if (chartType === 'kpi') {
    const numericCells = normalizedRows.flat().filter((value) => typeof value === 'number' || (typeof value === 'string' && !Number.isNaN(Number(value))));
    const primaryValue = numericCells.length > 0 ? Number(numericCells[0]) : 0;
    const secondaryValue = numericCells.length > 1 ? Number(numericCells[1]) : null;
    const isPositive = secondaryValue != null ? primaryValue >= secondaryValue : true;
    const secondaryDiff = secondaryValue != null && secondaryValue !== 0
      ? (((primaryValue - secondaryValue) / Math.abs(secondaryValue)) * 100).toFixed(1)
      : null;

    const primaryCardGradient =
      themePreset === 'performance'
        ? 'from-emerald-500/10 to-transparent'
        : themePreset === 'operations'
          ? 'from-amber-500/10 to-transparent'
          : 'from-indigo-500/10 to-transparent';

    const deltaClassName =
      themePreset === 'performance'
        ? 'text-emerald-600'
        : themePreset === 'operations'
          ? 'from-amber-500/10 to-transparent'
          : 'from-indigo-500/10 to-transparent';

    const valueColor =
      themePreset === 'performance' ? 'text-emerald-600 dark:text-emerald-400' :
        themePreset === 'operations' ? 'text-amber-600 dark:text-amber-400' :
          'text-slate-900 dark:text-white';

    const deltaBg = isPositive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20';

    if (kpiLayout === 'spotlight') {
      return (
        <div className={cn('flex h-full min-h-[220px] items-center justify-center p-2', className)}>
          <div className={cn('w-full rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] bg-linear-to-br p-10 text-center shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group', primaryCardGradient)}>
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 to-pink-500 opacity-60" />
            <div className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-[0.3em] mb-4">{columnLabels.find(Boolean) ?? t('common.reportBuilder.value')}</div>
            <div className={cn('text-6xl font-black tracking-tighter mb-4 tabular-nums', valueColor)}>
              {formatKpiValue(primaryValue, kpiFormat)}
            </div>
            {secondaryDiff != null && (
              <div className={cn('inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-transform group-hover:scale-105', deltaBg)}>
                {isPositive ? <TrendingUp className="size-3.5" /> : <TrendingUp className="size-3.5 rotate-180" />}
                {secondaryDiff}% {isPositive ? t('common.increase') || 'ARTIŞ' : t('common.decrease') || 'AZALIŞ'}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (kpiLayout === 'compact') {
      return (
        <div className={cn('grid h-full min-h-[200px] gap-4', className)}>
          <div className={cn('rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] bg-linear-to-br p-6 shadow-sm relative overflow-hidden', primaryCardGradient)}>
            <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-indigo-500 to-pink-500 opacity-60" />
            <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">{t('common.reportBuilder.primaryKpi')}</div>
            <div className={cn('text-4xl font-black tracking-tight tabular-nums', valueColor)}>{formatKpiValue(primaryValue, kpiFormat)}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] p-5 shadow-inner">
              <div className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">{t('common.reportBuilder.comparison')}</div>
              <div className="text-xl font-black text-slate-700 dark:text-slate-300 tabular-nums">
                {secondaryValue != null ? formatKpiValue(secondaryValue, kpiFormat) : t('common.reportBuilder.emptyDash')}
              </div>
            </div>
            <div className={cn('rounded-2xl border p-5 flex flex-col justify-center', deltaBg)}>
              <div className="opacity-70 text-[9px] font-black uppercase tracking-widest mb-1">{t('common.reportBuilder.delta')}</div>
              <div className="text-xl font-black tabular-nums">
                {secondaryDiff != null ? `${isPositive ? '+' : ''}${secondaryDiff}%` : t('common.reportBuilder.emptyDash')}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={cn('grid h-full min-h-[220px] gap-6 md:grid-cols-2', className)}>
        <div className={cn('rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] bg-linear-to-br p-8 shadow-sm relative overflow-hidden group', primaryCardGradient)}>
          <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">{t('common.reportBuilder.primaryKpi')}</div>
          <div className={cn('text-5xl font-black tracking-tighter tabular-nums mb-2', valueColor)}>{formatKpiValue(primaryValue, kpiFormat)}</div>
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold">{columnLabels.find(Boolean) ?? t('common.reportBuilder.value')}</div>
        </div>

        <div className="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] p-6 shadow-inner">
          <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{t('common.reportBuilder.comparison')}</div>
          <div className="tmt-4 text-2xl font-semibold">
            {secondaryValue != null ? formatKpiValue(secondaryValue, kpiFormat) : t('common.reportBuilder.emptyDash')}
          </div>
          <div className={cn('mt-2 text-sm font-medium', deltaClassName)}>
            {secondaryDiff != null ? t('common.reportBuilder.deltaSuffix', { value: secondaryDiff }) : t('common.reportBuilder.noComparisonValue')}
          </div>
        </div>
      </div>
    );
  }

  if ((chartType === 'pie' || chartType === 'donut') && labelKey && valueKeys.length > 0) {
    const data = tableData.map((r) => ({
      name: String(r[labelKey] ?? ''),
      value: Number(r[valueKeys[0]]) || 0,
    }));
    return (
      <div className={cn('h-full w-full', className)}>
        <Recharts.ResponsiveContainer width="100%" height="100%">
          <Recharts.PieChart>
            <Recharts.Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              innerRadius={chartType === 'donut' ? '40%' : 0}
              label
            >
              {data.map((_, i) => (
                <Recharts.Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Recharts.Pie>
            <Recharts.Tooltip formatter={(value: unknown) => {
              if (typeof value === 'number') return formatMetricValue(value, valueFormat, decimalPlaces);
              if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return formatMetricValue(Number(value), valueFormat, decimalPlaces);
              return String(value ?? '');
            }} />
            <Recharts.Legend />
          </Recharts.PieChart>
        </Recharts.ResponsiveContainer>
      </div>
    );
  }

  if ((chartType === 'bar' || chartType === 'stackedBar' || chartType === 'line') && labelKey) {
    const ChartComponent =
      chartType === 'line'
        ? Recharts.LineChart
        : Recharts.BarChart;
    const chartData = displayChartData ?? tableData;
    const chartLabelKey = multiSeriesChartData?.axisKey ?? labelKey;
    const chartValueKeys = multiSeriesSummary?.visibleSeriesKeys ?? multiSeriesChartData?.seriesKeys ?? valueKeys;
    return (
      <div className={cn('flex h-full min-h-0 w-full flex-col', className)}>
        {multiSeriesSummary && multiSeriesSummary.totals.length > 1 ? (
          <div className="mb-3 shrink-0 space-y-2 rounded-xl border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-medium text-muted-foreground">
                {t('common.reportBuilder.seriesSummary', { count: multiSeriesSummary.totals.length })}
              </div>
              {multiSeriesSummary.canExpand && multiSeriesSummary.hiddenCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setShowAllSeries((current) => !current)}
                >
                  {showAllSeries
                    ? t('common.reportBuilder.showLessSeries')
                    : t('common.reportBuilder.showMoreSeries', { count: multiSeriesSummary.hiddenCount })}
                </Button>
              ) : null}
            </div>
            <div className="text-[11px] font-medium text-foreground">
              {t('common.reportBuilder.visibleSeriesTitle')}
            </div>
            <div className="flex flex-wrap gap-2">
              {multiSeriesSummary.topSeries.map((item, index) => (
                <div key={item.key} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px]">
                  <span className="inline-block size-2 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
                  <span className="font-medium">{item.key}</span>
                  <span className="text-muted-foreground">{formatMetricValue(item.total, valueFormat, decimalPlaces)}</span>
                </div>
              ))}
              {seriesOverflowMode === 'others' && multiSeriesSummary.hiddenCount > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px]">
                  <span className="inline-block size-2 rounded-full" style={{ backgroundColor: palette[multiSeriesSummary.topSeries.length % palette.length] }} />
                  <span className="font-medium">{t('common.reportBuilder.seriesOthersLabel', { count: multiSeriesSummary.hiddenCount })}</span>
                  <span className="text-muted-foreground">
                    {formatMetricValue(multiSeriesSummary.hiddenSeries.reduce((sum, item) => sum + item.total, 0), valueFormat, decimalPlaces)}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {showAllSeries || !multiSeriesSummary.canExpand
                ? t('common.reportBuilder.allSeriesVisible')
                : t('common.reportBuilder.topSeriesVisibleHint')}
            </div>
          </div>
        ) : null}
        <div className="min-h-0 w-full flex-1">
          <Recharts.ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={chartData}>
              <Recharts.CartesianGrid strokeDasharray="3 3" />
              <Recharts.XAxis dataKey={chartLabelKey} />
              <Recharts.YAxis />
              <Recharts.Tooltip content={renderSeriesTooltip} />
              {!multiSeriesSummary && <Recharts.Legend />}
              {chartValueKeys.map((key, i) =>
                chartType === 'bar' || chartType === 'stackedBar' ? (
                  <Recharts.Bar
                    key={key}
                    dataKey={key}
                    fill={palette[i % palette.length]}
                    stackId={chartType === 'stackedBar' ? 'stack' : undefined}
                  />
                ) : (
                  <Recharts.Line key={key} type="monotone" dataKey={key} stroke={palette[i % palette.length]} />
                )
              )}
            </ChartComponent>
          </Recharts.ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-48 items-center justify-center text-muted-foreground text-sm', className)}>
      {t('common.noData')}
    </div>
  );
}
