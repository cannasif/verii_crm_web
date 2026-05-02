import { lazy, Suspense, type ReactElement, type ComponentType } from 'react';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useReportBuilderStore } from '../store';
import { reportsApi } from '../api';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  BarChart3,
  BellRing,
  ChevronLeft,
  Download,
  FileJson,
  Filter,
  GripHorizontal,
  LayoutGrid,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Tag,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { CalculatedField, DataSourceParameterBinding, ReportPreviewResponse, ReportWidget } from '../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';
import { Skeleton } from '@/components/ui/skeleton';
import { DeferOnView } from '@/components/shared/DeferOnView';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const PreviewPanel = lazy(async () =>
  import('../components/PreviewPanel').then((mod) => ({ default: mod.PreviewPanel }))
);
const RuntimeFiltersPanel = lazy(async () =>
  import('../components/RuntimeFiltersPanel').then((mod) => ({ default: mod.RuntimeFiltersPanel }))
);

interface WidgetLayoutItem {
  colSpan: number;
  rowSpan: number;
}

interface ViewerLayoutState {
  version: 4;
  maxCols: number;
  maxRows: number;
  order: string[];
  layouts: Record<string, WidgetLayoutItem>;
}

const DEFAULT_MAX_COLS = 3;
const DEFAULT_MAX_ROWS = 2;
const COL_OPTIONS = [1, 2, 3, 4, 6] as const;
const ROW_OPTIONS = [1, 2, 3, 4] as const;
const ROW_HEIGHT_PX = 320;
const ABSOLUTE_MAX_ROW_SPAN = 4;

