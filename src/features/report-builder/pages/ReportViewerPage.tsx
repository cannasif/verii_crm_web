import type { ReactElement } from 'react';
import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useReportBuilderStore } from '../store';
import { reportsApi } from '../api';
import { PreviewPanel } from '../components/PreviewPanel';
import { Loader2, Pencil, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function ReportViewerPage(): ReactElement {
  const { t } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { meta, config, preview, ui, setPreview, setUi, hydrateFromReportDetail } = useReportBuilderStore();

  const reportId = id ? parseInt(id, 10) : NaN;

  const loadReport = useCallback(async () => {
    if (Number.isNaN(reportId)) return;
    try {
      setUi({ checkLoading: true, error: null });
      const report = await reportsApi.get(reportId);
      hydrateFromReportDetail(report);
    } catch (e) {
      setUi({ checkLoading: false, error: e instanceof Error ? e.message : 'Failed to load' });
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
      setUi({ previewLoading: false, error: e instanceof Error ? e.message : 'Preview failed' });
    }
  }, [meta.connectionKey, meta.dataSourceType, meta.dataSourceName, config, setPreview, setUi]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (meta.connectionKey && meta.dataSourceType && meta.dataSourceName) {
      runPreview();
    }
  }, [meta.connectionKey, meta.dataSourceType, meta.dataSourceName, runPreview]);

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
        <h1 className="text-2xl font-bold">{meta.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runPreview} disabled={ui.previewLoading}>
            <RefreshCw className={cn('mr-2 size-4', ui.previewLoading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
          <Button size="sm" onClick={() => navigate(`/reports/${reportId}/edit`)}>
            <Pencil className="mr-2 size-4" />
            {t('common.edit')}
          </Button>
        </div>
      </div>

      <PreviewPanel
        columns={preview.columns}
        rows={preview.rows}
        chartType={config.chartType}
        loading={ui.previewLoading}
        error={ui.error}
        empty={false}
      />
    </div>
  );
}
