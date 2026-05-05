import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CheckCircle2, Eye, EyeOff, ExternalLink, GripHorizontal, LayoutGrid, Plus, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DeferOnView } from '@/components/shared/DeferOnView';
import { reportsApi } from '../api';
import { PreviewPanel } from './PreviewPanel';
import { useReportsList } from '../hooks/useReportsList';
import { useAuthStore } from '@/stores/auth-store';
import type {
  CalculatedField,
  DataSourceParameterBinding,
  MyReportDashboardItem,
  MyReportDashboardLayout,
  ReportConfig,
  ReportDto,
  ReportPreviewResponse,
  ReportWidget,
} from '../types';
import {
  buildOccupancyForItemsAtStoredPositions,
  canAppend1x1Tile,
  canPlaceWidgetAtCell,
  createDashboardItem,
  loadMyDashboardLayout,
  reconcileDashboardLayoutPositions,
  sanitizeMyDashboardLayout,
  saveMyDashboardLayout,
} from '../utils';
import {
  canCanvasHoldAllSpans,
  canFitInGridOccupancy,
  clampGridSpan,
  type GridSpan,
} from '../utils/grid-occupancy';
import { reportBuilderQueryKeys, REPORTS_LIST_STALE_TIME_MS } from '../utils/query-keys';

const DASHBOARD_ROW_HEIGHT_PX = 320;
const DASHBOARD_GRID_GAP_PX = 20;
const DASHBOARD_COL_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
const DASHBOARD_ROW_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
const DASHBOARD_ABS_MAX_ROWS = 6;

const CORPORATE_KPI_TOP_CLASSES = [
  'bg-linear-to-r from-sky-500 to-cyan-400',
  'bg-linear-to-r from-violet-500 to-fuchsia-400',
  'bg-linear-to-r from-pink-500 to-rose-400',
  'bg-linear-to-r from-amber-500 to-yellow-400',
  'bg-linear-to-r from-emerald-500 to-teal-400',
  'bg-linear-to-r from-orange-500 to-amber-400',
] as const;

interface DashboardChoice {
  reportId: number;
  reportName: string;
  reportSubtitle?: string;
  widgetId?: string;
  widgetTitle: string;
  subtitle?: string;
  chartType?: string;
  kind: 'dashboard' | 'widget' | 'report';
}

function getItemKey(item: Pick<MyReportDashboardItem, 'reportId' | 'widgetId'>): string {
  return `${item.reportId}:${item.widgetId ?? '__report__'}`;
}

function dashboardGridMinHeightPx(maxRows: number): number {
  const rows = Math.max(1, maxRows);
  return rows * DASHBOARD_ROW_HEIGHT_PX + Math.max(0, rows - 1) * DASHBOARD_GRID_GAP_PX;
}

function DashboardDropCell({
  row,
  col,
  isDropActive,
}: {
  row: number;
  col: number;
  isDropActive: boolean;
}): ReactElement {
  const id = `cell-${row}-${col}`;
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !isDropActive });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-0 min-w-0 rounded-lg transition-colors',
        isDropActive && 'bg-pink-500/[0.06] ring-1 ring-pink-300/35 dark:ring-pink-500/25',
        isOver && 'bg-pink-500/15 ring-2 ring-pink-400',
      )}
      style={{ gridRow: row + 1, gridColumn: col + 1 }}
    />
  );
}

function parseReportConfig(configJson: string): ReportConfig | null {
  try {
    return JSON.parse(configJson) as ReportConfig;
  } catch {
    return null;
  }
}

function normalizeReportConfig(config: ReportConfig | null): ReportConfig | null {
  if (!config) return null;

  const rawWidgets = Array.isArray(config.widgets) ? config.widgets : [];
  const widgets: ReportWidget[] = rawWidgets.length > 0
    ? rawWidgets.map((widget, index) => ({
      ...widget,
      id: widget.id?.trim() ? widget.id : config.activeWidgetId?.trim() || `fallback-widget-${index + 1}`,
      title: widget.title?.trim() || config.chartType || `Widget ${index + 1}`,
      filters: widget.filters ?? config.filters ?? [],
      values: widget.values ?? config.values ?? [],
      chartType: widget.chartType ?? config.chartType,
    }))
    : [
      {
        id: config.activeWidgetId?.trim() || 'widget-1',
        title: config.chartType || 'Widget 1',
        chartType: config.chartType,
        axis: config.axis,
        values: config.values ?? [],
        legend: config.legend,
        sorting: config.sorting,
        filters: config.filters ?? [],
        appearance: undefined,
        size: 'half',
        height: 'md',
      },
    ];

  const activeWidgetId =
    config.activeWidgetId && widgets.some((widget) => widget.id === config.activeWidgetId)
      ? config.activeWidgetId
      : widgets[0]?.id;

  const activeWidget = widgets.find((widget) => widget.id === activeWidgetId) ?? widgets[0];

  return {
    ...config,
    chartType: activeWidget?.chartType ?? config.chartType,
    axis: activeWidget?.axis ?? config.axis,
    values: activeWidget?.values ?? config.values ?? [],
    legend: activeWidget?.legend ?? config.legend,
    sorting: activeWidget?.sorting ?? config.sorting,
    filters: activeWidget?.filters ?? config.filters ?? [],
    widgets,
    activeWidgetId,
  };
}

function getNormalizedWidgets(config: ReportConfig | null): ReportWidget[] {
  return normalizeReportConfig(config)?.widgets ?? [];
}

function getSelectableChoices(report: ReportDto, t: (key: string) => string): DashboardChoice[] {
  const config = normalizeReportConfig(parseReportConfig(report.configJson));
  const widgets = getNormalizedWidgets(config);
  const reportName = report.name?.trim() || report.dataSourceName || t('common.reportBuilder.dashboardItemTypes.report');
  const reportSubtitle = report.description?.trim() || report.dataSourceName;

  const widgetChoices = widgets.map((widget, index) => ({
    reportId: report.id,
    reportName,
    reportSubtitle,
    widgetId: widget.id,
    widgetTitle: widget.title?.trim() || `${reportName} ${index + 1}`,
    subtitle: widget.appearance?.subtitle?.trim() || reportSubtitle,
    chartType: widget.chartType,
    kind: 'widget' as const,
  }));
  const dashboardChoice: DashboardChoice = {
    reportId: report.id,
    reportName,
    reportSubtitle,
    widgetTitle: t('common.reportBuilder.dashboardItemTypes.dashboard'),
    subtitle: reportSubtitle,
    kind: 'dashboard',
  };
  return [...widgetChoices, dashboardChoice];
}