function getViewerLayoutKey(reportId: number): string {
  return `crm-report-viewer-layout-v4:${reportId}`;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function defaultColSpanFor(size: ReportWidget['size'], maxCols: number): number {
  if (size === 'full') return maxCols;
  if (size === 'half') return Math.max(1, Math.ceil(maxCols / 2));
  return Math.max(1, Math.ceil(maxCols / 3));
}

function defaultRowSpanFor(height: ReportWidget['height']): number {
  if (height === 'lg') return 2;
  return 1;
}

function tryPlaceFirstFit(
  grid: boolean[][],
  cols: number,
  rows: number,
  maxCols: number,
  maxRows: number,
): { row: number; col: number } | null {
  if (cols < 1 || rows < 1 || cols > maxCols || rows > maxRows) return null;
  for (let row = 0; row <= maxRows - rows; row += 1) {
    for (let col = 0; col <= maxCols - cols; col += 1) {
      let canPlace = true;
      for (let dr = 0; dr < rows && canPlace; dr += 1) {
        for (let dc = 0; dc < cols && canPlace; dc += 1) {
          if (grid[row + dr][col + dc]) canPlace = false;
        }
      }
      if (canPlace) {
        for (let dr = 0; dr < rows; dr += 1) {
          for (let dc = 0; dc < cols; dc += 1) {
            grid[row + dr][col + dc] = true;
          }
        }
        return { row, col };
      }
    }
  }
  return null;
}

function buildOccupancyGrid(
  layouts: Record<string, WidgetLayoutItem>,
  ids: string[],
  maxCols: number,
  maxRows: number,
): { grid: boolean[][]; placedAll: boolean } {
  const grid: boolean[][] = Array.from({ length: maxRows }, () => Array<boolean>(maxCols).fill(false));
  let placedAll = true;
  ids.forEach((id) => {
    const layout = layouts[id];
    if (!layout) return;
    const cols = clamp(layout.colSpan, 1, maxCols);
    const rows = clamp(layout.rowSpan, 1, maxRows);
    const placement = tryPlaceFirstFit(grid, cols, rows, maxCols, maxRows);
    if (!placement) placedAll = false;
  });
  return { grid, placedAll };
}

function canFitInGrid(grid: boolean[][], cols: number, rows: number, maxCols: number, maxRows: number): boolean {
  if (cols < 1 || rows < 1 || cols > maxCols || rows > maxRows) return false;
  for (let row = 0; row <= maxRows - rows; row += 1) {
    for (let col = 0; col <= maxCols - cols; col += 1) {
      let canPlace = true;
      for (let dr = 0; dr < rows && canPlace; dr += 1) {
        for (let dc = 0; dc < cols && canPlace; dc += 1) {
          if (grid[row + dr][col + dc]) canPlace = false;
        }
      }
      if (canPlace) return true;
    }
  }
  return false;
}

function canCanvasHoldAllWidgets(
  layouts: Record<string, WidgetLayoutItem>,
  ids: string[],
  newMaxCols: number,
  newMaxRows: number,
): boolean {
  return buildOccupancyGrid(layouts, ids, newMaxCols, newMaxRows).placedAll;
}

function loadViewerLayout(reportId: number): ViewerLayoutState | null {
  if (Number.isNaN(reportId)) return null;
  try {
    const raw = localStorage.getItem(getViewerLayoutKey(reportId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ViewerLayoutState;
    if (!parsed || parsed.version !== 4 || !Array.isArray(parsed.order) || typeof parsed.layouts !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveViewerLayout(reportId: number, layout: ViewerLayoutState): void {
  if (Number.isNaN(reportId)) return;
  try {
    localStorage.setItem(getViewerLayoutKey(reportId), JSON.stringify(layout));
  } catch {
    // ignore
  }
}

function buildConfigFromWidget(
  widget: ReportWidget,
  allWidgets?: ReportWidget[],
  calculatedFields?: CalculatedField[],
  lifecycle?: { status: string; version: number; publishedAt?: string },
  datasetParameters?: DataSourceParameterBinding[],
  reportFilters: unknown[] = []
): string {
  const mergedFilters = [...reportFilters, ...(widget.filters ?? [])].filter(
    (filter, index, all) => index === all.findIndex((item) => JSON.stringify(item) === JSON.stringify(filter)),
  );
  return JSON.stringify({
    chartType: widget.chartType,
    axis: widget.axis,
    values: widget.values,
    legend: widget.legend,
    sorting: widget.sorting,
    filters: mergedFilters,
    datasetParameters,
    calculatedFields,
    lifecycle,
    widgets: allWidgets,
    activeWidgetId: widget.id,
  });
}

function formatDateLiteral(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveBindingValue(binding: DataSourceParameterBinding, user: { id: number; email: string } | null): string {
  switch (binding.source) {
    case 'currentUserId':
      return user?.id != null ? String(user.id) : '';
    case 'currentUserEmail':
      return user?.email ?? '';
    case 'today':
      return formatDateLiteral(new Date());
    case 'now':
      return new Date().toISOString();
    case 'literal':
    default:
      return binding.value ?? '';
  }
}

function buildRuntimeConfigJson(
  config: {
    chartType: string;
    axis?: unknown;
    values: unknown[];
    legend?: unknown;
    sorting?: unknown;
    filters: unknown[];
    datasetParameters?: DataSourceParameterBinding[];
    calculatedFields?: CalculatedField[];
    lifecycle?: { status: string; version: number; publishedAt?: string };
    widgets?: ReportWidget[];
    activeWidgetId?: string;
    governance?: unknown;
    history?: unknown;
  },
  user: { id: number; email: string } | null,
  overrides: Record<string, string>
): string {
  const datasetParameters = (config.datasetParameters ?? []).map((binding) => {
    if (binding.allowViewerOverride) {
      const nextValue = overrides[binding.name] ?? resolveBindingValue(binding, user);
      return { ...binding, source: 'literal' as const, value: nextValue };
    }
    return binding;
  });

  return JSON.stringify({
    ...config,
    datasetParameters,
  });
}

function downloadTextFile(filename: string, content: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(columns: string[], rows: unknown[][]): string {
  const header = columns.map(escapeCsvCell).join(',');
  const body = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  return [header, body].filter(Boolean).join('\n');
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

export function ReportViewerPage(): ReactElement {
  const { t } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    meta,
    config,
    preview,
    ui,
    schema,
    setPreview,
    setUi,
    hydrateFromReportDetail,
    loadSchemaForCurrentDataSource,
  } = useReportBuilderStore();
  const currentUser = useAuthStore((state) => state.user);
  const [widgetPreviews, setWidgetPreviews] = useState<Record<string, { columns: string[]; rows: unknown[][]; loading: boolean; error: string | null }>>({});
  const [viewerParameterValues, setViewerParameterValues] = useState<Record<string, string>>({});

  const reportId = id ? parseInt(id, 10) : NaN;
  const isMyReportsView = location.pathname.startsWith('/reports/my/');
  const listPath = isMyReportsView ? '/reports/my' : '/reports';
  const widgetCount = config.widgets?.length ?? 1;
  const saveState = (location.state as { justSaved?: boolean; fromBuilder?: boolean; isEdit?: boolean } | null) ?? null;
  const lifecycle = config.lifecycle ?? { status: 'draft' as const, version: 1 };

  const governance = config.governance ?? {
    audience: 'private' as const,
    refreshCadence: 'manual' as const,
    favorite: false,
    tags: [],
    sharedWith: [],
    subscriptionEnabled: false,
    subscriptionChannel: 'email' as const,
    subscriptionFrequency: 'weekly' as const,
    certified: false,
  };
  const statusLabel = lifecycle.status === 'published'
    ? t('common.reportBuilder.lifecycle.publish')
    : lifecycle.status === 'archived'
      ? t('common.reportBuilder.lifecycle.archive')
      : t('common.reportBuilder.lifecycle.draft');
  const audienceLabel = governance.audience ? t(`common.reportBuilder.audiences.${governance.audience}`) : '-';
  const refreshCadenceLabel = governance.refreshCadence ? t(`common.reportBuilder.refreshCadences.${governance.refreshCadence}`) : '-';
  const subscriptionFrequencyLabel = governance.subscriptionFrequency ? t(`common.reportBuilder.subscriptionFrequencies.${governance.subscriptionFrequency}`) : t('common.reportBuilder.subscriptionFrequencies.manual');
  const subscriptionChannelLabel = governance.subscriptionChannel ? t(`common.reportBuilder.subscriptionChannels.${governance.subscriptionChannel}`) : t('common.reportBuilder.subscriptionChannels.email');
  const viewerEditableParameters = (config.datasetParameters ?? []).filter((item) => item.allowViewerOverride);
  const dataSourceTypeLabel = meta.dataSourceType
    ? (meta.dataSourceType === 'view' || meta.dataSourceType === 'function'
      ? t(`common.reportBuilder.datasetTypes.${meta.dataSourceType}`)
      : meta.dataSourceType)
    : '-';
  const initialViewerParameterValues = useMemo(
    () =>
      Object.fromEntries(
        (config.datasetParameters ?? [])
          .filter((item) => item.allowViewerOverride)
          .map((item) => [item.name, resolveBindingValue(item, currentUser)])
      ),
    [config.datasetParameters, currentUser]
  );
  const hasViewerParameterChanges = useMemo(() => {
    const currentKeys = Object.keys(viewerParameterValues);
    const initialKeys = Object.keys(initialViewerParameterValues);
    if (currentKeys.length !== initialKeys.length) return true;
    return currentKeys.some((key) => (viewerParameterValues[key] ?? '') !== (initialViewerParameterValues[key] ?? ''));
  }, [viewerParameterValues, initialViewerParameterValues]);
  const reportWidgetTotal = config.widgets?.length ?? 0;
  const allWidgets = useMemo(() => config.widgets ?? [], [config.widgets]);

  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);
  const [widgetLayouts, setWidgetLayouts] = useState<Record<string, WidgetLayoutItem>>({});
  const [maxCols, setMaxCols] = useState<number>(DEFAULT_MAX_COLS);
  const [maxRows, setMaxRows] = useState<number>(DEFAULT_MAX_ROWS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (allWidgets.length === 0) return;
    const stored = loadViewerLayout(reportId);
    const cols = stored?.maxCols ?? DEFAULT_MAX_COLS;
    const rows = clamp(stored?.maxRows ?? DEFAULT_MAX_ROWS, 1, ABSOLUTE_MAX_ROW_SPAN);
    const validIds = new Set(allWidgets.map((widget) => widget.id));
    const order: string[] = [];
    if (stored?.order) {
      stored.order.forEach((widgetId) => {
        if (validIds.has(widgetId)) order.push(widgetId);
      });
    }
    allWidgets.forEach((widget) => {
      if (!order.includes(widget.id)) order.push(widget.id);
    });
    const layouts: Record<string, WidgetLayoutItem> = {};
    allWidgets.forEach((widget) => {
      const fallback: WidgetLayoutItem = {
        colSpan: defaultColSpanFor(widget.size, cols),
        rowSpan: clamp(defaultRowSpanFor(widget.height), 1, rows),
      };
      const storedItem = stored?.layouts?.[widget.id];
      layouts[widget.id] = {
        colSpan: clamp(storedItem?.colSpan ?? fallback.colSpan, 1, cols),
        rowSpan: clamp(storedItem?.rowSpan ?? fallback.rowSpan, 1, rows),
      };
    });
    setMaxCols(cols);
    setMaxRows(rows);
    setWidgetOrder(order);
    setWidgetLayouts(layouts);
  }, [allWidgets, reportId]);

  const persistLayout = useCallback(
    (overrides: {
      order?: string[];
      layouts?: Record<string, WidgetLayoutItem>;
      maxCols?: number;
      maxRows?: number;
    }) => {
      const next: ViewerLayoutState = {
        version: 4,
        maxCols: overrides.maxCols ?? maxCols,
        maxRows: overrides.maxRows ?? maxRows,
        order: overrides.order ?? widgetOrder,
        layouts: overrides.layouts ?? widgetLayouts,
      };
      saveViewerLayout(reportId, next);
    },
    [maxCols, maxRows, widgetOrder, widgetLayouts, reportId],
  );

  const handleSetMaxCols = useCallback(
    (cols: number) => {
      const nextLayouts: Record<string, WidgetLayoutItem> = {};
      Object.entries(widgetLayouts).forEach(([id, layout]) => {
        nextLayouts[id] = { ...layout, colSpan: clamp(layout.colSpan, 1, cols) };
      });
      if (!canCanvasHoldAllWidgets(nextLayouts, widgetOrder, cols, maxRows)) return;
      setMaxCols(cols);
      setWidgetLayouts(nextLayouts);
      persistLayout({ maxCols: cols, layouts: nextLayouts });
    },
    [widgetLayouts, widgetOrder, maxRows, persistLayout],
  );

  const handleSetMaxRows = useCallback(
    (rows: number) => {
      const clamped = clamp(rows, 1, ABSOLUTE_MAX_ROW_SPAN);
      const nextLayouts: Record<string, WidgetLayoutItem> = {};
      Object.entries(widgetLayouts).forEach(([id, layout]) => {
        nextLayouts[id] = { ...layout, rowSpan: clamp(layout.rowSpan, 1, clamped) };
      });
      if (!canCanvasHoldAllWidgets(nextLayouts, widgetOrder, maxCols, clamped)) return;
      setMaxRows(clamped);
      setWidgetLayouts(nextLayouts);
      persistLayout({ maxRows: clamped, layouts: nextLayouts });
    },
    [widgetLayouts, widgetOrder, maxCols, persistLayout],
  );

  const handleWidgetLayoutChange = useCallback(
    (widgetId: string, layout: WidgetLayoutItem, persist = true) => {
      setWidgetLayouts((current) => {
        const next = { ...current, [widgetId]: layout };
        if (persist) persistLayout({ layouts: next });
        return next;
      });
    },
    [persistLayout],
  );

  const isWidgetSizeAvailable = useCallback(
    (widgetId: string, cols: number, rows: number): boolean => {
      if (cols < 1 || rows < 1 || cols > maxCols || rows > maxRows) return false;
      const otherIds = widgetOrder.filter((id) => id !== widgetId);
      const { grid } = buildOccupancyGrid(widgetLayouts, otherIds, maxCols, maxRows);
      return canFitInGrid(grid, cols, rows, maxCols, maxRows);
    },
    [widgetOrder, widgetLayouts, maxCols, maxRows],
  );

  const isCanvasSizeAvailable = useCallback(
    (nextMaxCols: number, nextMaxRows: number): boolean => {
      const nextLayouts: Record<string, WidgetLayoutItem> = {};
      Object.entries(widgetLayouts).forEach(([id, layout]) => {
        nextLayouts[id] = {
          colSpan: clamp(layout.colSpan, 1, nextMaxCols),
          rowSpan: clamp(layout.rowSpan, 1, nextMaxRows),
        };
      });
      return canCanvasHoldAllWidgets(nextLayouts, widgetOrder, nextMaxCols, nextMaxRows);
    },
    [widgetLayouts, widgetOrder],
  );

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setWidgetOrder((current) => {
        const oldIndex = current.indexOf(active.id as string);
        const newIndex = current.indexOf(over.id as string);
        if (oldIndex < 0 || newIndex < 0) return current;
        const next = arrayMove(current, oldIndex, newIndex);
        persistLayout({ order: next });
        return next;
      });
    },
    [persistLayout],
  );

  const handleResetLayout = useCallback(() => {
    const cols = DEFAULT_MAX_COLS;
    const rows = DEFAULT_MAX_ROWS;
    const order = allWidgets.map((widget) => widget.id);
    const layouts: Record<string, WidgetLayoutItem> = {};
    allWidgets.forEach((widget) => {
      layouts[widget.id] = {
        colSpan: defaultColSpanFor(widget.size, cols),
        rowSpan: clamp(defaultRowSpanFor(widget.height), 1, rows),
      };
    });
    setMaxCols(cols);
    setMaxRows(rows);
    setWidgetOrder(order);
    setWidgetLayouts(layouts);
    persistLayout({ maxCols: cols, maxRows: rows, order, layouts });
  }, [allWidgets, persistLayout]);

  const orderedWidgets = useMemo(() => {
    if (widgetOrder.length === 0) return allWidgets;
    const map = new Map(allWidgets.map((widget) => [widget.id, widget]));
    const ordered = widgetOrder.map((id) => map.get(id)).filter((widget): widget is ReportWidget => Boolean(widget));
    allWidgets.forEach((widget) => {
      if (!ordered.find((item) => item.id === widget.id)) ordered.push(widget);
    });
    return ordered;
  }, [allWidgets, widgetOrder]);

  const groupedWidgets = useMemo(() => {
    const sections = new Map<string, ReportWidget[]>();
    orderedWidgets.forEach((widget) => {
      const key = widget.appearance?.sectionLabel?.trim() || '__default__';
      sections.set(key, [...(sections.get(key) ?? []), widget]);
    });
    return Array.from(sections.entries()).map(([label, widgets]) => ({
      label: label === '__default__' ? '' : label,
      description: widgets.find((widget) => widget.appearance?.sectionDescription?.trim())?.appearance?.sectionDescription?.trim() ?? '',
      widgets,
    }));
  }, [orderedWidgets]);

  const exportCurrentWidgetCsv = useCallback(() => {
    if (!preview.columns.length) return;
    const baseName = meta.name?.trim() || 'report';
    downloadTextFile(`${baseName}-widget.csv`, buildCsv(preview.columns, preview.rows), 'text/csv;charset=utf-8;');
  }, [meta.name, preview.columns, preview.rows]);

  const exportDefinitionJson = useCallback(() => {
    const baseName = meta.name?.trim() || 'report';
    downloadTextFile(
      `${baseName}-definition.json`,
      JSON.stringify(
        {
          meta,
          config,
          schema,
        },
        null,
        2
      ),
      'application/json;charset=utf-8;'
    );
  }, [config, meta, schema]);

  const exportAllWidgetsCsv = useCallback(() => {
    const widgets = config.widgets ?? [];
    if (widgets.length === 0) {
      exportCurrentWidgetCsv();
      return;
    }

    const sections = widgets.map((widget, index) => {
      const data: ReportPreviewResponse | undefined =
        widget.id === config.activeWidgetId || index === 0
          ? { columns: preview.columns, rows: preview.rows }
          : widgetPreviews[widget.id]
            ? { columns: widgetPreviews[widget.id].columns, rows: widgetPreviews[widget.id].rows }
            : undefined;

      if (!data || !data.columns.length) {
        return [`# ${widget.title || t('common.reportBuilder.widgetTitleFallback', { index: index + 1 })}`, t('common.noData')].join('\n');
      }

      return [`# ${widget.title || t('common.reportBuilder.widgetTitleFallback', { index: index + 1 })}`, buildCsv(data.columns, data.rows)].join('\n');
    });

    const baseName = meta.name?.trim() || 'report';
    downloadTextFile(`${baseName}-all-widgets.csv`, sections.join('\n\n'), 'text/csv;charset=utf-8;');
  }, [config.activeWidgetId, config.widgets, exportCurrentWidgetCsv, meta.name, preview.columns, preview.rows, widgetPreviews]);

  const loadReport = useCallback(async () => {
    if (Number.isNaN(reportId)) return;
    try {
      setUi({ checkLoading: true, error: null });
      const report = await reportsApi.get(reportId);
      hydrateFromReportDetail(report);
    } catch (e) {
      setUi({ checkLoading: false, error: e instanceof Error ? e.message : t('common.reportBuilder.messages.loadReportFailed') });
      return;
    }
    setUi({ checkLoading: false });
  }, [reportId, hydrateFromReportDetail, setUi]);

  const runPreview = useCallback(async (parameterOverrides: Record<string, string>) => {
    if (!meta.connectionKey || !meta.dataSourceType || !meta.dataSourceName) return;
    setUi({ previewLoading: true, error: null });
    try {
      const configJson = buildRuntimeConfigJson(config, currentUser, parameterOverrides);
      const res = await reportsApi.preview({
        connectionKey: meta.connectionKey,
        dataSourceType: meta.dataSourceType,
        dataSourceName: meta.dataSourceName,
        configJson,
      });
      setPreview({ columns: res.columns ?? [], rows: res.rows ?? [] });
      setUi({ previewLoading: false });
    } catch (e) {
      setUi({ previewLoading: false, error: e instanceof Error ? e.message : t('common.reportBuilder.messages.previewFailed') });
    }
  }, [meta.connectionKey, meta.dataSourceType, meta.dataSourceName, config, currentUser, setPreview, setUi]);

  const runAllWidgetPreviews = useCallback(async (parameterOverrides: Record<string, string>) => {
    const widgets = config.widgets ?? [];
    if (!meta.connectionKey || !meta.dataSourceType || !meta.dataSourceName || widgets.length === 0) return;
    const runtimeDatasetParameters = JSON.parse(buildRuntimeConfigJson(config, currentUser, parameterOverrides)).datasetParameters as DataSourceParameterBinding[] | undefined;

    setWidgetPreviews((current) =>
      Object.fromEntries(
        widgets.map((widget) => [
          widget.id,
          {
            columns: current[widget.id]?.columns ?? [],
            rows: current[widget.id]?.rows ?? [],
            loading: true,
            error: null,
          },
        ])
      )
    );

    await Promise.all(
      widgets.map(async (widget) => {
        try {
          const res = await reportsApi.preview({
            connectionKey: meta.connectionKey,
            dataSourceType: meta.dataSourceType,
            dataSourceName: meta.dataSourceName,
            configJson: buildConfigFromWidget(
              widget,
              widgets,
              config.calculatedFields,
              lifecycle,
              runtimeDatasetParameters,
              config.filters
            ),
          });
          setWidgetPreviews((current) => ({
            ...current,
            [widget.id]: {
              columns: res.columns ?? [],
              rows: res.rows ?? [],
              loading: false,
              error: null,
            },
          }));
        } catch (e) {
          setWidgetPreviews((current) => ({
            ...current,
            [widget.id]: {
              columns: current[widget.id]?.columns ?? [],
              rows: current[widget.id]?.rows ?? [],
              loading: false,
              error: e instanceof Error ? e.message : t('common.reportBuilder.messages.previewFailed'),
            },
          }));
        }
      })
    );
  }, [config, config.calculatedFields, config.widgets, currentUser, lifecycle, meta.connectionKey, meta.dataSourceType, meta.dataSourceName]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (meta.connectionKey && meta.dataSourceType && meta.dataSourceName) {
      loadSchemaForCurrentDataSource();
      runPreview(initialViewerParameterValues);
      runAllWidgetPreviews(initialViewerParameterValues);
    }
  }, [meta.connectionKey, meta.dataSourceType, meta.dataSourceName, runPreview, runAllWidgetPreviews, loadSchemaForCurrentDataSource, initialViewerParameterValues]);

  useEffect(() => {
    setViewerParameterValues(initialViewerParameterValues);
  }, [initialViewerParameterValues]);

  if (Number.isNaN(reportId)) {
    return (
      <div className="p-6">
        <p className="text-destructive">{t('common.reportBuilder.invalidReportId')}</p>
      </div>
    );
  }

  if (ui.checkLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (ui.error) {
    return (
      <div className="p-6">
        <p className="text-destructive">{ui.error}</p>
        <Button variant="outline" className="mt-2" onClick={() => navigate(listPath)}>
          {t('common.reportBuilder.backToList')}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-4 pb-8 pt-0 animate-in fade-in duration-500 sm:px-6">
      <div className="flex items-center justify-between pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(listPath)}
          className="rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 font-bold text-slate-500 dark:text-slate-400 h-10 pr-4"
        >
          <ChevronLeft className="mr-1 size-4" />
          {t('common.reportBuilder.backToList')}
        </Button>

        {saveState?.justSaved && (
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-4 py-2 rounded-xl animate-in slide-in-from-top-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Zap className="size-3 stroke-[3]" />
            </div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {saveState.isEdit
                ? t('common.reportBuilder.saveSuccessUpdatedDescription')
                : t('common.reportBuilder.saveSuccessCreatedDescription')}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-slate-200/90 bg-linear-to-br from-white/90 via-slate-50/80 to-indigo-50/40 p-5 shadow-sm dark:border-white/10 dark:from-slate-950/80 dark:via-slate-950/60 dark:to-indigo-950/30 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-100 shadow-inner dark:border-white/10 dark:bg-white/5 group">
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <LayoutGrid className="size-8 text-indigo-600 dark:text-indigo-400 relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
              {meta.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
              {meta.connectionKey} <span className="mx-1 text-slate-300">/</span> {dataSourceTypeLabel} <span className="mx-1 text-slate-300">/</span> {meta.dataSourceName}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-md bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-500/20 font-bold px-2 py-0.5 text-[10px] uppercase">
                {statusLabel}
              </Badge>
              <Badge variant="outline" className="rounded-md border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                v{lifecycle.version}
              </Badge>
              {governance.certified && (
                <Badge variant="secondary" className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  {t('common.reportBuilder.certified')}
                </Badge>
              )}
              {governance.category && (
                <Badge variant="outline" className="rounded-md border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  {governance.category}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runPreview(viewerParameterValues)}
            disabled={ui.previewLoading}
            className="rounded-xl h-10 border-slate-200 dark:border-white/10 font-bold hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <RefreshCw className={cn('mr-2 size-4 text-indigo-500', ui.previewLoading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>

          <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
            <Button variant="ghost" size="sm" onClick={exportCurrentWidgetCsv} disabled={!preview.columns.length} className="rounded-lg h-8 px-3 font-bold text-xs uppercase">
              <Download className="mr-2 size-3.5 text-slate-500" />
              {t('common.reportBuilder.exportCurrentCsv')}
            </Button>
            <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
            <Button variant="ghost" size="sm" onClick={exportAllWidgetsCsv} disabled={widgetCount === 0} className="rounded-lg h-8 px-3 font-bold text-xs uppercase">
              <Download className="mr-2 size-3.5 text-slate-500" />
              {t('common.reportBuilder.exportAllCsv')}
            </Button>
            <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
            <Button variant="ghost" size="sm" onClick={exportDefinitionJson} className="rounded-lg h-8 px-3 font-bold text-xs uppercase">
              <FileJson className="mr-2 size-3.5 text-slate-500" />
              {t('common.reportBuilder.exportDefinition')}
            </Button>
          </div>

          {!isMyReportsView && meta.canManage !== false && (
            <Button
              size="sm"
              onClick={() => navigate(`/reports/${reportId}/edit`)}
              className="rounded-xl text-white h-10 px-6 font-bold bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 border-0 shadow-lg shadow-pink-500/20 transition-all hover:scale-105
              opacity-50 grayscale-[0] dark:opacity-100 dark:grayscale-0"
            >
              <Pencil className="mr-2 size-4" />
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      <StatRibbon
        items={[
          { icon: Activity, label: t('common.status'), value: statusLabel, accent: 'indigo' },
          { icon: Tag, label: t('common.reportBuilder.version'), value: `v${lifecycle.version}`, accent: 'violet' },
          { icon: Users, label: t('common.reportBuilder.owner'), value: governance.owner ?? '-', accent: 'emerald' },
          { icon: ShieldCheck, label: t('common.reportBuilder.audience'), value: audienceLabel, accent: 'amber' },
          { icon: RefreshCw, label: t('common.refresh'), value: refreshCadenceLabel, accent: 'pink' },
          {
            icon: BellRing,
            label: t('common.reportBuilder.subscription'),
            value: governance.subscriptionEnabled
              ? `${subscriptionFrequencyLabel} / ${subscriptionChannelLabel}`
              : t('common.reportBuilder.off'),
            accent: 'sky',
          },
        ]}
      />

      {(reportWidgetTotal > 0 || viewerEditableParameters.length > 0 || (config.filters && config.filters.length > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 shadow-sm dark:border-indigo-500/20 dark:bg-indigo-500/10">
              <LayoutGrid className="size-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {t('common.reportBuilder.canvasLayoutTitle')}
              </div>
              <div className="text-[11px] font-medium text-slate-400">
                {t('common.reportBuilder.canvasLayoutHint')}
              </div>
            </div>
            {reportWidgetTotal > 0 && (
              <div className="ml-2 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {t('common.reportBuilder.canvasColsLabel')}
                  </span>
                  <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white/80 p-1 shadow-inner dark:border-white/10 dark:bg-white/5">
                    {COL_OPTIONS.map((cols) => {
                      const isActive = maxCols === cols;
                      const enabled = isActive || isCanvasSizeAvailable(cols, maxRows);
                      return (
                        <button
                          key={`cols-${cols}`}
                          type="button"
                          onClick={() => enabled && handleSetMaxCols(cols)}
                          disabled={!enabled}
                          aria-pressed={isActive}
                          aria-disabled={!enabled}
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
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {t('common.reportBuilder.canvasRowsLabel')}
                  </span>
                  <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white/80 p-1 shadow-inner dark:border-white/10 dark:bg-white/5">
                    {ROW_OPTIONS.map((rows) => {
                      const isActive = maxRows === rows;
                      const enabled = isActive || isCanvasSizeAvailable(maxCols, rows);
                      return (
                        <button
                          key={`rows-${rows}`}
                          type="button"
                          onClick={() => enabled && handleSetMaxRows(rows)}
                          disabled={!enabled}
                          aria-pressed={isActive}
                          aria-disabled={!enabled}
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
            )}
          </div>
          <div className="flex items-center gap-2">
            {(config.filters && config.filters.length > 0) || viewerEditableParameters.length > 0 ? (
              <span className="hidden items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:inline-flex">
                <Filter className="size-3" />
                {t('common.reportBuilder.runtimeFilters')}
              </span>
            ) : null}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border-slate-200 px-4 font-bold text-xs uppercase tracking-wider dark:border-white/10"
                >
                  <Settings2 className="mr-2 size-3.5 text-indigo-500" />
                  {t('common.reportBuilder.runtimeFilters')}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                className="w-[min(640px,90vw)] rounded-2xl border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#120D19]/95"
              >
                <div className="space-y-4">
                  {viewerEditableParameters.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Settings2 className="size-4 text-indigo-500" />
                        <h3 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-white">
                          {t('common.reportBuilder.viewerParametersTitle')}
                        </h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {viewerEditableParameters.map((parameter) => (
                          <div key={parameter.name} className="grid gap-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                              {parameter.viewerLabel || parameter.name}
                            </Label>
                            <Input
                              value={viewerParameterValues[parameter.name] ?? ''}
                              onChange={(e) =>
                                setViewerParameterValues((current) => ({
                                  ...current,
                                  [parameter.name]: e.target.value,
                                }))
                              }
                              className="h-9 rounded-lg border-slate-200 bg-white text-sm dark:border-white/10 dark:bg-white/5"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
                    <RuntimeFiltersPanel
                      schema={schema}
                      loading={ui.previewLoading}
                      onApply={async () => {
                        await runPreview(viewerParameterValues);
                        await runAllWidgetPreviews(viewerParameterValues);
                        setFiltersOpen(false);
                      }}
                      onReset={loadReport}
                    />
                  </Suspense>

                  {viewerEditableParameters.length > 0 && (
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!hasViewerParameterChanges}
                        className="h-9 rounded-lg font-bold"
                        onClick={() => setViewerParameterValues(initialViewerParameterValues)}
                      >
                        {t('common.reset')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!hasViewerParameterChanges}
                        className="h-9 rounded-lg bg-indigo-600 font-bold text-white hover:bg-indigo-500"
                        onClick={async () => {
                          await runPreview(viewerParameterValues);
                          await runAllWidgetPreviews(viewerParameterValues);
                          setFiltersOpen(false);
                        }}
                      >
                        {t('common.reportBuilder.applyViewerParameters')}
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {reportWidgetTotal > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetLayout}
                className="h-9 rounded-xl px-3 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 dark:text-slate-400"
                title={t('common.reportBuilder.resetMyDashboard') as string}
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                {t('common.reset')}
              </Button>
            )}
          </div>
        </div>
      )}

      {reportWidgetTotal === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300/80 bg-white/60 p-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
          <BarChart3 className="size-12 text-slate-300" />
          <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-500">
            {t('common.reportBuilder.previewEmptyTitle')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedWidgets.map((section, sectionIndex) => (
            <div key={section.label || `section-${sectionIndex}`} className="space-y-4">
              {section.label ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-5 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <BarChart3 className="size-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="text-sm font-black tracking-wide text-slate-800 dark:text-white">{section.label}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {t('common.reportBuilder.sectionWidgetCount', { count: section.widgets.length })}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-md border-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:border-white/10">
                    {t('common.reportBuilder.sectionBadge')}
                  </Badge>
                </div>
              ) : null}

              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={section.widgets.map((widget) => widget.id)} strategy={rectSortingStrategy}>
                  <div
                    data-grid-container
                    className="grid gap-5"
                    style={{
                      gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${maxRows}, ${ROW_HEIGHT_PX}px)`,
                      gridAutoRows: `${ROW_HEIGHT_PX}px`,
                      gridAutoFlow: 'row dense',
                      alignItems: 'stretch',
                    }}
                  >
                    {section.widgets.map((widget) => {
                      const widgetPreview = widgetPreviews[widget.id];
                      const widgetIndex = orderedWidgets.findIndex((item) => item.id === widget.id);
                      const isPrimaryWidget = widget.id === config.activeWidgetId || widgetIndex === 0;
                      const layoutItem = widgetLayouts[widget.id] ?? {
                        colSpan: defaultColSpanFor(widget.size, maxCols),
                        rowSpan: clamp(defaultRowSpanFor(widget.height), 1, maxRows),
                      };
                      const widgetTitle = widget.title || t('common.reportBuilder.widgetTitleFallback', { index: widgetIndex + 1 });
                      const widgetSubtitle = widget.appearance?.subtitle ||
                        (isPrimaryWidget
                          ? t('common.reportBuilder.primaryWidgetPreview')
                          : t('common.reportBuilder.additionalWidgetPreview'));
                      return (
                        <SortableWidgetCard
                          key={widget.id}
                          widgetId={widget.id}
                          maxCols={maxCols}
                          maxRows={maxRows}
                          layout={layoutItem}
                        >
                          <DeferOnView
                            className="h-full w-full"
                            fallback={<Skeleton className="h-full w-full rounded-2xl" />}
                          >
                            <Suspense fallback={<Skeleton className="h-full w-full rounded-2xl" />}>
                              <PreviewPanel
                                columns={isPrimaryWidget ? preview.columns : widgetPreview?.columns ?? []}
                                rows={isPrimaryWidget ? preview.rows : widgetPreview?.rows ?? []}
                                chartType={isPrimaryWidget ? config.chartType : widget.chartType}
                                loading={isPrimaryWidget ? ui.previewLoading : widgetPreview?.loading ?? false}
                                error={isPrimaryWidget ? ui.error : widgetPreview?.error ?? null}
                                empty={isPrimaryWidget ? false : !(widgetPreview?.columns?.length || widgetPreview?.rows?.length)}
                                title={widgetTitle}
                                subtitle={widgetSubtitle}
                                appearance={widget.appearance}
                                labelOverrides={buildWidgetLabelOverrides(widget)}
                                className="h-full w-full !min-h-0"
                                minHeightClassName=""
                                headerActions={
                                  <WidgetSizePopover
                                    layout={layoutItem}
                                    maxCols={maxCols}
                                    maxRows={maxRows}
                                    isSizeAvailable={(cols, rows) => isWidgetSizeAvailable(widget.id, cols, rows)}
                                    onChange={(next) => handleWidgetLayoutChange(widget.id, next, true)}
                                  />
                                }
                              />
                            </Suspense>
                          </DeferOnView>
                        </SortableWidgetCard>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface StatRibbonItem {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: 'indigo' | 'violet' | 'emerald' | 'amber' | 'pink' | 'sky';
}

const RIBBON_ACCENT_MAP: Record<StatRibbonItem['accent'], { bg: string; ring: string; icon: string }> = {
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', ring: 'border-indigo-100 dark:border-indigo-500/20', icon: 'text-indigo-600 dark:text-indigo-400' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-500/10', ring: 'border-violet-100 dark:border-violet-500/20', icon: 'text-violet-600 dark:text-violet-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', ring: 'border-emerald-100 dark:border-emerald-500/20', icon: 'text-emerald-600 dark:text-emerald-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', ring: 'border-amber-100 dark:border-amber-500/20', icon: 'text-amber-600 dark:text-amber-400' },
  pink: { bg: 'bg-pink-50 dark:bg-pink-500/10', ring: 'border-pink-100 dark:border-pink-500/20', icon: 'text-pink-600 dark:text-pink-400' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-500/10', ring: 'border-sky-100 dark:border-sky-500/20', icon: 'text-sky-600 dark:text-sky-400' },
};

function StatRibbon({ items }: { items: StatRibbonItem[] }): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/90 bg-white/70 p-2 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => {
        const accent = RIBBON_ACCENT_MAP[item.accent];
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-slate-200/80 hover:bg-white/80 dark:hover:border-white/10 dark:hover:bg-white/5"
          >
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-inner', accent.bg, accent.ring)}>
              <Icon className={cn('size-4', accent.icon)} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[9px] font-black uppercase tracking-widest text-slate-400">
                {item.label}
              </div>
              <div className="mt-0.5 truncate text-sm font-black text-slate-800 dark:text-white" title={item.value}>
                {item.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface SortableWidgetCardProps {
  widgetId: string;
  maxCols: number;
  maxRows: number;
  layout: WidgetLayoutItem;
  children: ReactElement;
}

function SortableWidgetCard({
  widgetId,
  maxCols,
  maxRows,
  layout,
  children,
}: SortableWidgetCardProps): ReactElement {
  const { t } = useTranslation('common');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widgetId });

  const style: React.CSSProperties = {
    gridColumn: `span ${clamp(layout.colSpan, 1, maxCols)}`,
    gridRow: `span ${clamp(layout.rowSpan, 1, maxRows)}`,
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
  };

  return (
    <div
      ref={setNodeRef}
      data-widget-card
      style={style}
      className={cn(
        'group relative min-w-0',
        isDragging ? 'z-50 opacity-95 shadow-2xl ring-2 ring-indigo-400/60' : 'z-0',
      )}
    >
      <div className="h-full w-full">{children}</div>

      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        aria-label={t('common.reportBuilder.dragWidget') as string}
        title={t('common.reportBuilder.dragWidget') as string}
        className="absolute left-1/2 top-0 z-40 flex h-5 w-14 -translate-x-1/2 -translate-y-2.5 cursor-grab items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-400 shadow-md opacity-60 backdrop-blur transition-opacity duration-200 hover:text-indigo-600 group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-500"
      >
        <GripHorizontal className="size-3.5" />
      </div>
    </div>
  );
}

interface WidgetSizePopoverProps {
  layout: WidgetLayoutItem;
  maxCols: number;
  maxRows: number;
  isSizeAvailable: (cols: number, rows: number) => boolean;
  onChange: (next: WidgetLayoutItem) => void;
}

function WidgetSizePopover({ layout, maxCols, maxRows, isSizeAvailable, onChange }: WidgetSizePopoverProps): ReactElement {
  const { t } = useTranslation('common');
  const colSpan = clamp(layout.colSpan, 1, maxCols);
  const rowSpan = clamp(layout.rowSpan, 1, maxRows);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white/90 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
          title={t('common.reportBuilder.resizeBoth') as string}
        >
          <LayoutGrid className="size-3" />
          <span className="text-slate-700 dark:text-white">{colSpan}</span>
          <span className="text-slate-400">×</span>
          <span className="text-slate-700 dark:text-white">{rowSpan}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[260px] rounded-2xl border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#120D19]/95"
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {t('common.reportBuilder.resizeWidth')}
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-600 dark:bg-white/5 dark:text-slate-300">
                {colSpan} / {maxCols}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: maxCols }, (_, idx) => idx + 1).map((value) => {
                const isActive = colSpan === value;
                const enabled = isActive || isSizeAvailable(value, rowSpan);
                return (
                  <button
                    key={`col-${value}`}
                    type="button"
                    onClick={() => enabled && onChange({ colSpan: value, rowSpan })}
                    disabled={!enabled}
                    title={enabled ? undefined : (t('common.reportBuilder.resizeUnavailable') as string)}
                    className={cn(
                      'h-9 rounded-lg border text-xs font-black transition-all',
                      isActive
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                        : enabled
                          ? 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                          : 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-300 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-600',
                    )}
                    aria-pressed={isActive}
                    aria-disabled={!enabled}
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
                {rowSpan} / {maxRows}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: maxRows }, (_, idx) => idx + 1).map((value) => {
                const isActive = rowSpan === value;
                const enabled = isActive || isSizeAvailable(colSpan, value);
                return (
                  <button
                    key={`row-${value}`}
                    type="button"
                    onClick={() => enabled && onChange({ colSpan, rowSpan: value })}
                    disabled={!enabled}
                    title={enabled ? undefined : (t('common.reportBuilder.resizeUnavailable') as string)}
                    className={cn(
                      'h-9 rounded-lg border text-xs font-black transition-all',
                      isActive
                        ? 'border-pink-500 bg-pink-600 text-white shadow-md shadow-pink-500/30'
                        : enabled
                          ? 'border-slate-200 bg-white text-slate-600 hover:border-pink-300 hover:bg-pink-50/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                          : 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-300 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-600',
                    )}
                    aria-pressed={isActive}
                    aria-disabled={!enabled}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-[10px] font-medium text-slate-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
            {t('common.reportBuilder.resizeHint', { cols: colSpan, rows: rowSpan })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
