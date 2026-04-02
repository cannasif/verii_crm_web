import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ChartType, ReportWidgetAppearance, ReportWidgetTableColumnSetting } from '../types';
import { useRechartsModule } from '@/lib/useRechartsModule';
import { Button } from '@/components/ui/button';

type ColumnItem = string | { name: string; sqlType?: string; dotNetType?: string; isNullable?: boolean };

interface ReportChartProps {
  columns: string[] | ColumnItem[];
  rows: unknown[][];
  chartType: ChartType;
  className?: string;
  appearance?: ReportWidgetAppearance;
  labelOverrides?: Record<string, string>;
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
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);
  }
  if (format === 'percent') {
    return `${value.toLocaleString('tr-TR')}%`;
  }
  return value.toLocaleString('tr-TR');
}

function formatMetricValue(
  value: number,
  format: NonNullable<ReportWidgetAppearance['valueFormat']>,
  decimalPlaces: number
): string {
  if (format === 'currency') {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value);
  }
  if (format === 'percent') {
    return `${new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value)}%`;
  }
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: format === 'default' ? 0 : decimalPlaces,
    maximumFractionDigits: format === 'default' ? 2 : decimalPlaces,
  }).format(value);
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
  if (width === 'sm') return 'w-[140px]';
  if (width === 'md') return 'w-[220px]';
  if (width === 'lg') return 'w-[320px]';
  return '';
}

function getColumnAlignClass(align?: ReportWidgetTableColumnSetting['align']): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

function formatAxisTooltipLabel(value: unknown): string {
  if (typeof value !== 'string') return String(value ?? '');
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime()) && value.includes('T')) {
    return parsed.toLocaleDateString('tr-TR');
  }
  return value;
}

