import { lazy, Suspense, type ReactElement } from 'react';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useReportBuilderStore } from '../store';
import { reportsApi } from '../api';
import { Badge } from '@/components/ui/badge';
import { Download, FileJson, Loader2, Pencil, RefreshCw, ChevronLeft, LayoutGrid, FileText, Settings2, BarChart3, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import type { CalculatedField, DataSourceParameterBinding, ReportPreviewResponse, ReportWidget } from '../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';
import { Skeleton } from '@/components/ui/skeleton';
import { DeferOnView } from '@/components/shared/DeferOnView';

const PreviewPanel = lazy(async () =>
  import('../components/PreviewPanel').then((mod) => ({ default: mod.PreviewPanel }))
);
const RuntimeFiltersPanel = lazy(async () =>
  import('../components/RuntimeFiltersPanel').then((mod) => ({ default: mod.RuntimeFiltersPanel }))
);

function getWidgetPanelClass(widget: ReportWidget): string {
  if (widget.size === 'full') return 'xl:col-span-3';
  if (widget.size === 'half') return 'xl:col-span-2';
  return 'xl:col-span-1';
}

function getWidgetHeightClass(widget: ReportWidget): string {
  if (widget.height === 'lg') return 'min-h-[420px]';
  if (widget.height === 'sm') return 'min-h-[240px]';
  return 'min-h-[320px]';
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
  const groupedWidgets = useMemo(() => {
    const sections = new Map<string, ReportWidget[]>();
    (config.widgets ?? []).forEach((widget) => {
      const key = widget.appearance?.sectionLabel?.trim() || '__default__';
      sections.set(key, [...(sections.get(key) ?? []), widget]);
    });
    return Array.from(sections.entries()).map(([label, widgets]) => ({
      label: label === '__default__' ? '' : label,
      description: widgets.find((widget) => widget.appearance?.sectionDescription?.trim())?.appearance?.sectionDescription?.trim() ?? '',
      widgets,
    }));
  }, [config.widgets]);

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
    <div className="w-full px-6 pt-0 pb-8 space-y-6 animate-in fade-in duration-500">
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

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-white/5 shadow-inner border border-indigo-200 dark:border-white/10 relative overflow-hidden group">
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

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          {viewerEditableParameters.length > 0 && (
            <Card className="rounded-2xl border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] shadow-sm overflow-hidden">
              <div className="px-5 pt-3 pb-2.5 border-b border-slate-100 dark:border-white/5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 shadow-sm transition-transform group-hover:scale-105">
                  <Settings2 className="size-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-base font-bold text-slate-800 dark:text-white">
                  {t('common.reportBuilder.viewerParametersTitle')}
                </span>
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="space-y-4">
                  {viewerEditableParameters.map((parameter) => (
                    <div key={parameter.name} className="grid gap-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{parameter.viewerLabel || parameter.name}</Label>
                      <Input
                        value={viewerParameterValues[parameter.name] ?? ''}
                        onChange={(e) =>
                          setViewerParameterValues((current) => ({
                            ...current,
                            [parameter.name]: e.target.value,
                          }))
                        }
                        className="rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus-visible:ring-indigo-500/30"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    type="button"
                    variant={hasViewerParameterChanges ? 'default' : 'outline'}
                    disabled={!hasViewerParameterChanges}
                    className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    onClick={async () => {
                      await runPreview(viewerParameterValues);
                      await runAllWidgetPreviews(viewerParameterValues);
                    }}
                  >
                    {t('common.reportBuilder.applyViewerParameters')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!hasViewerParameterChanges}
                    className="rounded-xl font-bold border-slate-200 dark:border-white/10"
                    onClick={() => setViewerParameterValues(initialViewerParameterValues)}
                  >
                    {t('common.reset')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Suspense fallback={<Skeleton className="h-40 w-full rounded-2xl" />}>
            <RuntimeFiltersPanel
              schema={schema}
              loading={ui.previewLoading}
              onApply={async () => {
                await runPreview(viewerParameterValues);
                await runAllWidgetPreviews(viewerParameterValues);
              }}
              onReset={loadReport}
            />
          </Suspense>

          <Card className="rounded-2xl border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] shadow-sm overflow-hidden">
            <div className="px-5 pt-3 pb-2.5 border-b border-slate-100 dark:border-white/5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 dark:bg-pink-500/10 border border-pink-100 dark:border-pink-500/20 shadow-sm transition-transform group-hover:scale-105">
                <FileText className="size-4 text-pink-600 dark:text-pink-400" />
              </div>
              <span className="text-base font-bold text-slate-800 dark:text-white">
                {t('common.reportBuilder.reportSummary')}
              </span>
            </div>
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20 font-bold px-2 py-0.5 text-[10px] uppercase">
                  {t(`common.reportBuilder.chartTypes.${config.chartType}`)}
                </Badge>
                <Badge variant="secondary" className="rounded-md bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-500/20 font-bold px-2 py-0.5 text-[10px] uppercase">
                  {t('common.reportBuilder.widgetCountBadge', { count: widgetCount })}
                </Badge>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: t('common.status'), value: statusLabel, color: 'text-slate-900 dark:text-white font-black uppercase' },
                  { label: t('common.reportBuilder.version'), value: `v${lifecycle.version}`, color: 'text-slate-700 dark:text-slate-300 font-bold' },
                  { label: t('common.reportBuilder.owner'), value: governance.owner ?? '-', color: 'text-slate-700 dark:text-slate-300 font-bold' },
                  { label: t('common.reportBuilder.audience'), value: audienceLabel, color: 'text-slate-700 dark:text-slate-300 font-bold' },
                  { label: t('common.refresh'), value: refreshCadenceLabel, color: 'text-slate-700 dark:text-slate-300 font-bold' },
                  { label: t('common.reportBuilder.subscription'), value: governance.subscriptionEnabled ? `${subscriptionFrequencyLabel} / ${subscriptionChannelLabel}` : t('common.reportBuilder.off'), color: 'text-slate-700 dark:text-slate-300 font-bold text-xs' },
                ].map((row, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-slate-400 uppercase tracking-widest">{row.label}</span>
                    <span className={cn("text-right", row.color)}>{row.value}</span>
                  </div>
                ))}
              </div>

              {lifecycle.releaseNote && (
                <div className="rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 p-3 text-[11px]">
                  <div className="mb-1 font-black text-slate-400 uppercase tracking-widest">{t('common.reportBuilder.releaseNote')}</div>
                  <div className="text-slate-600 dark:text-slate-400 font-bold ">"{lifecycle.releaseNote}"</div>
                </div>
              )}

              {governance.sharedWith && governance.sharedWith.length > 0 && (
                <div className="rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 p-3 text-[11px]">
                  <div className="mb-2 font-black text-slate-400 uppercase tracking-widest">{t('common.reportBuilder.sharedWith')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {governance.sharedWith.map((item) => (
                      <Badge key={item} variant="outline" className="rounded-md border-slate-200 dark:border-white/10 text-slate-500 px-1.5 py-0.5 text-[9px] font-bold uppercase">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {groupedWidgets.map((section, sectionIndex) => (
            <div key={section.label || `section-${sectionIndex}`} className="space-y-4">
              {section.label ? (
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] px-5 py-3 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
                      <BarChart3 className="size-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-800 dark:text-white tracking-wide">{section.label}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.reportBuilder.sectionWidgetCount', { count: section.widgets.length })}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-md border-slate-200 dark:border-white/10 text-slate-400 font-bold px-2 py-0.5 text-[9px] uppercase tracking-wider">{t('common.reportBuilder.sectionBadge')}</Badge>
                </div>
              ) : null}
              <div className="grid gap-4 xl:grid-cols-3">
                {section.widgets.map((widget) => {
                  const widgetPreview = widgetPreviews[widget.id];
                  const widgetIndex = (config.widgets ?? []).findIndex((item) => item.id === widget.id);
                  const isPrimaryWidget = widget.id === config.activeWidgetId || widgetIndex === 0;
                  const panelClassName = getWidgetPanelClass(widget);
                  const minHeightClassName = getWidgetHeightClass(widget);
                  if (isPrimaryWidget) {
                    return (
                      <DeferOnView
                        key={widget.id}
                        fallback={<Skeleton className={cn('w-full rounded-2xl', panelClassName, minHeightClassName)} />}
                      >
                        <Suspense fallback={<Skeleton className={cn('w-full rounded-2xl', panelClassName, minHeightClassName)} />}>
                          <PreviewPanel
                            columns={preview.columns}
                            rows={preview.rows}
                            chartType={config.chartType}
                            loading={ui.previewLoading}
                            error={ui.error}
                            empty={false}
                            title={widget.title || t('common.reportBuilder.widgetTitleFallback', { index: widgetIndex + 1 })}
                            subtitle={widget.appearance?.subtitle || t('common.reportBuilder.primaryWidgetPreview')}
                            appearance={widget.appearance}
                            labelOverrides={buildWidgetLabelOverrides(widget)}
                            className={panelClassName}
                            minHeightClassName={minHeightClassName}
                          />
                        </Suspense>
                      </DeferOnView>
                    );
                  }
                  return (
                    <DeferOnView
                      key={widget.id}
                      fallback={<Skeleton className={cn('w-full rounded-2xl', panelClassName, minHeightClassName)} />}
                    >
                      <Suspense fallback={<Skeleton className={cn('w-full rounded-2xl', panelClassName, minHeightClassName)} />}>
                        <PreviewPanel
                          columns={widgetPreview?.columns ?? []}
                          rows={widgetPreview?.rows ?? []}
                          chartType={widget.chartType}
                          loading={widgetPreview?.loading ?? false}
                          error={widgetPreview?.error ?? null}
                          empty={!(widgetPreview?.columns?.length || widgetPreview?.rows?.length)}
                          title={widget.title || t('common.reportBuilder.widgetTitleFallback', { index: widgetIndex + 1 })}
                          subtitle={widget.appearance?.subtitle || t('common.reportBuilder.additionalWidgetPreview')}
                          appearance={widget.appearance}
                          labelOverrides={buildWidgetLabelOverrides(widget)}
                          className={panelClassName}
                          minHeightClassName={minHeightClassName}
                        />
                      </Suspense>
                    </DeferOnView>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
