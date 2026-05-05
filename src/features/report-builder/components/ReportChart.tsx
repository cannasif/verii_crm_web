import type { CSSProperties, PointerEvent, ReactElement, RefObject } from 'react';
import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  presentationVariant?: 'default' | 'dashboard';
  onTableColumnWidthPxCommit?: (columnKey: string, widthPx: number) => void;
}

const TABLE_CELL_RAIL = 'border-r border-slate-200 dark:border-white/15';

function getPresetFallbackWidthPx(width?: ReportWidgetTableColumnSetting['width']): number {
  if (width === 'sm') return 140;
  if (width === 'md') return 220;
  if (width === 'lg') return 320;
  return 112;
}

function clampTableColWidth(px: number): number {
  return Math.round(Math.min(2000, Math.max(48, px)));
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

function TablePanScrollContainer({
  children,
  className,
  title,
  measureRef,
  contentVersion,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  measureRef?: RefObject<HTMLDivElement | null>;
  contentVersion: string;
}): ReactElement {
  const { t } = useTranslation('common');
  const scrollHintId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
  const [grabbing, setGrabbing] = useState(false);
  const [hasScrollOverflow, setHasScrollOverflow] = useState(false);

  const refreshScrollOverflow = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    const x = el.scrollWidth > el.clientWidth + 1;
    const y = el.scrollHeight > el.clientHeight + 1;
    setHasScrollOverflow(x || y);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    refreshScrollOverflow();
    const ro = new ResizeObserver(() => {
      refreshScrollOverflow();
    });
    ro.observe(el);
    const inner = el.firstElementChild;
    if (inner instanceof Element) {
      ro.observe(inner);
    }
    el.addEventListener('scroll', refreshScrollOverflow, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', refreshScrollOverflow);
    };
  }, [refreshScrollOverflow, contentVersion]);

  const endDrag = (e: PointerEvent<HTMLDivElement>): void => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    setGrabbing(false);
    scrollRef.current?.releasePointerCapture(e.pointerId);
  };

  const setScrollNode = (node: HTMLDivElement | null): void => {
    scrollRef.current = node;
    if (measureRef) {
      measureRef.current = node;
    }
  };

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-1', className)}>
      <div
        ref={setScrollNode}
        title={title}
        aria-describedby={hasScrollOverflow ? scrollHintId : undefined}
        style={{ scrollbarGutter: 'stable' }}
        className={cn(
          'custom-scrollbar min-h-0 min-w-0 flex-1 cursor-grab overflow-auto rounded-xl border border-slate-200 bg-white/50 shadow-inner active:cursor-grabbing dark:border-white/10 dark:bg-white/[0.02]',
          grabbing ? 'select-none' : '',
        )}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const el = scrollRef.current;
          if (!el) return;
          el.setPointerCapture(e.pointerId);
          dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startScrollLeft: el.scrollLeft };
          setGrabbing(true);
        }}
        onPointerMove={(e) => {
          const el = scrollRef.current;
          const d = dragRef.current;
          if (!el || !d || e.pointerId !== d.pointerId) return;
          el.scrollLeft = d.startScrollLeft - (e.clientX - d.startX);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {children}
      </div>
      {hasScrollOverflow ? (
        <p
          id={scrollHintId}
          aria-live="polite"
          className="shrink-0 px-2 text-center text-[10px] leading-snug text-muted-foreground"
        >
          {t('common.reportBuilder.tableScrollMoreHint')}
        </p>
      ) : null}
    </div>
  );
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

export function ReportChart({
  columns,
  rows,
  chartType,
  className,
  appearance,
  labelOverrides,
  isExpanded = false,
  presentationVariant = 'default',
  onTableColumnWidthPxCommit,
}: ReportChartProps): ReactElement {
  const { t } = useTranslation('common');
  const [showAllSeries, setShowAllSeries] = useState(false);
  const [tableResizePreview, setTableResizePreview] = useState<{ key: string; widthPx: number } | null>(null);
  const [tableSessionWidths, setTableSessionWidths] = useState<Record<string, number>>({});
  const tableSessionWidthsRef = useRef<Record<string, number>>({});
  tableSessionWidthsRef.current = tableSessionWidths;
  const tableResizeSessionRef = useRef<{ pointerId: number; key: string; startX: number; startW: number } | null>(null);
  const tableResizeWidthRef = useRef<number>(112);
  const isDashboardTile = presentationVariant === 'dashboard' && !isExpanded;
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

  const orderedColumnWidthsPx = useMemo(() => {
    return orderedRawColumns.map((columnKey, i) => {
      const setting = orderedColumnSettings[i];
      if (tableResizePreview?.key === columnKey) {
        return clampTableColWidth(tableResizePreview.widthPx);
      }
      const sess = tableSessionWidths[columnKey];
      if (sess != null) {
        return clampTableColWidth(sess);
      }
      if (setting?.widthPx != null && setting.widthPx > 0) {
        return clampTableColWidth(setting.widthPx);
      }
      return getPresetFallbackWidthPx(setting?.width);
    });
  }, [orderedRawColumns, orderedColumnSettings, tableResizePreview, tableSessionWidths]);

  const tableScrollMeasureRef = useRef<HTMLDivElement | null>(null);
  const [tableContainerWidthPx, setTableContainerWidthPx] = useState(0);

  useLayoutEffect(() => {
    if (chartType !== 'table') {
      setTableContainerWidthPx(0);
      return undefined;
    }
    const el = tableScrollMeasureRef.current;
    if (!el) return undefined;
    const measure = (): void => {
      setTableContainerWidthPx(Math.max(0, Math.floor(el.getBoundingClientRect().width)));
    };
    measure();
    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [chartType, orderedRawColumns.length]);

  const tableLayout = useMemo((): {
    tableStyle: CSSProperties;
    tableClassName: string;
    colStyles: CSSProperties[];
    displayWidthsPx: number[];
  } => {
    const n = orderedRawColumns.length;
    if (n === 0) {
      return { tableStyle: { width: 0 }, tableClassName: 'table-fixed border-collapse', colStyles: [], displayWidthsPx: [] };
    }

    const presetWeights = orderedColumnSettings.map((s) => getPresetFallbackWidthPx(s?.width));
    const presetSum = presetWeights.reduce((a, b) => a + b, 0) || 1;

    const hasHardWidth = (i: number): boolean => {
      const key = orderedRawColumns[i];
      const s = orderedColumnSettings[i];
      if (tableResizePreview?.key === key) return true;
      if (tableSessionWidths[key] != null) return true;
      if (s?.widthPx != null && s.widthPx > 0) return true;
      return false;
    };

    const allSoft = orderedRawColumns.every((_, i) => !hasHardWidth(i));
    const cw = tableContainerWidthPx;

    if (allSoft && cw > 0) {
      let runningPct = 0;
      const colStyles: CSSProperties[] = [];
      const displayWidthsPx: number[] = [];
      for (let i = 0; i < n; i++) {
        if (i === n - 1) {
          const lastPct = Math.max(0, 100 - runningPct);
          colStyles.push({ width: `${lastPct}%` });
          displayWidthsPx.push(Math.max(48, Math.round((lastPct / 100) * cw)));
        } else {
          const p = Math.floor(((presetWeights[i] / presetSum) * 100) * 10000) / 10000;
          runningPct += p;
          colStyles.push({ width: `${p}%` });
          displayWidthsPx.push(Math.max(48, Math.round((p / 100) * cw)));
        }
      }
      return {
        tableStyle: { width: '100%' },
        tableClassName: 'table-fixed border-collapse min-w-0',
        colStyles,
        displayWidthsPx,
      };
    }

    const baseWidths = orderedColumnWidthsPx.slice();
    const softIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!hasHardWidth(i)) softIndices.push(i);
    }
    const hardSum = baseWidths.reduce((sum, w, i) => (hasHardWidth(i) ? sum + w : sum), 0);

    if (cw > 0 && softIndices.length > 0) {
      const remaining = cw - hardSum;
      if (remaining > 0) {
        const flexWeight = softIndices.reduce((s, i) => s + presetWeights[i], 0) || 1;
        let used = 0;
        softIndices.forEach((si, j) => {
          if (j === softIndices.length - 1) {
            baseWidths[si] = Math.max(48, remaining - used);
          } else {
            const next = Math.max(48, Math.round((remaining * presetWeights[si]) / flexWeight));
            baseWidths[si] = next;
            used += next;
          }
        });
      }
    }

    const sumBase = baseWidths.reduce((a, b) => a + b, 0);
    const tableW = cw > 0 ? Math.max(sumBase, cw) : sumBase;
    return {
      tableStyle: { width: tableW },
      tableClassName: 'table-fixed border-collapse',
      colStyles: baseWidths.map((w) => ({ width: w })),
      displayWidthsPx: baseWidths.slice(),
    };
  }, [
    orderedRawColumns,
    orderedColumnSettings,
    orderedColumnWidthsPx,
    tableContainerWidthPx,
    tableResizePreview,
    tableSessionWidths,
  ]);

  const handleTableColumnResizePointerDown = (
    e: PointerEvent<HTMLSpanElement>,
    columnKey: string,
    setting?: ReportWidgetTableColumnSetting,
  ): void => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const fromSession = tableSessionWidthsRef.current[columnKey];
    const colIndex = orderedRawColumns.indexOf(columnKey);
    const fromLayout =
      colIndex >= 0 && tableLayout.displayWidthsPx[colIndex] != null
        ? tableLayout.displayWidthsPx[colIndex]
        : null;
    let startW = getPresetFallbackWidthPx(setting?.width);
    if (fromSession != null) {
      startW = clampTableColWidth(fromSession);
    } else if (setting?.widthPx != null && setting.widthPx > 0) {
      startW = clampTableColWidth(setting.widthPx);
    } else if (fromLayout != null && fromLayout > 0) {
      startW = clampTableColWidth(fromLayout);
    }
    tableResizeSessionRef.current = { pointerId: e.pointerId, key: columnKey, startX: e.clientX, startW };
    tableResizeWidthRef.current = startW;
  };

  const handleTableColumnResizePointerMove = (e: PointerEvent<HTMLSpanElement>): void => {
    const s = tableResizeSessionRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const dw = e.clientX - s.startX;
    const nw = clampTableColWidth(s.startW + dw);
    tableResizeWidthRef.current = nw;
    setTableResizePreview({ key: s.key, widthPx: nw });
  };

  const handleTableColumnResizePointerEnd = (e: PointerEvent<HTMLSpanElement>): void => {
    const s = tableResizeSessionRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    tableResizeSessionRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const finalW = tableResizeWidthRef.current;
    setTableResizePreview(null);
    if (onTableColumnWidthPxCommit) {
      onTableColumnWidthPxCommit(s.key, finalW);
    } else {
      setTableSessionWidths((prev) => ({ ...prev, [s.key]: finalW }));
    }
  };

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
        <TablePanScrollContainer
          className="h-full min-h-0"
          title={t('common.reportBuilder.tablePanScrollHint')}
          measureRef={tableScrollMeasureRef}
          contentVersion={`${orderedRawColumns.join('\0')}:${orderedRows.length}:${tableLayout.tableClassName}`}
        >
          <table className={cn(tableLayout.tableClassName, tableText)} style={tableLayout.tableStyle}>
            <colgroup>
              {tableLayout.colStyles.map((colStyle, i) => (
                <col key={`${orderedRawColumns[i]}-${i}`} style={colStyle} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-950/95">
              <tr>
                {orderedColumnLabels.map((col, i) => {
                  const colKey = orderedRawColumns[i];
                  const setting = orderedColumnSettings[i];
                  return (
                    <th
                      key={col || colKey || i}
                      scope="col"
                      className={cn(
                        'relative max-w-0 overflow-hidden px-3 align-middle font-black uppercase tracking-widest text-[10px] text-slate-600 dark:text-slate-400',
                        TABLE_CELL_RAIL,
                        tableDensity === 'compact' ? 'py-3' : 'py-3.5',
                        getColumnAlignClass(setting?.align, col),
                      )}
                    >
                      <span className="block min-w-0 truncate pr-2" title={col}>
                        {col}
                      </span>
                      <span
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={t('common.reportBuilder.tableColumnResizeHandle')}
                        className="pointer-events-auto absolute top-0 right-0 z-40 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-primary/40"
                        onPointerDown={(e) => handleTableColumnResizePointerDown(e, colKey, setting)}
                        onPointerMove={handleTableColumnResizePointerMove}
                        onPointerUp={handleTableColumnResizePointerEnd}
                        onPointerCancel={handleTableColumnResizePointerEnd}
                      />
                    </th>
                  );
                })}
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
                  {row.map((cell, ci) => {
                    const setting = orderedColumnSettings[ci];
                    const shown = renderCellValueWithSetting(cell, appearance, setting);
                    return (
                      <td
                        key={ci}
                        className={cn(
                          'max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-3 align-top font-medium text-slate-700 dark:text-slate-300',
                          TABLE_CELL_RAIL,
                          tableDensity === 'compact' ? 'py-2.5' : 'py-3',
                          getColumnAlignClass(setting?.align, orderedColumnLabels[ci]),
                        )}
                        title={shown}
                      >
                        {shown}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanScrollContainer>
      </div>
    );
  }

  if (chartType === 'matrix' && matrixData) {
    return (
      <div className={cn('flex h-full min-h-0 w-full flex-col', className)}>
        <div
          className="custom-scrollbar h-full min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white/50 shadow-inner dark:border-white/10 dark:bg-white/[0.02]"
          style={{ scrollbarGutter: 'stable' }}
        >
          <table className="w-max min-w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20 border-b border-slate-200 bg-indigo-50/95 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-indigo-950/90">
              <tr>
                <th
                  scope="col"
                  className={cn(
                    'min-w-[112px] whitespace-nowrap px-3 py-3.5 align-middle font-black uppercase tracking-widest text-[10px] text-slate-600 dark:text-slate-400',
                    TABLE_CELL_RAIL,
                    'text-left',
                  )}
                >
                  {matrixData.rowKey}
                </th>
                {matrixData.columnHeaders.map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className={cn(
                      'min-w-[112px] whitespace-nowrap px-3 py-3.5 align-middle font-black uppercase tracking-widest text-[10px] text-slate-600 dark:text-slate-400',
                      TABLE_CELL_RAIL,
                      'text-left',
                    )}
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
                      className={cn(
                        'whitespace-nowrap bg-slate-50/80 px-3 py-3.5 align-top font-bold text-slate-900 dark:bg-white/5 dark:text-white',
                        TABLE_CELL_RAIL,
                        'text-left',
                      )}
                    >
                      {rowLabel}
                    </th>
                    {matrixData.columnHeaders.map((header) => (
                      <td
                        key={`${rowLabel}-${header}`}
                        className={cn(
                          'whitespace-nowrap px-3 py-3.5 align-top text-slate-600 dark:text-slate-400',
                          TABLE_CELL_RAIL,
                        )}
                      >
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
          <div
            className={cn(
              'w-full rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] bg-linear-to-br text-center shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group',
              isDashboardTile ? 'p-5' : 'p-10',
              primaryCardGradient,
            )}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 to-pink-500 opacity-60" />
            <div className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-[0.3em] mb-4">{columnLabels.find(Boolean) ?? t('common.reportBuilder.value')}</div>
            <div
              className={cn(
                'font-black tracking-tighter mb-4 tabular-nums',
                isDashboardTile ? 'text-4xl' : 'text-6xl',
                valueColor,
              )}
            >
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
          <div className={cn('grid gap-4', isDashboardTile ? 'grid-cols-1' : 'grid-cols-2')}>
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
      <div
        className={cn(
          'grid h-full min-h-[220px] gap-6',
          isDashboardTile ? 'grid-cols-1' : 'md:grid-cols-2',
          className,
        )}
      >
        <div
          className={cn(
            'rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] bg-linear-to-br shadow-sm relative overflow-hidden group',
            isDashboardTile ? 'p-4' : 'p-8',
            primaryCardGradient,
          )}
        >
          <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">{t('common.reportBuilder.primaryKpi')}</div>
          <div
            className={cn(
              'font-black tracking-tighter tabular-nums mb-2',
              isDashboardTile ? 'text-3xl' : 'text-5xl',
              valueColor,
            )}
          >
            {formatKpiValue(primaryValue, kpiFormat)}
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold">{columnLabels.find(Boolean) ?? t('common.reportBuilder.value')}</div>
        </div>

        <div
          className={cn(
            'flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] shadow-inner',
            isDashboardTile ? 'p-4' : 'p-6',
          )}
        >
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

  if (!Recharts) {
    return (
      <div className={cn('flex h-48 items-center justify-center text-muted-foreground text-sm', className)}>
        {t('common.reportBuilder.loadingChart')}
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