export function ReportChart({ columns, rows, chartType, className, appearance, labelOverrides }: ReportChartProps): ReactElement {
  const { t } = useTranslation('common');
  const [showAllSeries, setShowAllSeries] = useState(false);
  const recharts = useRechartsModule();
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
    return (
      <div className={cn('max-h-[400px] space-y-2', className)}>
        <div
          className="max-h-[360px] overflow-x-auto overflow-y-auto pb-2"
          style={{ scrollbarGutter: 'stable both-edges' }}
        >
          <Table className={cn('w-full table-fixed', tableDensity === 'compact' ? 'text-[11px]' : 'text-xs')}>
            <TableHeader>
              <TableRow>
                {orderedColumnLabels.map((col, i) => (
                  <TableHead
                    key={col || i}
                    className={cn(
                      'whitespace-normal wrap-break-word align-top',
                      tableDensity === 'compact' ? 'py-2' : 'py-3',
                      getColumnWidthClass(orderedColumnSettings[i]?.width),
                      getColumnAlignClass(orderedColumnSettings[i]?.align),
                    )}
                  >
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedRows.slice(0, 5000).map((row, ri) => (
                <TableRow key={ri} className={cn(ri % 2 === 1 && 'bg-muted/30')}>
                  {row.map((cell, ci) => (
                    <TableCell
                      key={ci}
                      className={cn(
                        'whitespace-normal wrap-break-word align-top',
                        tableDensity === 'compact' ? 'py-2' : 'py-3',
                        getColumnWidthClass(orderedColumnSettings[ci]?.width),
                        getColumnAlignClass(orderedColumnSettings[ci]?.align),
                      )}
                    >
                      {renderCellValueWithSetting(cell, appearance, orderedColumnSettings[ci])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (chartType === 'matrix' && matrixData) {
    return (
      <div className={cn('max-h-[400px] space-y-2', className)}>
        <div
          className="max-h-[360px] overflow-x-auto overflow-y-auto pb-2"
          style={{ scrollbarGutter: 'stable both-edges' }}
        >
          <Table className="w-full table-fixed text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-normal wrap-break-word align-top">{matrixData.rowKey}</TableHead>
                {matrixData.columnHeaders.map((header) => (
                  <TableHead key={header} className="whitespace-normal wrap-break-word align-top">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrixData.rowLabels.map((rowLabel) => {
                const cells = matrixData.grid.get(rowLabel) ?? {};
                return (
                  <TableRow key={rowLabel}>
                    <TableCell className="font-medium whitespace-normal wrap-break-word align-top">{rowLabel}</TableCell>
                    {matrixData.columnHeaders.map((header) => (
                      <TableCell key={`${rowLabel}-${header}`} className="whitespace-normal wrap-break-word align-top">
                        {renderCellValue(cells[header] ?? '', appearance)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
    const secondaryDiff = secondaryValue != null && secondaryValue !== 0
      ? (((primaryValue - secondaryValue) / Math.abs(secondaryValue)) * 100).toFixed(1)
      : null;

    const primaryCardClassName =
      themePreset === 'performance'
        ? 'from-emerald-500/15 to-background'
        : themePreset === 'operations'
          ? 'from-amber-500/15 to-background'
          : 'from-primary/10 to-background';
    const deltaClassName =
      themePreset === 'performance'
        ? 'text-emerald-600'
        : themePreset === 'operations'
          ? 'text-amber-600'
          : 'text-primary';

    if (kpiLayout === 'spotlight') {
      return (
        <div className={cn('flex h-full min-h-[220px] items-center justify-center', className)}>
          <div className={cn('w-full rounded-2xl border bg-linear-to-br p-8 text-center', primaryCardClassName)}>
            <div className="text-muted-foreground text-xs uppercase tracking-[0.24em]">{t('common.reportBuilder.primaryKpi')}</div>
            <div className="mt-5 text-5xl font-bold tracking-tight">{formatKpiValue(primaryValue, kpiFormat)}</div>
            <div className="text-muted-foreground mt-2 text-sm">{columnLabels.find(Boolean) ?? t('common.reportBuilder.value')}</div>
            <div className={cn('mt-6 inline-flex rounded-full px-3 py-1 text-sm font-medium', deltaClassName, 'bg-muted')}>
              {secondaryDiff != null ? t('common.reportBuilder.deltaSuffix', { value: secondaryDiff }) : t('common.reportBuilder.noComparisonValue')}
            </div>
          </div>
        </div>
      );
    }

    if (kpiLayout === 'compact') {
      return (
        <div className={cn('grid h-full min-h-[220px] gap-3', className)}>
          <div className={cn('rounded-xl border bg-linear-to-br p-4', primaryCardClassName)}>
            <div className="text-muted-foreground text-[11px] uppercase tracking-[0.18em]">{t('common.reportBuilder.primaryKpi')}</div>
            <div className="mt-3 text-3xl font-bold tracking-tight">{formatKpiValue(primaryValue, kpiFormat)}</div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-4">
              <div className="text-muted-foreground text-[11px] uppercase tracking-[0.18em]">{t('common.reportBuilder.comparison')}</div>
              <div className="mt-2 text-xl font-semibold">
                {secondaryValue != null ? formatKpiValue(secondaryValue, kpiFormat) : t('common.reportBuilder.emptyDash')}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="text-muted-foreground text-[11px] uppercase tracking-[0.18em]">{t('common.reportBuilder.delta')}</div>
              <div className={cn('mt-2 text-xl font-semibold', deltaClassName)}>
                {secondaryDiff != null ? `${secondaryDiff}%` : t('common.reportBuilder.emptyDash')}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={cn('grid h-full min-h-[220px] gap-4 md:grid-cols-2', className)}>
        <div className={cn('rounded-xl border bg-linear-to-br p-6', primaryCardClassName)}>
          <div className="text-muted-foreground text-xs uppercase tracking-[0.2em]">{t('common.reportBuilder.primaryKpi')}</div>
          <div className="mt-4 text-4xl font-bold tracking-tight">{formatKpiValue(primaryValue, kpiFormat)}</div>
          <div className="text-muted-foreground mt-2 text-sm">{columnLabels.find(Boolean) ?? t('common.reportBuilder.value')}</div>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="text-muted-foreground text-xs uppercase tracking-[0.2em]">{t('common.reportBuilder.comparison')}</div>
          <div className="mt-4 text-2xl font-semibold">
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
      <div className={cn('h-[300px] w-full', className)}>
        <Recharts.ResponsiveContainer width="100%" height="100%">
          <Recharts.PieChart>
            <Recharts.Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={chartType === 'donut' ? 45 : 0}
              label
            >
              {data.map((_, i) => (
                <Recharts.Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Recharts.Pie>
            <Recharts.Tooltip />
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
      <div className={cn('space-y-3', className)}>
        {multiSeriesSummary && multiSeriesSummary.totals.length > 1 ? (
          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
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
        <div className="h-[300px] w-full">
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
