import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Rnd, type RndDragCallback, type RndResizeCallback } from 'react-rnd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ExternalLink, LayoutGrid, PencilRuler, Plus, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
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
  DASHBOARD_CANVAS_WIDTH,
  DASHBOARD_GRID_SIZE,
  DASHBOARD_ITEM_MIN_HEIGHT,
  DASHBOARD_ITEM_MIN_WIDTH,
  createDashboardItem,
  loadMyDashboardLayout,
  sanitizeMyDashboardLayout,
  saveMyDashboardLayout,
} from '../utils';
import { reportBuilderQueryKeys, REPORTS_LIST_STALE_TIME_MS } from '../utils/query-keys';

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

  return [
    {
      reportId: report.id,
      reportName,
      reportSubtitle,
      widgetTitle: t('common.reportBuilder.dashboardItemTypes.dashboard'),
      subtitle: reportSubtitle,
      kind: 'dashboard',
    },
    ...widgets.map((widget, index) => ({
      reportId: report.id,
      reportName,
      reportSubtitle,
      widgetId: widget.id,
      widgetTitle: widget.title?.trim() || `${reportName} ${index + 1}`,
      subtitle: widget.appearance?.subtitle?.trim() || reportSubtitle,
      chartType: widget.chartType,
      kind: 'widget' as const,
    })),
  ];
}

function getChartTypeLabel(chartType: string | undefined, t: (key: string) => string): string {
  if (!chartType) return t('common.reportBuilder.dashboardItemTypes.widget');
  const translationKey = `common.reportBuilder.chartTypes.${chartType}`;
  const translated = t(translationKey);
  return translated === translationKey ? chartType : translated;
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
}: {
  report: ReportDto;
  widget?: ReportWidget;
  title: string;
  minHeightClassName?: string;
  headerActions?: ReactElement;
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

  return (
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
      headerActions={headerActions}
      className="h-full"
      minHeightClassName={minHeightClassName}
    />
  );
}