function getChartTypeLabel(chartType: string | undefined, t: (key: string) => string): string {
  if (!chartType) return t('common.reportBuilder.dashboardItemTypes.widget');
  const translationKey = `common.reportBuilder.chartTypes.${chartType}`;
  const translated = t(translationKey);
  return translated === translationKey ? chartType : translated;
}

interface DashboardTileSizePopoverProps {
  colSpan: number;
  rowSpan: number;
  maxCols: number;
  maxRows: number;
  isSizeAvailable: (cols: number, rows: number) => boolean;
  onChange: (cols: number, rows: number) => void;
}

function DashboardTileSizePopover({
  colSpan,
  rowSpan,
  maxCols,
  maxRows,
  isSizeAvailable,
  onChange,
}: DashboardTileSizePopoverProps): ReactElement {
  const { t } = useTranslation('common');
  const c = clampGridSpan(colSpan, 1, maxCols);
  const r = clampGridSpan(rowSpan, 1, maxRows);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white/90 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
          title={t('common.reportBuilder.resizeBoth') as string}
        >
          <LayoutGrid className="size-3" />
          <span className="text-slate-700 dark:text-white">{c}</span>
          <span className="text-slate-400">×</span>
          <span className="text-slate-700 dark:text-white">{r}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[300px] rounded-2xl border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#120D19]/95"
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {t('common.reportBuilder.resizeWidth')}
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-600 dark:bg-white/5 dark:text-slate-300">
                {c} / {maxCols}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: maxCols }, (_, idx) => idx + 1).map((value) => {
                const isActive = c === value;
                const enabled = isActive || isSizeAvailable(value, r);
                return (
                  <button
                    key={`d-col-${value}`}
                    type="button"
                    onClick={() => enabled && onChange(value, r)}
                    disabled={!enabled}
                    title={enabled ? undefined : (t('common.reportBuilder.resizeUnavailable') as string)}
                    className={cn(
                      'h-9 min-w-0 rounded-lg border text-xs font-black transition-all',
                      isActive
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                        : enabled
                          ? 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                          : 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-300 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-600',
                    )}
                    aria-pressed={isActive}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {t('common.reportBuilder.resizeHeight')}
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-600 dark:bg-white/5 dark:text-slate-300">
                {r} / {maxRows}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: maxRows }, (_, idx) => idx + 1).map((value) => {
                const isActive = r === value;
                const enabled = isActive || isSizeAvailable(c, value);
                return (
                  <button
                    key={`d-row-${value}`}
                    type="button"
                    onClick={() => enabled && onChange(c, value)}
                    disabled={!enabled}
                    title={enabled ? undefined : (t('common.reportBuilder.resizeUnavailable') as string)}
                    className={cn(
                      'h-9 min-w-0 rounded-lg border text-xs font-black transition-all',
                      isActive
                        ? 'border-pink-500 bg-pink-600 text-white shadow-md shadow-pink-500/30'
                        : enabled
                          ? 'border-slate-200 bg-white text-slate-600 hover:border-pink-300 hover:bg-pink-50/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                          : 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-300 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-600',
                    )}
                    aria-pressed={isActive}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-[10px] font-medium text-slate-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
            {t('common.reportBuilder.resizeHint', { cols: c, rows: r })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface SortableDashboardTileProps {
  itemKey: string;
  maxCols: number;
  maxRows: number;
  colSpan: number;
  rowSpan: number;
  gridCol?: number;
  gridRow?: number;
  isEditMode: boolean;
  hideChrome: boolean;
  isSizeAvailable: (cols: number, rows: number) => boolean;
  onSpanChange: (cols: number, rows: number) => void;
  onToggleHideChrome: () => void;
  children: ReactElement;
}

function SortableDashboardTile({
  itemKey,
  maxCols,
  maxRows,
  colSpan,
  rowSpan,
  gridCol,
  gridRow,
  isEditMode,
  hideChrome,
  isSizeAvailable,
  onSpanChange,
  onToggleHideChrome,
  children,
}: SortableDashboardTileProps): ReactElement {
  const { t } = useTranslation('common');
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: itemKey,
    disabled: !isEditMode,
  });
  const c = clampGridSpan(colSpan, 1, maxCols);
  const r = clampGridSpan(rowSpan, 1, maxRows);
  const hasOrigin = gridCol != null && gridRow != null;
  const style: CSSProperties = {
    gridColumn: hasOrigin ? `${gridCol} / span ${c}` : `span ${c}`,
    gridRow: hasOrigin ? `${gridRow} / span ${r}` : `span ${r}`,
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      data-dashboard-tile
      style={style}
      className={cn(
        'group relative z-[1] min-w-0 w-full max-w-full',
        isDragging && 'z-50 shadow-2xl ring-2 ring-pink-400/60',
      )}
    >
      <div className={cn('flex h-full w-full flex-col', isEditMode && 'pt-1')}>
        {isEditMode ? (
          <div className="relative z-30 flex shrink-0 items-center justify-end gap-2 px-1 pb-1">
            <button
              type="button"
              onClick={onToggleHideChrome}
              aria-pressed={hideChrome}
              title={
                (hideChrome
                  ? t('common.reportBuilder.dashboardShowChromeTitle')
                  : t('common.reportBuilder.dashboardHideChromeTitle')) as string
              }
              className={cn(
                'inline-flex h-7 items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold shadow-sm transition-colors',
                hideChrome
                  ? 'border-pink-300 bg-pink-50 text-pink-600 hover:bg-pink-100 dark:border-pink-500/40 dark:bg-pink-500/15 dark:text-pink-300'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-pink-300 hover:bg-pink-50/60 hover:text-pink-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10',
              )}
            >
              {hideChrome ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              <span className="hidden md:inline">
                {hideChrome
                  ? t('common.reportBuilder.dashboardChromeHidden')
                  : t('common.reportBuilder.dashboardChromeVisible')}
              </span>
            </button>
            <DashboardTileSizePopover
              colSpan={colSpan}
              rowSpan={rowSpan}
              maxCols={maxCols}
              maxRows={maxRows}
              isSizeAvailable={isSizeAvailable}
              onChange={onSpanChange}
            />
          </div>
        ) : null}
        <div className="min-h-0 flex-1">{children}</div>
      </div>
      {isEditMode ? (
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={t('common.reportBuilder.dragWidget') as string}
          title={t('common.reportBuilder.dragWidget') as string}
          className="absolute left-1/2 top-0 z-40 flex h-5 w-14 -translate-x-1/2 -translate-y-2.5 cursor-grab items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-400 shadow-md opacity-70 backdrop-blur transition-opacity duration-200 hover:text-pink-600 group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-500"
        >
          <GripHorizontal className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function resolveBindingValue(binding: DataSourceParameterBinding, user: { id: number; email: string } | null): string {
  switch (binding.source) {
    case 'currentUserId':
      return user?.id != null ? String(user.id) : '';
    case 'currentUserEmail':
      return user?.email ?? '';
    case 'today': {
      const date = new Date();
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    case 'now':
      return new Date().toISOString();
    case 'literal':
    default:
      return binding.value ?? '';
  }
}

function buildWidgetLabelOverrides(widget?: {
  axis?: { field: string; label?: string };
  legend?: { field: string; label?: string };
  values?: Array<{ field: string; label?: string }>;
}): Record<string, string> {
  const overrides: Record<string, string> = {};
  if (widget?.axis?.field && widget.axis.label?.trim()) overrides[widget.axis.field] = widget.axis.label.trim();
  if (widget?.legend?.field && widget.legend.label?.trim()) overrides[widget.legend.field] = widget.legend.label.trim();
  widget?.values?.forEach((value) => {
    if (value.field && value.label?.trim()) overrides[value.field] = value.label.trim();
  });
  return overrides;
}

function buildPreviewPayload(
  report: ReportDto,
  selectedWidget: ReportWidget | undefined,
  config: ReportConfig | null,
  user: { id: number; email: string } | null,
): { chartType: ReportWidget['chartType']; title: string; subtitle?: string; appearance?: ReportWidget['appearance']; labelOverrides: Record<string, string>; payload: Parameters<typeof reportsApi.preview>[0] } | null {
  if (!config) return null;

  const datasetParameters = (config.datasetParameters ?? []).map((binding) => ({
    ...binding,
    source: 'literal' as const,
    value: resolveBindingValue(binding, user),
  }));

  const selectedChartType = selectedWidget?.chartType ?? config.chartType;
  const selectedTitle = selectedWidget?.title?.trim() || report.name;
  const selectedSubtitle = selectedWidget?.appearance?.subtitle?.trim() || report.description || report.dataSourceName;
  const labelOverrides = buildWidgetLabelOverrides(selectedWidget ?? {
    axis: config.axis,
    legend: config.legend,
    values: config.values,
  });

  const configJson = selectedWidget
    ? JSON.stringify({
      chartType: selectedWidget.chartType,
      axis: selectedWidget.axis,
      values: selectedWidget.values,
      legend: selectedWidget.legend,
      sorting: selectedWidget.sorting,
      filters: [...(config.filters ?? []), ...(selectedWidget.filters ?? [])],
      datasetParameters,
      calculatedFields: config.calculatedFields as CalculatedField[] | undefined,
      lifecycle: config.lifecycle,
      widgets: config.widgets,
      activeWidgetId: selectedWidget.id,
      governance: config.governance,
      history: config.history,
    })
    : JSON.stringify({
      ...config,
      datasetParameters,
    });

  return {
    chartType: selectedChartType,
    title: selectedTitle,
    subtitle: selectedSubtitle,
    appearance: selectedWidget?.appearance,
    labelOverrides,
    payload: {
      connectionKey: report.connectionKey,
      dataSourceType: report.dataSourceType,
      dataSourceName: report.dataSourceName,
      configJson,
    },
  };
}

function CompactWidgetPreview({
  report,
  widget,
  title,
  minHeightClassName,
  headerActions,
  presentationVariant = 'default',
  corporateAccentIndex,
  hideChrome = false,
}: {
  report: ReportDto;
  widget?: ReportWidget;
  title: string;
  minHeightClassName?: string;
  headerActions?: ReactElement;
  presentationVariant?: 'default' | 'dashboard';
  corporateAccentIndex?: number;
  hideChrome?: boolean;
}): ReactElement {
  const { t } = useTranslation('common');
  const currentUser = useAuthStore((state) => state.user);
  const [preview, setPreview] = useState<ReportPreviewResponse>({ columns: [], rows: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => normalizeReportConfig(parseReportConfig(report.configJson)), [report.configJson]);
  const previewConfig = useMemo(
    () => buildPreviewPayload(report, widget, config, currentUser),
    [config, currentUser, report, widget],
  );

  useEffect(() => {
    let cancelled = false;
    if (!previewConfig) {
      setLoading(false);
      setError(t('common.reportBuilder.previewConfigInvalid'));
      return;
    }

    const run = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const result = await reportsApi.preview(previewConfig.payload);
        if (!cancelled) {
          setPreview(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('common.reportBuilder.messages.previewFailed'));
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [previewConfig, t]);

  if (!previewConfig) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/15 p-4 text-center text-sm text-muted-foreground">
        {t('common.reportBuilder.previewConfigInvalid')}
      </div>
    );
  }

  const panel = (
    <PreviewPanel
      columns={preview.columns}
      rows={preview.rows}
      chartType={previewConfig.chartType}
      loading={loading}
      error={error}
      empty={!loading && !error && preview.rows.length === 0}
      title={title}
      subtitle={previewConfig.subtitle}
      appearance={previewConfig.appearance}
      labelOverrides={previewConfig.labelOverrides}
      headerActions={hideChrome ? undefined : headerActions}
      className={cn(
        'h-full w-full !min-h-0',
        corporateAccentIndex != null && 'rounded-none border-0 !bg-transparent !p-4 !shadow-none dark:!bg-transparent',
        hideChrome && corporateAccentIndex != null && '!p-2',
      )}
      minHeightClassName={minHeightClassName}
      presentationVariant={corporateAccentIndex != null ? 'dashboard' : presentationVariant}
      chartPresentationVariant="dashboard"
      suppressTopAccent={corporateAccentIndex != null || hideChrome}
      hideHeader={hideChrome}
    />
  );

  if (corporateAccentIndex == null) {
    return panel;
  }

  const accent = CORPORATE_KPI_TOP_CLASSES[corporateAccentIndex % CORPORATE_KPI_TOP_CLASSES.length];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/[0.07] dark:border-white/10 dark:bg-slate-950 dark:shadow-black/40">
      {hideChrome ? null : <div className={cn('h-1.5 w-full shrink-0 rounded-t-[13px]', accent)} />}
      <div className={cn('min-h-0 flex-1 overflow-hidden bg-white dark:bg-slate-950', hideChrome ? 'rounded-2xl' : 'rounded-b-2xl')}>
        {panel}
      </div>
    </div>
  );
}

function DashboardWidgetPreviewContent({
  item,
  report,
  mode,
  corporateTileIndex,
  onRemove,
}: {
  item: MyReportDashboardItem;
  report: ReportDto;
  mode: 'editor' | 'corporate';
  corporateTileIndex: number;
  onRemove: () => void;
}): ReactElement {
  const hideChrome = Boolean(item.hideChrome);
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const detailQuery = useQuery({
    queryKey: [...reportBuilderQueryKeys.list('detail'), report.id],
    queryFn: () => reportsApi.get(report.id),
    placeholderData: report,
    staleTime: REPORTS_LIST_STALE_TIME_MS,
  });
  const fullReport = detailQuery.data ?? report;
  const config = useMemo(() => normalizeReportConfig(parseReportConfig(fullReport.configJson)), [fullReport.configJson]);
  const widgets = useMemo(() => getNormalizedWidgets(config), [config]);
  const selectedWidget = widgets.find((widget) => widget.id === item.widgetId) ?? widgets[0];
  const isDashboardView = !item.widgetId && widgets.length > 0;

  if (detailQuery.isLoading && !detailQuery.data) {
    return <Skeleton className="h-full min-h-[220px] w-full rounded-2xl" />;
  }

  const isEditor = mode === 'editor';
  const presentationVariant = isEditor ? 'default' : 'dashboard';

  if (isDashboardView) {
    const previewWidgets = widgets.slice(0, 4);
    return (
      <div
        className={cn(
          'flex h-full flex-col rounded-2xl',
          hideChrome ? 'p-2' : 'p-4',
          isEditor
            ? 'border border-border/70 bg-background/95 shadow-sm'
            : 'border border-slate-200/90 bg-white shadow-md shadow-slate-900/[0.06] dark:border-white/10 dark:bg-slate-950 dark:shadow-black/35',
        )}
      >
        {hideChrome ? null : (
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={cn('truncate text-base font-semibold', !isEditor && 'text-slate-900 dark:text-white')}>{report.name}</p>
              {isEditor ? (
                <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.dashboardItemTypes.dashboard')}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {isEditor ? <Badge variant="outline">{previewWidgets.length} / {widgets.length}</Badge> : null}
              <Button size="icon-sm" variant="secondary" onClick={() => navigate(`/reports/my/${report.id}`)} title={t('common.reportBuilder.openReport')}>
                <ExternalLink className="size-4" />
              </Button>
              {isEditor ? (
                <Button size="icon-sm" variant="destructive" onClick={onRemove} title={t('common.remove')}>
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        )}
        <div className={cn('grid flex-1 gap-3', previewWidgets.length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2')}>
          {previewWidgets.map((widget, index) => (
            <CompactWidgetPreview
              key={widget.id}
              report={fullReport}
              widget={widget}
              title={widget.title?.trim() || t('common.reportBuilder.dashboardItemTypes.widget')}
              minHeightClassName=""
              presentationVariant={presentationVariant}
              corporateAccentIndex={!isEditor ? corporateTileIndex + index : undefined}
              hideChrome={hideChrome}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <CompactWidgetPreview
      report={fullReport}
      widget={selectedWidget}
      title={item.widgetTitle || selectedWidget?.title?.trim() || fullReport.name}
      minHeightClassName=""
      presentationVariant={presentationVariant}
      corporateAccentIndex={!isEditor ? corporateTileIndex : undefined}
      hideChrome={hideChrome}
      headerActions={
        hideChrome ? undefined : (
          <>
            <Button size="icon-sm" variant="secondary" onClick={() => navigate(`/reports/my/${report.id}`)} title={t('common.reportBuilder.openReport')}>
              <ExternalLink className="size-4" />
            </Button>
            {isEditor ? (
              <Button size="icon-sm" variant="destructive" onClick={onRemove} title={t('common.remove')}>
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </>
        )
      }
    />
  );
}

function DashboardReportWidget({
  item,
  report,
  mode,
  corporateTileIndex,
  onRemove,
}: {
  item: MyReportDashboardItem;
  report: ReportDto;
  mode: 'editor' | 'corporate';
  corporateTileIndex: number;
  onRemove: () => void;
}): ReactElement {
  return (
    <div className="h-full">
      <DeferOnView className="h-full w-full" fallback={<Skeleton className="h-full min-h-[220px] w-full rounded-2xl" />}>
        <DashboardWidgetPreviewContent item={item} report={report} mode={mode} corporateTileIndex={corporateTileIndex} onRemove={onRemove} />
      </DeferOnView>
    </div>
  );
}

export interface AssignedReportsDashboardSectionProps {
  mode?: 'view' | 'edit';
  onModeChange?: (mode: 'view' | 'edit') => void;
}

export function AssignedReportsDashboardSection({
  mode: controlledMode,
  onModeChange,
}: AssignedReportsDashboardSectionProps = {}): ReactElement {
  const { t } = useTranslation('common');
  const userId = useAuthStore((state) => state.user?.id);
  const navigate = useNavigate();
  const { data: reports = [], isLoading, error } = useReportsList(undefined, 'assigned');
  const [layout, setLayout] = useState<MyReportDashboardLayout>({
    version: 2,
    maxCols: 3,
    maxRows: 2,
    updatedAt: new Date().toISOString(),
    items: [],
  });
  const [savedLayout, setSavedLayout] = useState<MyReportDashboardLayout>({
    version: 2,
    maxCols: 3,
    maxRows: 2,
    updatedAt: new Date().toISOString(),
    items: [],
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [activeDragKey, setActiveDragKey] = useState<string | null>(null);
  const [internalMode, setInternalMode] = useState<'view' | 'edit'>('view');
  const dashboardTab = controlledMode ?? internalMode;
  const isEditorTab = dashboardTab === 'edit';
  const setDashboardTab = useCallback(
    (next: 'view' | 'edit'): void => {
      if (controlledMode === undefined) setInternalMode(next);
      onModeChange?.(next);
    },
    [controlledMode, onModeChange],
  );

  const reportMap = useMemo(() => new Map(reports.map((report) => [report.id, report])), [reports]);
  const allowedReportIds = useMemo(() => reports.map((report) => report.id), [reports]);
  const reportDetailQueries = useQueries({
    queries: reports.map((report) => ({
      queryKey: [...reportBuilderQueryKeys.list('detail'), report.id],
      queryFn: () => reportsApi.get(report.id),
      placeholderData: report,
      staleTime: REPORTS_LIST_STALE_TIME_MS,
    })),
  });
  const reportsWithDetails = useMemo(
    () => reportDetailQueries.map((query, index) => query.data ?? reports[index]).filter((report): report is ReportDto => Boolean(report)),
    [reportDetailQueries, reports],
  );
  const detailedReportMap = useMemo(() => new Map(reportsWithDetails.map((report) => [report.id, report])), [reportsWithDetails]);

  const prevUserIdRef = useRef<number | undefined>(undefined);
  const prevAllowedCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsHydrated(false);
      prevUserIdRef.current = undefined;
      prevAllowedCountRef.current = null;
      return;
    }

    const allowedCount = allowedReportIds.length;
    const prevCount = prevAllowedCountRef.current;
    const userChanged = prevUserIdRef.current !== userId;
    const becamePopulated = prevCount === 0 && allowedCount > 0;
    const firstSyncForUser = userChanged || prevCount === null;
    const reloadFromDisk = firstSyncForUser || becamePopulated;

    prevUserIdRef.current = userId;
    prevAllowedCountRef.current = allowedCount;

    if (reloadFromDisk) {
      const stored = loadMyDashboardLayout(userId);
      const sanitized = sanitizeMyDashboardLayout(stored, allowedReportIds);
      setLayout(sanitized);
      setSavedLayout(sanitized);
      setSaveState('idle');
      setIsHydrated(true);
      return;
    }

    setLayout((current) => sanitizeMyDashboardLayout(current, allowedReportIds));
    setSavedLayout((saved) => sanitizeMyDashboardLayout(saved, allowedReportIds));
  }, [allowedReportIds, userId]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timer = window.setTimeout(() => setSaveState('idle'), 2200);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  const placedKeys = useMemo(() => new Set(layout.items.map(getItemKey)), [layout.items]);
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(layout) !== JSON.stringify(savedLayout),
    [layout, savedLayout],
  );
  const choices = useMemo(
    () =>
      reportsWithDetails
        .flatMap((report) => getSelectableChoices(report, t))
        .filter((choice) => choice.reportId > 0 && choice.reportName.trim().length > 0)
        .filter((choice) => !placedKeys.has(`${choice.reportId}:${choice.widgetId ?? '__report__'}`)),
    [placedKeys, reportsWithDetails, t],
  );
  const canAddAnyTile = useMemo(() => canAppend1x1Tile(layout), [layout]);

  const handleAddReportsButtonClick = useCallback((): void => {
    if (isLoading || choices.length === 0) return;
    if (!canAddAnyTile) {
      toast.warning(t('common.reportBuilder.dashboardReportAreaFullHint'));
      return;
    }
    setPickerOpen(true);
  }, [canAddAnyTile, choices.length, isLoading, t]);
  const updateItems = (updater: (items: MyReportDashboardItem[]) => MyReportDashboardItem[]): void => {
    setLayout((current) =>
      reconcileDashboardLayoutPositions({
        ...current,
        updatedAt: new Date().toISOString(),
        items: updater([...current.items]).map((item, index) => ({ ...item, order: index })),
      }),
    );
  };

  const handleAddChoice = (choice: DashboardChoice): void => {
    if (!canAppend1x1Tile(layout)) {
      toast.error(t('common.reportBuilder.dashboardCanvasFull'));
      return;
    }
    updateItems((items) => [
      ...items,
      createDashboardItem(choice.reportId, items, {
        widgetId: choice.widgetId,
        widgetTitle: choice.widgetTitle,
      }),
    ]);
    setDashboardTab('edit');
    setPickerOpen(false);
  };

  const handleRemoveItem = (item: MyReportDashboardItem): void => {
    const nextKey = getItemKey(item);
    updateItems((items) => items.filter((current) => getItemKey(current) !== nextKey));
    setDashboardTab('edit');
  };

  const handleReset = (): void => {
    setLayout({ version: 2, maxCols: 3, maxRows: 2, updatedAt: new Date().toISOString(), items: [] });
    setSaveState('idle');
    setDashboardTab('edit');
  };

  const handleSaveLayout = (): void => {
    if (!userId) return;
    const nextLayout: MyReportDashboardLayout = {
      version: 2,
      maxCols: layout.maxCols,
      maxRows: layout.maxRows,
      updatedAt: new Date().toISOString(),
      items: layout.items,
    };
    saveMyDashboardLayout(userId, nextLayout);
    setLayout(nextLayout);
    setSavedLayout(nextLayout);
    setSaveState('saved');
    setDashboardTab('view');
  };

  const sortedLayoutItems = useMemo(
    () => [...layout.items].sort((a, b) => a.order - b.order),
    [layout.items],
  );

  const isWidgetSizeAvailable = useCallback(
    (excludeKey: string, cols: number, rows: number): boolean => {
      const grid = buildOccupancyForItemsAtStoredPositions(layout, excludeKey, getItemKey);
      return canFitInGridOccupancy(
        grid,
        clampGridSpan(cols, 1, layout.maxCols),
        clampGridSpan(rows, 1, layout.maxRows),
        layout.maxCols,
        layout.maxRows,
      );
    },
    [layout],
  );

  const isCanvasSizeAvailable = useCallback(
    (nextMaxCols: number, nextMaxRows: number): boolean => {
      const nextItems = layout.items.map((item) => ({
        ...item,
        colSpan: clampGridSpan(item.colSpan, 1, nextMaxCols),
        rowSpan: clampGridSpan(item.rowSpan, 1, nextMaxRows),
      }));
      const layouts: Record<string, GridSpan> = {};
      const ids = nextItems.sort((a, b) => a.order - b.order).map((item) => {
        const k = getItemKey(item);
        layouts[k] = { colSpan: item.colSpan, rowSpan: item.rowSpan };
        return k;
      });
      return canCanvasHoldAllSpans(layouts, ids, nextMaxCols, nextMaxRows);
    },
    [layout.items],
  );

  const handleSetMaxCols = useCallback(
    (cols: number): void => {
      const c = clampGridSpan(cols, 1, 6);
      setLayout((current) => {
        const nextItems = current.items.map((item) => ({
          ...item,
          colSpan: clampGridSpan(item.colSpan, 1, c),
        }));
        const layouts: Record<string, GridSpan> = {};
        const ids = nextItems.sort((a, b) => a.order - b.order).map((item) => {
          const k = getItemKey(item);
          layouts[k] = { colSpan: item.colSpan, rowSpan: item.rowSpan };
          return k;
        });
        if (!canCanvasHoldAllSpans(layouts, ids, c, current.maxRows)) return current;
        return reconcileDashboardLayoutPositions({
          ...current,
          maxCols: c,
          items: nextItems,
          updatedAt: new Date().toISOString(),
        });
      });
      setDashboardTab('edit');
    },
    [],
  );

  const handleSetMaxRows = useCallback(
    (rows: number): void => {
      const r = clampGridSpan(rows, 1, DASHBOARD_ABS_MAX_ROWS);
      setLayout((current) => {
        const nextItems = current.items.map((item) => ({
          ...item,
          rowSpan: clampGridSpan(item.rowSpan, 1, r),
        }));
        const layouts: Record<string, GridSpan> = {};
        const ids = nextItems.sort((a, b) => a.order - b.order).map((item) => {
          const k = getItemKey(item);
          layouts[k] = { colSpan: item.colSpan, rowSpan: item.rowSpan };
          return k;
        });
        if (!canCanvasHoldAllSpans(layouts, ids, current.maxCols, r)) return current;
        return reconcileDashboardLayoutPositions({
          ...current,
          maxRows: r,
          items: nextItems,
          updatedAt: new Date().toISOString(),
        });
      });
      setDashboardTab('edit');
    },
    [],
  );

  const handleItemSpanChange = useCallback((itemKey: string, colSpan: number, rowSpan: number): void => {
    setLayout((current) =>
      reconcileDashboardLayoutPositions({
        ...current,
        items: current.items.map((item) =>
          getItemKey(item) === itemKey
            ? {
                ...item,
                colSpan: clampGridSpan(colSpan, 1, current.maxCols),
                rowSpan: clampGridSpan(rowSpan, 1, current.maxRows),
              }
            : item,
        ),
        updatedAt: new Date().toISOString(),
      }),
    );
    setDashboardTab('edit');
  }, [setDashboardTab]);

  const handleToggleHideChrome = useCallback((itemKey: string): void => {
    setLayout((current) => ({
      ...current,
      items: current.items.map((item) =>
        getItemKey(item) === itemKey ? { ...item, hideChrome: !item.hideChrome } : item,
      ),
      updatedAt: new Date().toISOString(),
    }));
    setDashboardTab('edit');
  }, [setDashboardTab]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveDragKey(String(event.active.id));
  }, []);

  const handleDragCancel = useCallback((): void => {
    setActiveDragKey(null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    setActiveDragKey(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    const cellMatch = /^cell-(\d+)-(\d+)$/.exec(overId);
    if (!cellMatch) return;
    const dropRow = Number(cellMatch[1]);
    const dropCol = Number(cellMatch[2]);
    const itemKey = String(active.id);
    setLayout((current) => {
      const item = current.items.find((i) => getItemKey(i) === itemKey);
      if (!item) return current;
      const cols = clampGridSpan(item.colSpan, 1, current.maxCols);
      const rows = clampGridSpan(item.rowSpan, 1, current.maxRows);
      if (!canPlaceWidgetAtCell(current, itemKey, getItemKey, dropRow, dropCol, rows, cols)) {
        toast.error(t('common.reportBuilder.dashboardDropDoesNotFit'));
        return current;
      }
      return {
        ...current,
        items: current.items.map((i) =>
          getItemKey(i) === itemKey ? { ...i, gridRow: dropRow + 1, gridCol: dropCol + 1 } : i,
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    setDashboardTab('edit');
  }, [setDashboardTab, t]);

  const handleAddAllWidgetsForReport = useCallback(
    (reportId: number): void => {
      const report = detailedReportMap.get(reportId) ?? reportMap.get(reportId);
      if (!report) return;
      const widgetChoices = getSelectableChoices(report, t).filter((c) => c.kind === 'widget');
      setLayout((current) => {
        let items = [...current.items].sort((a, b) => a.order - b.order);
        for (const choice of widgetChoices) {
          const key = `${choice.reportId}:${choice.widgetId ?? '__report__'}`;
          if (items.some((item) => getItemKey(item) === key)) continue;
          if (!canAppend1x1Tile({ ...current, items })) continue;
          items = [...items, createDashboardItem(choice.reportId, items, { widgetId: choice.widgetId, widgetTitle: choice.widgetTitle })];
        }
        return reconcileDashboardLayoutPositions({
          ...current,
          items: items.map((item, index) => ({ ...item, order: index })),
          updatedAt: new Date().toISOString(),
        });
      });
      setDashboardTab('edit');
      setPickerOpen(false);
    },
    [detailedReportMap, reportMap, t, setDashboardTab],
  );

  const pickerDialogContent = (
    <DialogContent className="w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] gap-0 overflow-hidden p-0 sm:w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-1.5rem)] md:max-w-5xl lg:max-w-6xl">
      <DialogHeader>
        <DialogTitle className="px-4 pt-4 sm:px-6 sm:pt-5">{t('common.reportBuilder.addReportsToDashboard')}</DialogTitle>
        <DialogDescription className="px-4 pb-3 sm:px-6 sm:pb-4">{t('common.reportBuilder.dashboardPickerDescription')}</DialogDescription>
      </DialogHeader>
      <div className="max-h-[82dvh] space-y-3 overflow-y-auto px-4 pb-4 sm:max-h-[78vh] sm:space-y-4 sm:px-6 sm:pb-6">
        {choices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            {t('common.reportBuilder.availableReportsEmpty')}
          </div>
        ) : (
          Array.from(
            choices.reduce<Map<number, DashboardChoice[]>>((map, choice) => {
              const existing = map.get(choice.reportId) ?? [];
              map.set(choice.reportId, [...existing, choice]);
              return map;
            }, new Map()),
          ).map(([reportId, group]) => (
            <div key={reportId} className="rounded-2xl border-2 border-slate-300/80 bg-background/90 p-4 shadow-sm dark:border-white/20 sm:p-5">
              <div className="mb-3 sm:mb-4">
                <p className="text-base font-semibold">{group[0]?.reportName}</p>
                <p className="text-muted-foreground mt-1 text-xs">{group[0]?.reportSubtitle || reportMap.get(reportId)?.dataSourceName}</p>
              </div>
              <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
                <div className="rounded-xl border-2 border-slate-300/80 bg-muted/10 p-3.5 dark:border-white/20">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t('common.reportBuilder.dashboardPickerWidgetSection')}
                    </p>
                    {group.some((choice) => choice.kind === 'widget') ? (
                      <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 text-xs font-semibold" onClick={() => handleAddAllWidgetsForReport(reportId)}>
                        <Plus className="mr-1 size-3.5" />
                        {t('common.reportBuilder.dashboardAddAllWidgets')}
                      </Button>
                    ) : null}
                  </div>
                  {group.some((choice) => choice.kind === 'widget') ? (
                    <div className="grid gap-3">
                      {group.filter((choice) => choice.kind === 'widget').map((choice) => (
                        <button
                          key={`${choice.reportId}:${choice.widgetId ?? '__report__'}`}
                          type="button"
                          onClick={() => handleAddChoice(choice)}
                          className="rounded-xl border-2 border-slate-300/80 bg-background p-4 text-left transition hover:border-pink-400/60 hover:bg-pink-50/40 dark:border-white/20 dark:hover:border-pink-500/40 dark:hover:bg-pink-500/10"
                        >
                          <div className="mb-2 flex flex-wrap gap-2">
                            <Badge variant="secondary">{t('common.reportBuilder.dashboardItemTypes.widget')}</Badge>
                            <Badge variant="outline">{getChartTypeLabel(choice.chartType, t)}</Badge>
                          </div>
                          <p className="font-medium">{choice.widgetTitle}</p>
                          <p className="text-muted-foreground mt-1 text-xs">{choice.subtitle || t('common.reportBuilder.dashboardPickerWidgetDescription')}</p>
                          <div className="mt-3 flex items-center text-xs font-medium text-pink-600 dark:text-pink-400">
                            <Plus className="mr-1 size-3.5" />
                            {t('common.reportBuilder.addToMyDashboard')}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/70 bg-background px-4 py-5 text-sm text-muted-foreground">
                      {t('common.reportBuilder.dashboardPickerNoWidgets')}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border-2 border-slate-300/80 bg-muted/10 p-3.5 dark:border-white/20">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t('common.reportBuilder.dashboardPickerReportSection')}
                  </p>
                  {group.some((choice) => choice.kind !== 'widget') ? (
                    <div className="grid gap-3">
                      {group.filter((choice) => choice.kind !== 'widget').map((choice) => (
                        <button
                          key={`${choice.reportId}:${choice.widgetId ?? '__report__'}`}
                          type="button"
                          onClick={() => handleAddChoice(choice)}
                          className="rounded-xl border-2 border-slate-300/80 bg-background p-4 text-left transition hover:border-pink-400/60 hover:bg-pink-50/40 dark:border-white/20 dark:hover:border-pink-500/40 dark:hover:bg-pink-500/10"
                        >
                          <div className="mb-2 flex flex-wrap gap-2">
                            <Badge variant="secondary">{choice.kind === 'dashboard' ? t('common.reportBuilder.dashboardItemTypes.dashboard') : t('common.reportBuilder.dashboardItemTypes.report')}</Badge>
                            {choice.chartType ? <Badge variant="outline">{getChartTypeLabel(choice.chartType, t)}</Badge> : null}
                          </div>
                          <p className="font-medium">{choice.widgetTitle}</p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {choice.kind === 'dashboard'
                              ? t('common.reportBuilder.dashboardPickerWholeReportDescription')
                              : choice.subtitle}
                          </p>
                          <div className="mt-3 flex items-center text-xs font-medium text-pink-600 dark:text-pink-400">
                            <Plus className="mr-1 size-3.5" />
                            {t('common.reportBuilder.addToMyDashboard')}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DialogContent>
  );

  const dragOverlayItem = activeDragKey
    ? sortedLayoutItems.find((item) => getItemKey(item) === activeDragKey)
    : undefined;
  const dragOverlayReport = dragOverlayItem
    ? detailedReportMap.get(dragOverlayItem.reportId) ?? reportMap.get(dragOverlayItem.reportId)
    : undefined;
  const dragOverlayLabel =
    dragOverlayItem?.widgetTitle?.trim()
    || dragOverlayReport?.name?.trim()
    || '';

  const dashboardGridTemplateStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${layout.maxCols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${layout.maxRows}, ${DASHBOARD_ROW_HEIGHT_PX}px)`,
    gap: DASHBOARD_GRID_GAP_PX,
  };

  const isDropLayerActive = isEditorTab && activeDragKey != null;

  const widgetGrid = (
    <DndContext
      sensors={dndSensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div
        className="relative w-full"
        style={{ minHeight: dashboardGridMinHeightPx(layout.maxRows) }}
      >
        {isEditorTab ? (
          <div
            className={cn(
              'absolute inset-0 z-0 grid',
              !isDropLayerActive && 'pointer-events-none',
            )}
            style={dashboardGridTemplateStyle}
          >
            {Array.from({ length: layout.maxRows * layout.maxCols }, (_, i) => {
              const row = Math.floor(i / layout.maxCols);
              const col = i % layout.maxCols;
              return (
                <DashboardDropCell
                  key={`drop-${row}-${col}`}
                  row={row}
                  col={col}
                  isDropActive={isDropLayerActive}
                />
              );
            })}
          </div>
        ) : null}
        <div
          className={cn(
            'relative z-[1] grid w-full max-w-full items-stretch',
            isDropLayerActive && 'pointer-events-none',
          )}
          style={dashboardGridTemplateStyle}
        >
          {sortedLayoutItems.map((item, tileIndex) => {
            const report = detailedReportMap.get(item.reportId) ?? reportMap.get(item.reportId);
            if (!report) return null;
            const itemKey = getItemKey(item);
            return (
              <SortableDashboardTile
                key={itemKey}
                itemKey={itemKey}
                maxCols={layout.maxCols}
                maxRows={layout.maxRows}
                colSpan={item.colSpan}
                rowSpan={item.rowSpan}
                gridCol={item.gridCol}
                gridRow={item.gridRow}
                isEditMode={isEditorTab}
                hideChrome={Boolean(item.hideChrome)}
                isSizeAvailable={(cols, rows) => isWidgetSizeAvailable(itemKey, cols, rows)}
                onSpanChange={(cols, rows) => handleItemSpanChange(itemKey, cols, rows)}
                onToggleHideChrome={() => handleToggleHideChrome(itemKey)}
              >
                <DashboardReportWidget
                  item={item}
                  report={report}
                  mode={isEditorTab ? 'editor' : 'corporate'}
                  corporateTileIndex={tileIndex}
                  onRemove={() => handleRemoveItem(item)}
                />
              </SortableDashboardTile>
            );
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDragKey && dragOverlayLabel ? (
          <div className="flex max-w-sm cursor-grabbing rounded-2xl border border-pink-300/80 bg-white/95 px-4 py-3 shadow-2xl dark:border-pink-500/40 dark:bg-slate-950/95">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{dragOverlayLabel}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );

  const pickerDialog = (
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      {pickerDialogContent}
    </Dialog>
  );

  if (!isEditorTab) {
    if (isLoading) {
      return (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-[240px] w-full rounded-2xl" />
            <Skeleton className="h-[240px] w-full rounded-2xl" />
          </div>
          {pickerDialog}
        </>
      );
    }
    if (error) {
      return (
        <>
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
            {error.message}
          </div>
          {pickerDialog}
        </>
      );
    }
    if (reports.length === 0 || layout.items.length === 0) {
      return <>{pickerDialog}</>;
    }
    return (
      <>
        {widgetGrid}
        {pickerDialog}
      </>
    );
  }

  return (
    <>
      <Card className="border border-slate-300/80 bg-stone-50/95 shadow-sm shadow-slate-900/3 dark:border-white/10 dark:bg-[#120c18]">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
              <LayoutGrid className="size-5 text-pink-600 dark:text-pink-400" />
              {t('common.reportBuilder.dashboardHomeTitle')}
            </CardTitle>
            <CardDescription>{t('common.reportBuilder.dashboardHomeDescription')}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasUnsavedChanges ? (
              <Badge variant="outline" className="rounded-full border-amber-300/80 bg-amber-50 px-3 py-1 text-[11px] text-amber-800 dark:border-amber-300/30 dark:bg-amber-500/10 dark:text-amber-200">
                {t('common.reportBuilder.dashboardUnsavedChangesBadge')}
              </Badge>
            ) : null}
            <Button
              type="button"
              onClick={handleAddReportsButtonClick}
              disabled={isLoading || choices.length === 0}
              aria-disabled={!canAddAnyTile && !isLoading && choices.length > 0}
              title={
                !canAddAnyTile && !isLoading && choices.length > 0
                  ? (t('common.reportBuilder.dashboardReportAreaFullHint') as string)
                  : undefined
              }
              className={cn(
                'h-9 px-6 bg-linear-to-r from-pink-600 to-orange-600 rounded-2x1 text-white text-sm font-bold shadow-lg shadow-pink-500/20 transition-all duration-300 border-0',
                isLoading || choices.length === 0
                  ? 'opacity-60'
                  : !canAddAnyTile
                    ? 'cursor-not-allowed opacity-45 saturate-50 hover:scale-100 hover:shadow-lg active:scale-100 dark:opacity-50'
                    : 'opacity-90 hover:scale-[1.05] hover:shadow-pink-500/30 active:scale-[0.98] dark:opacity-100',
              )}
            >
              <Plus className="mr-2 size-4 stroke-[3px]" />
              {t('common.reportBuilder.addReportsToDashboard')}
            </Button>
            <Button onClick={handleSaveLayout} disabled={!isHydrated || !hasUnsavedChanges}>
              {saveState === 'saved' ? <CheckCircle2 className="mr-2 size-4" /> : <Save className="mr-2 size-4" />}
              {saveState === 'saved' ? t('common.reportBuilder.dashboardLayoutSaved') : t('common.reportBuilder.saveDashboardLayout')}
            </Button>
            <Button variant="ghost" onClick={handleReset} disabled={layout.items.length === 0}
              className="border-slate-400 dark:border-white/20 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold shadow-sm"
            >
              <RefreshCw className="mr-2 size-4" />
              {t('common.reportBuilder.resetMyDashboard')}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/reports/my')}
              className="border-slate-300 dark:border-white/20 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold shadow-sm"
            >
              {t('common.reportBuilder.goToMyReports')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hasUnsavedChanges ? (
            <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
              {t('common.reportBuilder.dashboardUnsavedChanges')}
            </div>
          ) : null}
          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-[240px] w-full rounded-2xl" />
              <Skeleton className="h-[240px] w-full rounded-2xl" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
              {error.message}
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-8 text-center">
              <p className="font-medium">{t('common.reportBuilder.noAssignedReports')}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t('common.reportBuilder.dashboardNoAssignedDescription')}</p>
            </div>
          ) : layout.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-8 text-center">
              <p className="font-medium">{t('common.reportBuilder.dashboardHomeEmptyTitle')}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t('common.reportBuilder.dashboardHomeEmptyDescription')}</p>
            </div>
          ) : (
            <div
              className="relative overflow-auto rounded-[24px] border border-pink-200/80 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.06),transparent_24%),linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-size-[auto,32px_32px,32px_32px] p-4 transition-all duration-300"
              style={{ minHeight: 720 }}
            >
              <div className="mb-4 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('common.reportBuilder.dashboardCanvasTitle')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('common.reportBuilder.dashboardCanvasEditingDescription')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
                    <Sparkles className="mr-1 size-3.5" />
                    {t('common.reportBuilder.editModeActive')}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/10 bg-background/60 px-3 py-1 text-[11px]">
                    {layout.items.length} {layout.items.length === 1 ? t('common.reportBuilder.dashboardItemTypes.widget') : t('common.reportBuilder.dashboardCanvasItemsBadge')}
                  </Badge>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-pink-100 bg-pink-50 shadow-sm dark:border-pink-500/20 dark:bg-pink-500/10">
                    <LayoutGrid className="size-4 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {t('common.reportBuilder.canvasLayoutTitle')}
                    </div>
                    <div className="text-[11px] font-medium text-slate-400">
                      {t('common.reportBuilder.canvasLayoutHint')}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex min-w-[4.5rem] flex-col leading-tight">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          {t('common.reportBuilder.canvasColsLabel')}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {t('common.reportBuilder.canvasColsDimension')}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white/80 p-1 shadow-inner dark:border-white/10 dark:bg-white/5">
                        {DASHBOARD_COL_OPTIONS.map((cols) => {
                          const isActive = layout.maxCols === cols;
                          const enabled = isActive || isCanvasSizeAvailable(cols, layout.maxRows);
                          return (
                            <button
                              key={`dash-cols-${cols}`}
                              type="button"
                              onClick={() => enabled && handleSetMaxCols(cols)}
                              disabled={!enabled}
                              aria-pressed={isActive}
                              title={
                                enabled
                                  ? (t('common.reportBuilder.canvasColsOption', { count: cols }) as string)
                                  : (t('common.reportBuilder.canvasShrinkBlocked') as string)
                              }
                              className={cn(
                                'flex h-7 min-w-[28px] items-center justify-center rounded-lg px-2 text-[11px] font-black transition-colors',
                                isActive
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                  : enabled
                                    ? 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'
                                    : 'cursor-not-allowed text-slate-300 dark:text-slate-600',
                              )}
                            >
                              {cols}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex min-w-[4.5rem] flex-col leading-tight">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          {t('common.reportBuilder.canvasRowsLabel')}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {t('common.reportBuilder.canvasRowsDimension')}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white/80 p-1 shadow-inner dark:border-white/10 dark:bg-white/5">
                        {DASHBOARD_ROW_OPTIONS.map((rows) => {
                          const isActive = layout.maxRows === rows;
                          const enabled = isActive || isCanvasSizeAvailable(layout.maxCols, rows);
                          return (
                            <button
                              key={`dash-rows-${rows}`}
                              type="button"
                              onClick={() => enabled && handleSetMaxRows(rows)}
                              disabled={!enabled}
                              aria-pressed={isActive}
                              title={
                                enabled
                                  ? (t('common.reportBuilder.canvasRowsOption', { count: rows }) as string)
                                  : (t('common.reportBuilder.canvasShrinkBlocked') as string)
                              }
                              className={cn(
                                'flex h-7 min-w-[28px] items-center justify-center rounded-lg px-2 text-[11px] font-black transition-colors',
                                isActive
                                  ? 'bg-pink-600 text-white shadow-md shadow-pink-500/30'
                                  : enabled
                                    ? 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'
                                    : 'cursor-not-allowed text-slate-300 dark:text-slate-600',
                              )}
                            >
                              {rows}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {widgetGrid}
            </div>
          )}
        </CardContent>
      </Card>

      {pickerDialog}
    </>
  );
}
