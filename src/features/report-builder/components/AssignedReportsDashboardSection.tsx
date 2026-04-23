import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Rnd, type RndDragCallback, type RndResizeCallback } from 'react-rnd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, LayoutGrid, Plus, RefreshCw, Trash2 } from 'lucide-react';
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

interface DashboardChoice {
  reportId: number;
  reportName: string;
  widgetId?: string;
  widgetTitle: string;
  subtitle?: string;
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

function getSelectableChoices(report: ReportDto, t: (key: string) => string): DashboardChoice[] {
  const config = parseReportConfig(report.configJson);
  const widgets = config?.widgets ?? [];
  if (widgets.length === 0) {
    const fallbackType = config?.chartType ? t(`common.reportBuilder.chartTypes.${config.chartType}`) : t('common.reportBuilder.dashboardItemTypes.report');
    return [
      {
        reportId: report.id,
        reportName: report.name,
        widgetTitle: fallbackType,
        subtitle: report.description || report.dataSourceName,
      },
    ];
  }

  return [
    {
      reportId: report.id,
      reportName: report.name,
      widgetTitle: t('common.reportBuilder.dashboardItemTypes.dashboard'),
      subtitle: report.description || report.dataSourceName,
    },
    ...widgets.map((widget, index) => ({
      reportId: report.id,
      reportName: report.name,
      widgetId: widget.id,
      widgetTitle: widget.title?.trim() || `${report.name} ${index + 1}`,
      subtitle: widget.appearance?.subtitle?.trim() || report.description || report.dataSourceName,
    })),
  ];
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
}: {
  report: ReportDto;
  widget?: ReportWidget;
  title: string;
  minHeightClassName?: string;
}): ReactElement {
  const { t } = useTranslation('common');
  const currentUser = useAuthStore((state) => state.user);
  const [preview, setPreview] = useState<ReportPreviewResponse>({ columns: [], rows: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => parseReportConfig(report.configJson), [report.configJson]);
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
      className="h-full"
      minHeightClassName={minHeightClassName}
    />
  );
}

