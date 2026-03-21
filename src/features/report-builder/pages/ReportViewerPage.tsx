import type { ReactElement } from 'react';
import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import type { CalculatedField, ReportPreviewResponse, ReportWidget } from '../types';

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

function buildConfigFromWidget(widget: ReportWidget, allWidgets?: ReportWidget[], calculatedFields?: CalculatedField[], lifecycle?: { status: string; version: number; publishedAt?: string }): string {
  return JSON.stringify({
    chartType: widget.chartType,
    axis: widget.axis,
    values: widget.values,
    legend: widget.legend,
    sorting: widget.sorting,
    filters: widget.filters,
    calculatedFields,
    lifecycle,
    widgets: allWidgets,
    activeWidgetId: widget.id,
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

export function ReportViewerPage(): ReactElement {
  const { t, i18n } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const [widgetPreviews, setWidgetPreviews] = useState<Record<string, { columns: string[]; rows: unknown[][]; loading: boolean; error: string | null }>>({});

  const reportId = id ? parseInt(id, 10) : NaN;
  const widgetCount = config.widgets?.length ?? 1;
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

  const runPreview = useCallback(async () => {
    if (!meta.connectionKey || !meta.dataSourceType || !meta.dataSourceName) return;
    setUi({ previewLoading: true, error: null });
    try {
      const configJson = JSON.stringify(config);
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
  }, [meta.connectionKey, meta.dataSourceType, meta.dataSourceName, config, setPreview, setUi]);

  const runAllWidgetPreviews = useCallback(async () => {
    const widgets = config.widgets ?? [];
    if (!meta.connectionKey || !meta.dataSourceType || !meta.dataSourceName || widgets.length === 0) return;

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
            configJson: buildConfigFromWidget(widget, widgets, config.calculatedFields, lifecycle),
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
  }, [config.calculatedFields, config.widgets, lifecycle, meta.connectionKey, meta.dataSourceType, meta.dataSourceName]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (meta.connectionKey && meta.dataSourceType && meta.dataSourceName) {
      loadSchemaForCurrentDataSource();
      runPreview();
      runAllWidgetPreviews();
    }
  }, [meta.connectionKey, meta.dataSourceType, meta.dataSourceName, runPreview, runAllWidgetPreviews, loadSchemaForCurrentDataSource]);

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
        <Button variant="outline" className="mt-2" onClick={() => navigate('/reports')}>
          {t('common.reportBuilder.backToList')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{meta.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {meta.connectionKey} / {meta.dataSourceType} / {meta.dataSourceName}
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
          <Button variant="outline" size="sm" onClick={runPreview} disabled={ui.previewLoading}>
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
          {meta.canManage !== false && (
            <Button size="sm" onClick={() => navigate(`/reports/${reportId}/edit`)}>
              <Pencil className="mr-2 size-4" />
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <RuntimeFiltersPanel
            schema={schema}
            loading={ui.previewLoading}
            onApply={async () => {
              await runPreview();
              await runAllWidgetPreviews();
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
        <div className="grid gap-4 xl:grid-cols-3">
          {(config.widgets ?? []).map((widget, index) => {
            const widgetPreview = widgetPreviews[widget.id];
            const isPrimaryWidget = widget.id === config.activeWidgetId || index === 0;
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
                  title={widget.title || t('common.reportBuilder.widgetTitleFallback', { index: index + 1 })}
                  subtitle={t('common.reportBuilder.primaryWidgetPreview')}
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
                title={widget.title || t('common.reportBuilder.widgetTitleFallback', { index: index + 1 })}
                subtitle={t('common.reportBuilder.additionalWidgetPreview')}
                className={panelClassName}
                minHeightClassName={minHeightClassName}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