function DashboardWidgetPreviewContent({
  item,
  report,
  editable,
  onRemove,
}: {
  item: MyReportDashboardItem;
  report: ReportDto;
  editable: boolean;
  onRemove: () => void;
}): ReactElement {
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

  if (isDashboardView) {
    const previewWidgets = widgets.slice(0, 4);
    return (
      <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-background/95 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{report.name}</p>
            <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.dashboardItemTypes.dashboard')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{previewWidgets.length} / {widgets.length}</Badge>
            <Button size="icon-sm" variant="secondary" onClick={() => navigate(`/reports/my/${report.id}`)} title={t('common.reportBuilder.openReport')}>
              <ExternalLink className="size-4" />
            </Button>
            {editable ? (
              <Button size="icon-sm" variant="destructive" onClick={onRemove} title={t('common.remove')}>
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
        <div className={cn('grid flex-1 gap-3', previewWidgets.length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2')}>
          {previewWidgets.map((widget) => (
            <CompactWidgetPreview
              key={widget.id}
              report={fullReport}
              widget={widget}
              title={widget.title?.trim() || t('common.reportBuilder.dashboardItemTypes.widget')}
              minHeightClassName="min-h-[180px]"
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
      minHeightClassName="min-h-[220px]"
      headerActions={
        <>
          <Button size="icon-sm" variant="secondary" onClick={() => navigate(`/reports/my/${report.id}`)} title={t('common.reportBuilder.openReport')}>
            <ExternalLink className="size-4" />
          </Button>
          {editable ? (
            <Button size="icon-sm" variant="destructive" onClick={onRemove} title={t('common.remove')}>
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </>
      }
    />
  );
}

function DashboardReportWidget({
  item,
  report,
  editable,
  onRemove,
}: {
  item: MyReportDashboardItem;
  report: ReportDto;
  editable: boolean;
  onRemove: () => void;
}): ReactElement {
  return (
    <div className="h-full">
      <DeferOnView fallback={<Skeleton className="h-full min-h-[220px] w-full rounded-2xl" />}>
        <DashboardWidgetPreviewContent item={item} report={report} editable={editable} onRemove={onRemove} />
      </DeferOnView>
    </div>
  );
}

export function AssignedReportsDashboardSection(): ReactElement {
  const { t } = useTranslation('common');
  const userId = useAuthStore((state) => state.user?.id);
  const navigate = useNavigate();
  const { data: reports = [], isLoading, error } = useReportsList(undefined, 'assigned');
  const [layout, setLayout] = useState<MyReportDashboardLayout>({ version: 1, updatedAt: new Date().toISOString(), items: [] });
  const [savedLayout, setSavedLayout] = useState<MyReportDashboardLayout>({ version: 1, updatedAt: new Date().toISOString(), items: [] });
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [isEditMode, setIsEditMode] = useState(false);

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

  useEffect(() => {
    if (!userId) {
      setIsHydrated(false);
      return;
    }
    const stored = loadMyDashboardLayout(userId);
    const sanitized = sanitizeMyDashboardLayout(stored, allowedReportIds);
    setLayout(sanitized);
    setSavedLayout(sanitized);
    setSaveState('idle');
    setIsHydrated(true);
  }, [allowedReportIds, userId]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timer = window.setTimeout(() => setSaveState('idle'), 2200);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  const placedKeys = useMemo(() => new Set(layout.items.map(getItemKey)), [layout.items]);
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(layout.items) !== JSON.stringify(savedLayout.items),
    [layout.items, savedLayout.items],
  );
  const choices = useMemo(
    () =>
      reportsWithDetails
        .flatMap((report) => getSelectableChoices(report, t))
        .filter((choice) => choice.reportId > 0 && choice.reportName.trim().length > 0)
        .filter((choice) => !placedKeys.has(`${choice.reportId}:${choice.widgetId ?? '__report__'}`)),
    [placedKeys, reportsWithDetails, t],
  );
  const updateItems = (updater: (items: MyReportDashboardItem[]) => MyReportDashboardItem[]): void => {
    setLayout((current) => ({
      version: 1,
      updatedAt: new Date().toISOString(),
      items: updater([...current.items]).map((item, index) => ({ ...item, order: index })),
    }));
  };

  const handleAddChoice = (choice: DashboardChoice): void => {
    updateItems((items) => [
      ...items,
      createDashboardItem(choice.reportId, items, {
        widgetId: choice.widgetId,
        widgetTitle: choice.widgetTitle,
      }),
    ]);
    setSelectedItemKey(`${choice.reportId}:${choice.widgetId ?? '__report__'}`);
    setIsEditMode(true);
    setPickerOpen(false);
  };

  const handleRemoveItem = (item: MyReportDashboardItem): void => {
    const nextKey = getItemKey(item);
    updateItems((items) => items.filter((current) => getItemKey(current) !== nextKey));
    setSelectedItemKey((current) => (current === nextKey ? null : current));
    setIsEditMode(true);
  };

  const handleReset = (): void => {
    setLayout({ version: 1, updatedAt: new Date().toISOString(), items: [] });
    setSelectedItemKey(null);
    setSaveState('idle');
    setIsEditMode(true);
  };

  const handleSaveLayout = (): void => {
    if (!userId) return;
    const nextLayout: MyReportDashboardLayout = {
      version: 1,
      updatedAt: new Date().toISOString(),
      items: layout.items,
    };
    saveMyDashboardLayout(userId, nextLayout);
    setLayout(nextLayout);
    setSavedLayout(nextLayout);
    setSaveState('saved');
    setIsEditMode(false);
    setSelectedItemKey(null);
  };

  const handleDragStop: RndDragCallback = (_event, data) => {
    const itemKey = String(data.node.dataset.itemKey ?? '');
    updateItems((items) => items.map((item) => (getItemKey(item) === itemKey ? { ...item, x: data.x, y: data.y } : item)));
    setIsEditMode(true);
  };

  const handleResizeStop: RndResizeCallback = (_event, _direction, ref, _delta, position) => {
    const itemKey = String(ref.dataset.itemKey ?? '');
    updateItems((items) =>
      items.map((item) =>
        getItemKey(item) === itemKey
          ? {
              ...item,
              x: position.x,
              y: position.y,
              w: ref.offsetWidth,
              h: ref.offsetHeight,
            }
          : item,
      ),
    );
    setIsEditMode(true);
  };

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
            <Button variant="outline" onClick={() => setPickerOpen(true)} disabled={isLoading || choices.length === 0}>
              <Plus className="mr-2 size-4" />
              {t('common.reportBuilder.addReportsToDashboard')}
            </Button>
            <Button variant={isEditMode ? 'secondary' : 'outline'} onClick={() => setIsEditMode((current) => !current)} disabled={layout.items.length === 0}>
              <PencilRuler className="mr-2 size-4" />
              {isEditMode ? t('common.reportBuilder.finishEditingLayout') : t('common.reportBuilder.editLayout')}
            </Button>
            <Button onClick={handleSaveLayout} disabled={!isHydrated || !hasUnsavedChanges}>
              {saveState === 'saved' ? <CheckCircle2 className="mr-2 size-4" /> : <Save className="mr-2 size-4" />}
              {saveState === 'saved' ? t('common.reportBuilder.dashboardLayoutSaved') : t('common.reportBuilder.saveDashboardLayout')}
            </Button>
            <Button variant="ghost" onClick={handleReset} disabled={layout.items.length === 0}>
              <RefreshCw className="mr-2 size-4" />
              {t('common.reportBuilder.resetMyDashboard')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/reports/my')}>
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
              <Button className="mt-4" onClick={() => setPickerOpen(true)} disabled={choices.length === 0}>
                <Plus className="mr-2 size-4" />
                {t('common.reportBuilder.addReportsToDashboard')}
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "relative overflow-auto rounded-[24px] border p-4 transition-all duration-300",
                isEditMode
                  ? "border-pink-200/80 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.06),transparent_24%),linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-size-[auto,32px_32px,32px_32px]"
                  : "border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.05),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.08),transparent_20%),linear-gradient(180deg,rgba(15,23,42,0.42),rgba(15,23,42,0.20))]",
              )}
              style={{ minHeight: 720 }}
            >
              <div className="mb-4 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('common.reportBuilder.dashboardCanvasTitle')}</p>
                  <p className="text-xs text-muted-foreground">
                    {isEditMode
                      ? t('common.reportBuilder.dashboardCanvasEditingDescription')
                      : t('common.reportBuilder.dashboardCanvasSavedDescription')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isEditMode ? (
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
                      <Sparkles className="mr-1 size-3.5" />
                      {t('common.reportBuilder.editModeActive')}
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="rounded-full border-white/10 bg-background/60 px-3 py-1 text-[11px]">
                    {layout.items.length} {layout.items.length === 1 ? t('common.reportBuilder.dashboardItemTypes.widget') : t('common.reportBuilder.dashboardCanvasItemsBadge')}
                  </Badge>
                </div>
              </div>
              {!isEditMode ? (
                <div className="mb-4 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {t('common.reportBuilder.dashboardSavedViewHint')}
                </div>
              ) : null}
              <div className="relative min-h-[680px]" style={{ width: DASHBOARD_CANVAS_WIDTH }}>
                {layout.items.map((item) => {
                  const report = detailedReportMap.get(item.reportId) ?? reportMap.get(item.reportId);
                  if (!report) return null;
                  const itemKey = getItemKey(item);

                  return (
                    <Rnd
                      key={itemKey}
                      size={{ width: item.w, height: item.h }}
                      position={{ x: item.x, y: item.y }}
                      minWidth={DASHBOARD_ITEM_MIN_WIDTH}
                      minHeight={DASHBOARD_ITEM_MIN_HEIGHT}
                      bounds="parent"
                      disableDragging={!isEditMode}
                      enableResizing={isEditMode}
                      dragGrid={[DASHBOARD_GRID_SIZE, DASHBOARD_GRID_SIZE]}
                      resizeGrid={[DASHBOARD_GRID_SIZE, DASHBOARD_GRID_SIZE]}
                      onDragStart={() => setSelectedItemKey(itemKey)}
                      onResizeStart={() => setSelectedItemKey(itemKey)}
                      onDragStop={handleDragStop}
                      onResizeStop={handleResizeStop}
                      data-item-key={itemKey}
                      className={cn(
                        selectedItemKey === itemKey ? 'z-20' : 'z-10',
                        !isEditMode && 'transition-transform duration-200 hover:-translate-y-0.5',
                        isEditMode && 'outline outline-pink-200/70',
                      )}
                    >
                      <DashboardReportWidget item={item} report={report} editable={isEditMode} onRemove={() => handleRemoveItem(item)} />
                    </Rnd>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('common.reportBuilder.addReportsToDashboard')}</DialogTitle>
            <DialogDescription>{t('common.reportBuilder.dashboardPickerDescription')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
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
                <div key={reportId} className="rounded-2xl border border-border/70 bg-background/90 p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-base font-semibold">{group[0]?.reportName}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{group[0]?.reportSubtitle || reportMap.get(reportId)?.dataSourceName}</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-border/70 bg-muted/10 p-3.5">
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
                              className="rounded-xl border border-border/70 bg-background p-4 text-left transition hover:border-pink-400/50 hover:bg-pink-50/40 dark:hover:bg-pink-500/10"
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
                    <div className="rounded-xl border border-border/70 bg-muted/10 p-3.5">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {t('common.reportBuilder.dashboardPickerWidgetSection')}
                      </p>
                      {group.some((choice) => choice.kind === 'widget') ? (
                        <div className="grid gap-3">
                          {group.filter((choice) => choice.kind === 'widget').map((choice) => (
                            <button
                              key={`${choice.reportId}:${choice.widgetId ?? '__report__'}`}
                              type="button"
                              onClick={() => handleAddChoice(choice)}
                              className="rounded-xl border border-border/70 bg-background p-4 text-left transition hover:border-pink-400/50 hover:bg-pink-50/40 dark:hover:bg-pink-500/10"
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
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