function DashboardWidgetPreviewContent({
  item,
  report,
}: {
  item: MyReportDashboardItem;
  report: ReportDto;
}): ReactElement {
  const { t } = useTranslation('common');
  const config = useMemo(() => parseReportConfig(report.configJson), [report.configJson]);
  const widgets = config?.widgets ?? [];
  const selectedWidget = widgets.find((widget) => widget.id === item.widgetId);
  const isDashboardView = !item.widgetId && widgets.length > 0;

  if (isDashboardView) {
    const previewWidgets = widgets.slice(0, 4);
    return (
      <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-background/95 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{report.name}</p>
            <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.dashboardItemTypes.dashboard')}</p>
          </div>
          <Badge variant="outline">{previewWidgets.length} / {widgets.length}</Badge>
        </div>
        <div className={cn('grid flex-1 gap-3', previewWidgets.length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2')}>
          {previewWidgets.map((widget) => (
            <CompactWidgetPreview
              key={widget.id}
              report={report}
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
      report={report}
      widget={selectedWidget}
      title={item.widgetTitle || selectedWidget?.title?.trim() || report.name}
      minHeightClassName="min-h-[220px]"
    />
  );
}

function DashboardReportWidget({
  item,
  report,
  onRemove,
}: {
  item: MyReportDashboardItem;
  report: ReportDto;
  onRemove: () => void;
}): ReactElement {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <div className="group relative h-full">
      <div className="absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-2">
          <Badge variant="secondary" className="max-w-[180px] truncate bg-background/90 backdrop-blur">
            {report.name}
          </Badge>
          {item.widgetTitle && item.widgetTitle !== report.name ? (
            <Badge variant="outline" className="max-w-[180px] truncate bg-background/90 backdrop-blur">
              {item.widgetTitle}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
          <Button size="icon-sm" variant="secondary" onClick={() => navigate(`/reports/my/${report.id}`)} title={t('common.reportBuilder.openReport')}>
            <ExternalLink className="size-4" />
          </Button>
          <Button size="icon-sm" variant="destructive" onClick={onRemove} title={t('common.remove')}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <DeferOnView fallback={<Skeleton className="h-full min-h-[220px] w-full rounded-2xl" />}>
        <DashboardWidgetPreviewContent item={item} report={report} />
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
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const reportMap = useMemo(() => new Map(reports.map((report) => [report.id, report])), [reports]);
  const allowedReportIds = useMemo(() => reports.map((report) => report.id), [reports]);

  useEffect(() => {
    if (!userId) {
      setIsHydrated(false);
      return;
    }
    const stored = loadMyDashboardLayout(userId);
    setLayout(sanitizeMyDashboardLayout(stored, allowedReportIds));
    setIsHydrated(true);
  }, [allowedReportIds, userId]);

  useEffect(() => {
    if (!userId || !isHydrated) return;
    saveMyDashboardLayout(userId, layout);
  }, [isHydrated, layout, userId]);

  const placedKeys = useMemo(() => new Set(layout.items.map(getItemKey)), [layout.items]);
  const choices = useMemo(
    () =>
      reports
        .flatMap((report) => getSelectableChoices(report, t))
        .filter((choice) => !placedKeys.has(`${choice.reportId}:${choice.widgetId ?? '__report__'}`)),
    [placedKeys, reports, t],
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
    setPickerOpen(false);
  };

  const handleRemoveItem = (item: MyReportDashboardItem): void => {
    const nextKey = getItemKey(item);
    updateItems((items) => items.filter((current) => getItemKey(current) !== nextKey));
    setSelectedItemKey((current) => (current === nextKey ? null : current));
  };

  const handleReset = (): void => {
    setLayout({ version: 1, updatedAt: new Date().toISOString(), items: [] });
    setSelectedItemKey(null);
  };

  const handleDragStop: RndDragCallback = (_event, data) => {
    const itemKey = String(data.node.dataset.itemKey ?? '');
    updateItems((items) => items.map((item) => (getItemKey(item) === itemKey ? { ...item, x: data.x, y: data.y } : item)));
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
  };

  return (
    <>
      <Card className="border-2 border-slate-300/75 bg-stone-50/90 shadow-md shadow-slate-900/[0.05] dark:border-white/10 dark:bg-[#120c18]">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
              <LayoutGrid className="size-5 text-pink-600 dark:text-pink-400" />
              {t('common.reportBuilder.dashboardHomeTitle')}
            </CardTitle>
            <CardDescription>{t('common.reportBuilder.dashboardHomeDescription')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPickerOpen(true)} disabled={isLoading || choices.length === 0}>
              <Plus className="mr-2 size-4" />
              {t('common.reportBuilder.addReportsToDashboard')}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={layout.items.length === 0}>
              <RefreshCw className="mr-2 size-4" />
              {t('common.reportBuilder.resetMyDashboard')}
            </Button>
            <Button variant="outline" onClick={() => navigate('/reports/my')}>
              {t('common.reportBuilder.goToMyReports')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
              className="relative overflow-auto rounded-2xl border border-dashed border-border/70 bg-[linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.14)_1px,transparent_1px)] bg-[size:24px_24px] p-3"
              style={{ minHeight: 720 }}
            >
              <div className="relative min-h-[680px]" style={{ width: DASHBOARD_CANVAS_WIDTH }}>
                {layout.items.map((item) => {
                  const report = reportMap.get(item.reportId);
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
                      dragGrid={[DASHBOARD_GRID_SIZE, DASHBOARD_GRID_SIZE]}
                      resizeGrid={[DASHBOARD_GRID_SIZE, DASHBOARD_GRID_SIZE]}
                      onDragStart={() => setSelectedItemKey(itemKey)}
                      onResizeStart={() => setSelectedItemKey(itemKey)}
                      onDragStop={handleDragStop}
                      onResizeStop={handleResizeStop}
                      data-item-key={itemKey}
                      className={cn(selectedItemKey === itemKey ? 'z-20' : 'z-10')}
                    >
                      <DashboardReportWidget item={item} report={report} onRemove={() => handleRemoveItem(item)} />
                    </Rnd>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('common.reportBuilder.addReportsToDashboard')}</DialogTitle>
            <DialogDescription>{t('common.reportBuilder.dashboardPickerDescription')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
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
                <div key={reportId} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <div className="mb-3">
                    <p className="font-semibold">{group[0]?.reportName}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{reportMap.get(reportId)?.description || reportMap.get(reportId)?.dataSourceName}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.map((choice) => (
                      <button
                        key={`${choice.reportId}:${choice.widgetId ?? '__report__'}`}
                        type="button"
                        onClick={() => handleAddChoice(choice)}
                        className="rounded-xl border border-border/70 bg-muted/10 p-4 text-left transition hover:border-pink-400/50 hover:bg-pink-50/50 dark:hover:bg-pink-500/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{choice.widgetTitle}</p>
                            <p className="text-muted-foreground mt-1 text-xs">{choice.subtitle}</p>
                          </div>
                          <Plus className="mt-0.5 size-4 text-pink-600 dark:text-pink-400" />
                        </div>
                      </button>
                    ))}
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
