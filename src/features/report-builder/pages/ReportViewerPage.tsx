import type { ReactElement } from 'react';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useReportBuilderStore } from '../store';
import { reportsApi } from '../api';
import { PreviewPanel } from '../components/PreviewPanel';
import { RuntimeFiltersPanel } from '../components/RuntimeFiltersPanel';
import { Badge } from '@/components/ui/badge';
import { Download, FileJson, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import type { CalculatedField, DataSourceParameterBinding, ReportPreviewResponse, ReportWidget } from '../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';

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
  const { t, i18n } = useTranslation('common');
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
  const accessLevelLabel = meta.accessLevel && meta.accessLevel !== 'none'
    ? t(`common.reportBuilder.accessLevels.${meta.accessLevel}`)
    : null;
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
    <div className="space-y-6 p-6">
      {saveState?.justSaved ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <h2 className="text-sm font-semibold">{t('common.reportBuilder.saveSuccessTitle')}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {saveState.isEdit
                  ? t('common.reportBuilder.saveSuccessUpdatedDescription')
                  : t('common.reportBuilder.saveSuccessCreatedDescription')}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate(`/reports/${reportId}/edit`)}>
              <Pencil className="mr-2 size-4" />
              {t('common.reportBuilder.continueEditing')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{meta.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {meta.connectionKey} / {dataSourceTypeLabel} / {meta.dataSourceName}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {governance.favorite && <Badge variant="default">{t('common.reportBuilder.favorite')}</Badge>}
            {governance.certified && <Badge variant="default">{t('common.reportBuilder.certified')}</Badge>}
            {accessLevelLabel && meta.accessLevel !== 'owner' && <Badge variant="outline">{accessLevelLabel}</Badge>}
            <Badge variant={lifecycle.status === 'published' ? 'default' : lifecycle.status === 'archived' ? 'destructive' : 'secondary'}>
              {statusLabel}
            </Badge>
            <Badge variant="outline">v{lifecycle.version}</Badge>
            {governance.category && <Badge variant="outline">{governance.category}</Badge>}
            {governance.owner && <Badge variant="outline">{governance.owner}</Badge>}
            {governance.audience && <Badge variant="outline">{audienceLabel}</Badge>}
            {governance.refreshCadence && <Badge variant="outline">{refreshCadenceLabel}</Badge>}
            {governance.subscriptionEnabled && governance.subscriptionFrequency && (
              <Badge variant="outline">{t('common.reportBuilder.subscriptionShort', { value: subscriptionFrequencyLabel })}</Badge>
            )}
            {governance.sharedWith?.length ? (
              <Badge variant="outline">{t('common.reportBuilder.sharedShort', { count: governance.sharedWith.length })}</Badge>
            ) : null}
            {(governance.tags ?? []).map((tag) => (
              <Badge key={tag} variant="secondary">#{tag}</Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => runPreview(viewerParameterValues)} disabled={ui.previewLoading}>
            <RefreshCw className={cn('mr-2 size-4', ui.previewLoading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCurrentWidgetCsv} disabled={!preview.columns.length}>
              <Download className="mr-2 size-4" />
            {t('common.reportBuilder.exportCurrentCsv')}
          </Button>
          <Button variant="outline" size="sm" onClick={exportAllWidgetsCsv} disabled={widgetCount === 0}>
            <Download className="mr-2 size-4" />
            {t('common.reportBuilder.exportAllCsv')}
          </Button>
          <Button variant="outline" size="sm" onClick={exportDefinitionJson}>
            <FileJson className="mr-2 size-4" />
            {t('common.reportBuilder.exportDefinition')}
          </Button>
          {!isMyReportsView && meta.canManage !== false && (
            <Button size="sm" onClick={() => navigate(`/reports/${reportId}/edit`)}>
              <Pencil className="mr-2 size-4" />
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          {viewerEditableParameters.length > 0 && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <div>
                  <h3 className="text-sm font-semibold">{t('common.reportBuilder.viewerParametersTitle')}</h3>
                  <p className="text-muted-foreground text-xs">{t('common.reportBuilder.viewerParametersDescription')}</p>
                </div>
                <div className="space-y-3">
                  {viewerEditableParameters.map((parameter) => (
                    <div key={parameter.name} className="grid gap-2">
                      <Label>{parameter.viewerLabel || parameter.name}</Label>
                      <Input
                        value={viewerParameterValues[parameter.name] ?? ''}
                        onChange={(e) =>
                          setViewerParameterValues((current) => ({
                            ...current,
                            [parameter.name]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant={hasViewerParameterChanges ? 'default' : 'outline'}
                  disabled={!hasViewerParameterChanges}
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
                  onClick={() => setViewerParameterValues(initialViewerParameterValues)}
                >
                  {t('common.reset')}
                </Button>
              </CardContent>
            </Card>
          )}

          <RuntimeFiltersPanel
            schema={schema}
            loading={ui.previewLoading}
            onApply={async () => {
              await runPreview(viewerParameterValues);
              await runAllWidgetPreviews(viewerParameterValues);
            }}
            onReset={loadReport}
          />

          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <h3 className="text-sm font-semibold">{t('common.reportBuilder.reportSummary')}</h3>
                <p className="text-muted-foreground text-xs">{t('common.reportBuilder.reportSummaryDescription')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{t(`common.reportBuilder.chartTypes.${config.chartType}`)}</Badge>
                <Badge variant="secondary">{t('common.reportBuilder.widgetCountBadge', { count: widgetCount })}</Badge>
                <Badge variant="outline">{t('common.reportBuilder.fieldCountBadge', { count: schema.length })}</Badge>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.status')}</span>
                  <span className="font-medium uppercase">{statusLabel}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.reportBuilder.version')}</span>
                  <span className="font-medium">v{lifecycle.version}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.reportBuilder.owner')}</span>
                  <span className="font-medium">{governance.owner ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.reportBuilder.audience')}</span>
                  <span className="font-medium">{audienceLabel}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.refresh')}</span>
                  <span className="font-medium">{refreshCadenceLabel}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.reportBuilder.subscription')}</span>
                  <span className="font-medium">
                    {governance.subscriptionEnabled ? `${subscriptionFrequencyLabel} / ${subscriptionChannelLabel}` : t('common.reportBuilder.off')}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.reportBuilder.sharedWith')}</span>
                  <span className="font-medium">{governance.sharedWith?.length ?? 0}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.reportBuilder.publishedAt')}</span>
                  <span className="font-medium">{lifecycle.publishedAt ? new Date(lifecycle.publishedAt).toLocaleString(i18n.language) : '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.reportBuilder.lastReview')}</span>
                  <span className="font-medium">{governance.lastReviewedAt ? new Date(governance.lastReviewedAt).toLocaleDateString(i18n.language) : '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.reportBuilder.chartType')}</span>
                  <span className="font-medium uppercase">{t(`common.reportBuilder.chartTypes.${config.chartType}`)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.reportBuilder.axis')}</span>
                  <span className="font-medium">{config.axis?.field ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.reportBuilder.values')}</span>
                  <span className="font-medium">{config.values.length}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.filters')}</span>
                  <span className="font-medium">{config.filters.length}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('common.reportBuilder.widgets')}</span>
                  <span className="font-medium">{config.widgets?.length ?? 1}</span>
                </div>
              </div>
              {lifecycle.releaseNote && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="mb-1 font-medium">{t('common.reportBuilder.releaseNote')}</div>
                  <div className="text-muted-foreground">{lifecycle.releaseNote}</div>
                </div>
              )}
              {governance.sharedWith && governance.sharedWith.length > 0 && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="mb-1 font-medium">{t('common.reportBuilder.sharedWith')}</div>
                  <div className="text-muted-foreground flex flex-wrap gap-2">
                    {governance.sharedWith.map((item) => (
                      <Badge key={item} variant="secondary">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {groupedWidgets.map((section, sectionIndex) => (
            <div key={section.label || `section-${sectionIndex}`} className="space-y-3">
              {section.label ? (
                <div className="rounded-2xl border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold tracking-tight">{section.label}</div>
                      <div className="text-muted-foreground text-xs">{t('common.reportBuilder.sectionWidgetCount', { count: section.widgets.length })}</div>
                      {section.description ? (
                        <div className="text-muted-foreground mt-1 max-w-2xl text-xs">{section.description}</div>
                      ) : null}
                    </div>
                    <Badge variant="outline">{t('common.reportBuilder.sectionBadge')}</Badge>
                  </div>
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
                      <PreviewPanel
                        key={widget.id}
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
                    );
                  }
                  return (
                    <PreviewPanel
                      key={widget.id}
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
