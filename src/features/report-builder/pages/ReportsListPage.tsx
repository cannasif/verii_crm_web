import type { ReactElement } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useReportsStore } from '../store';
import { useReportsList } from '../hooks/useReportsList';
import { Card, CardContent } from '@/components/ui/card';
import { reportsApi } from '../api';
import { Copy, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';

function getReportSummary(configJson: string): {
  widgetCount: number;
  chartTypes: string[];
  status: string;
  version: number;
  publishedAt?: string;
  releaseNote?: string;
  category?: string;
  tags: string[];
  audience?: string;
  refreshCadence?: string;
  favorite: boolean;
  sharedWith: string[];
  subscriptionEnabled: boolean;
  subscriptionChannel?: string;
  subscriptionFrequency?: string;
  owner?: string;
  certified: boolean;
  lastReviewedAt?: string;
} {
  try {
    const parsed = JSON.parse(configJson) as {
      chartType?: string;
      widgets?: Array<{ chartType?: string }>;
      lifecycle?: { status?: string; version?: number; publishedAt?: string; releaseNote?: string };
      governance?: {
        category?: string;
        tags?: string[];
        audience?: string;
        refreshCadence?: string;
        favorite?: boolean;
        sharedWith?: string[];
        subscriptionEnabled?: boolean;
        subscriptionChannel?: string;
        subscriptionFrequency?: string;
        owner?: string;
        certified?: boolean;
        lastReviewedAt?: string;
      };
    };
    const widgets = Array.isArray(parsed.widgets) ? parsed.widgets : [];
    const chartTypes = widgets.length > 0
      ? widgets.map((widget) => widget.chartType).filter((value): value is string => Boolean(value))
      : parsed.chartType
        ? [parsed.chartType]
        : [];
    return {
      widgetCount: widgets.length > 0 ? widgets.length : 1,
      chartTypes: [...new Set(chartTypes)],
      status: parsed.lifecycle?.status ?? 'draft',
      version: parsed.lifecycle?.version ?? 1,
      publishedAt: parsed.lifecycle?.publishedAt,
      releaseNote: parsed.lifecycle?.releaseNote,
      category: parsed.governance?.category,
      tags: parsed.governance?.tags ?? [],
      audience: parsed.governance?.audience,
      refreshCadence: parsed.governance?.refreshCadence,
      favorite: parsed.governance?.favorite ?? false,
      sharedWith: parsed.governance?.sharedWith ?? [],
      subscriptionEnabled: parsed.governance?.subscriptionEnabled ?? false,
      subscriptionChannel: parsed.governance?.subscriptionChannel,
      subscriptionFrequency: parsed.governance?.subscriptionFrequency,
      owner: parsed.governance?.owner,
      certified: parsed.governance?.certified ?? false,
      lastReviewedAt: parsed.governance?.lastReviewedAt,
    };
  } catch {
    return { widgetCount: 1, chartTypes: [], status: 'draft', version: 1, tags: [], favorite: false, sharedWith: [], subscriptionEnabled: false, certified: false };
  }
}

export function ReportsListPage(): ReactElement {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { search, setSearch } = useReportsStore();
  const { data: items = [], isLoading: loading, error: queryError, refetch } = useReportsList(search || undefined);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const error = queryError?.message ?? null;
  const getStatusLabel = (status: string): string =>
    status === 'published'
      ? t('common.reportBuilder.lifecycle.publish')
      : status === 'archived'
        ? t('common.reportBuilder.lifecycle.archive')
        : t('common.reportBuilder.lifecycle.draft');
  const getAudienceLabel = (audience?: string): string | null =>
    audience ? t(`common.reportBuilder.audiences.${audience}`) : null;
  const getRefreshCadenceLabel = (cadence?: string): string | null =>
    cadence ? t(`common.reportBuilder.refreshCadences.${cadence}`) : null;
  const getSubscriptionFrequencyLabel = (frequency?: string): string | null =>
    frequency ? t(`common.reportBuilder.subscriptionFrequencies.${frequency}`) : null;

  const handleDuplicate = async (reportId: number): Promise<void> => {
    try {
      setPendingId(reportId);
      const report = await reportsApi.get(reportId);
      await reportsApi.create({
        name: t('common.reportBuilder.copyName', { name: report.name }),
        description: report.description,
        connectionKey: report.connectionKey,
        dataSourceType: report.dataSourceType,
        dataSourceName: report.dataSourceName,
        configJson: report.configJson,
      });
      await refetch();
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (reportId: number): Promise<void> => {
    try {
      setPendingId(reportId);
      await reportsApi.remove(reportId);
      await refetch();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('sidebar.reportBuilder')}</h1>
        <Button onClick={() => navigate('/reports/new')}>
          <Plus className="mr-2 size-4" />
          {t('common.reportBuilder.newReport')}
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder={t('common.reportBuilder.searchReport')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>{t('common.reportBuilder.noReports')}</p>
            <Button variant="outline" className="mt-2" onClick={() => navigate('/reports/new')}>
              {t('common.reportBuilder.newReport')}
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((r) => {
            const summary = getReportSummary(r.configJson);
            return (
            <Card key={r.id} className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => navigate(`/reports/${r.id}`)}>
              <CardContent className="flex flex-row items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {r.connectionKey} / {r.dataSourceType} / {r.dataSourceName}
                  </p>
                  {(summary.owner || summary.lastReviewedAt) && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {summary.owner ? `${t('common.reportBuilder.owner').toLowerCase()}: ${summary.owner}` : ''}
                      {summary.owner && summary.lastReviewedAt ? ' • ' : ''}
                      {summary.lastReviewedAt ? `${t('common.reportBuilder.reviewed').toLowerCase()}: ${new Date(summary.lastReviewedAt).toLocaleDateString(i18n.language)}` : ''}
                    </p>
                  )}
                  {summary.releaseNote && (
                    <p className="text-muted-foreground mt-1 text-xs">{summary.releaseNote}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {summary.favorite && <Badge variant="default">{t('common.reportBuilder.favorite')}</Badge>}
                    {summary.certified && <Badge variant="default">{t('common.reportBuilder.certified')}</Badge>}
                    <Badge variant={summary.status === 'published' ? 'default' : summary.status === 'archived' ? 'destructive' : 'secondary'}>
                      {getStatusLabel(summary.status)}
                    </Badge>
                    <Badge variant="outline">v{summary.version}</Badge>
                    {summary.category && <Badge variant="outline">{summary.category}</Badge>}
                    {summary.audience && <Badge variant="outline">{getAudienceLabel(summary.audience)}</Badge>}
                    {summary.refreshCadence && <Badge variant="outline">{getRefreshCadenceLabel(summary.refreshCadence)}</Badge>}
                    {summary.subscriptionEnabled && summary.subscriptionFrequency && (
                      <Badge variant="outline">{t('common.reportBuilder.subscriptionShort', { value: getSubscriptionFrequencyLabel(summary.subscriptionFrequency) })}</Badge>
                    )}
                    {summary.sharedWith.length > 0 && (
                      <Badge variant="outline">{t('common.reportBuilder.sharedShort', { count: summary.sharedWith.length })}</Badge>
                    )}
                    <Badge variant="secondary">{t('common.reportBuilder.widgetCountBadge', { count: summary.widgetCount })}</Badge>
                    {summary.chartTypes.slice(0, 3).map((chartType) => (
                        <Badge key={chartType} variant="outline">
                        {t(`common.reportBuilder.chartTypes.${chartType}`)}
                      </Badge>
                    ))}
                    {summary.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground text-xs">
                    {summary.publishedAt
                      ? new Date(summary.publishedAt).toLocaleDateString(i18n.language)
                      : r.updatedAt
                        ? new Date(r.updatedAt).toLocaleDateString(i18n.language)
                        : ''}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pendingId === r.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/reports/${r.id}/edit`);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pendingId === r.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDuplicate(r.id);
                    }}
                  >
                    {pendingId === r.id ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pendingId === r.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(r.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}
    </div>
  );
}
