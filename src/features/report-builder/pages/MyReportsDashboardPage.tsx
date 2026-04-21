import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Rnd, type RndDragCallback, type RndResizeCallback } from 'react-rnd';
import { Plus, RefreshCw, Trash2, ExternalLink, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { useReportsList } from '../hooks/useReportsList';
import type { MyReportDashboardItem, MyReportDashboardLayout, ReportDto } from '../types';
import {
  DASHBOARD_CANVAS_WIDTH,
  DASHBOARD_GRID_SIZE,
  DASHBOARD_ITEM_MIN_HEIGHT,
  DASHBOARD_ITEM_MIN_WIDTH,
  createDashboardItem,
  getReportSummary,
  loadMyDashboardLayout,
  sanitizeMyDashboardLayout,
  saveMyDashboardLayout,
} from '../utils';

function DashboardCardContent({ report }: { report: ReportDto }): ReactElement {
  const { t, i18n } = useTranslation('common');
  const summary = getReportSummary(report.configJson);
  const statusLabel =
    summary.status === 'published'
      ? t('common.reportBuilder.lifecycle.publish')
      : summary.status === 'archived'
        ? t('common.reportBuilder.lifecycle.archive')
        : t('common.reportBuilder.lifecycle.draft');

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border/70 bg-background/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{report.name}</p>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
            {report.description || `${report.connectionKey} / ${report.dataSourceName}`}
          </p>
        </div>
        <Badge variant="outline">{statusLabel}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{t('common.reportBuilder.widgetCountBadge', { count: summary.widgetCount })}</Badge>
        {summary.chartTypes.slice(0, 2).map((chartType) => (
          <Badge key={chartType} variant="outline">
            {t(`common.reportBuilder.chartTypes.${chartType}`)}
          </Badge>
        ))}
        {summary.favorite && <Badge variant="default">{t('common.reportBuilder.favorite')}</Badge>}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {report.updatedAt
            ? new Date(report.updatedAt).toLocaleDateString(i18n.language)
            : t('common.reportBuilder.dashboardNoDate')}
        </span>
        <span>{report.dataSourceName}</span>
      </div>
    </div>
  );
}

export function MyReportsDashboardPage(): ReactElement {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.id);
  const { data: reports = [], isLoading, error } = useReportsList(undefined, 'assigned');
  const [layout, setLayout] = useState<MyReportDashboardLayout>({ version: 1, updatedAt: new Date().toISOString(), items: [] });
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
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

  const placedReportIds = useMemo(() => new Set(layout.items.map((item) => item.reportId)), [layout.items]);
  const availableReports = useMemo(
    () => reports.filter((report) => !placedReportIds.has(report.id)),
    [placedReportIds, reports],
  );

  const updateItems = (updater: (items: MyReportDashboardItem[]) => MyReportDashboardItem[]): void => {
    setLayout((current) => ({
      version: 1,
      updatedAt: new Date().toISOString(),
      items: updater([...current.items]).map((item, index) => ({ ...item, order: index })),
    }));
  };

  const handleAddReport = (reportId: number): void => {
    if (!reportMap.has(reportId) || placedReportIds.has(reportId)) return;
    updateItems((items) => [...items, createDashboardItem(reportId, items)]);
    setSelectedReportId(reportId);
  };

  const handleRemoveReport = (reportId: number): void => {
    updateItems((items) => items.filter((item) => item.reportId !== reportId));
    setSelectedReportId((current) => (current === reportId ? null : current));
  };

  const handleReset = (): void => {
    setLayout({ version: 1, updatedAt: new Date().toISOString(), items: [] });
    setSelectedReportId(null);
  };

  const handleDragStop: RndDragCallback = (_event, data) => {
    const reportId = Number(data.node.dataset.reportId);
    updateItems((items) =>
      items.map((item) =>
        item.reportId === reportId
          ? { ...item, x: data.x, y: data.y }
          : item,
      ),
    );
  };

  const handleResizeStop: RndResizeCallback = (_event, _direction, ref, _delta, position) => {
    const reportId = Number(ref.dataset.reportId);
    updateItems((items) =>
      items.map((item) =>
        item.reportId === reportId
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
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('common.reportBuilder.myDashboardTitle')}</h1>
          <p className="text-muted-foreground text-sm">{t('common.reportBuilder.myDashboardDescription')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/reports/my')}>
            <LayoutGrid className="mr-2 size-4" />
            {t('common.reportBuilder.goToMyReports')}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={layout.items.length === 0}>
            <RefreshCw className="mr-2 size-4" />
            {t('common.reportBuilder.resetMyDashboard')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t('common.reportBuilder.availableReportsTitle')}</CardTitle>
            <CardDescription>{t('common.reportBuilder.availableReportsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}
            {!isLoading && error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
            {!isLoading && !error && reports.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('common.reportBuilder.noAssignedReports')}</p>
            )}
            {!isLoading && !error && availableReports.length === 0 && reports.length > 0 && (
              <p className="text-sm text-muted-foreground">{t('common.reportBuilder.availableReportsEmpty')}</p>
            )}
            {availableReports.map((report) => (
              <div key={report.id} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <p className="font-medium">{report.name}</p>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                  {report.description || report.dataSourceName}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => handleAddReport(report.id)}>
                    <Plus className="mr-2 size-4" />
                    {t('common.reportBuilder.addToMyDashboard')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/reports/my/${report.id}`)}>
                    <ExternalLink className="mr-2 size-4" />
                    {t('common.reportBuilder.openReport')}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('common.reportBuilder.dashboardCanvasTitle')}</CardTitle>
            <CardDescription>{t('common.reportBuilder.dashboardCanvasDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {layout.items.length === 0 ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/10 p-8 text-center">
                <div className="max-w-md space-y-2">
                  <p className="font-medium">{t('common.reportBuilder.myDashboardEmptyTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t('common.reportBuilder.myDashboardEmptyDescription')}</p>
                </div>
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

                    return (
                      <Rnd
                        key={item.reportId}
                        size={{ width: item.w, height: item.h }}
                        position={{ x: item.x, y: item.y }}
                        minWidth={DASHBOARD_ITEM_MIN_WIDTH}
                        minHeight={DASHBOARD_ITEM_MIN_HEIGHT}
                        bounds="parent"
                        dragGrid={[DASHBOARD_GRID_SIZE, DASHBOARD_GRID_SIZE]}
                        resizeGrid={[DASHBOARD_GRID_SIZE, DASHBOARD_GRID_SIZE]}
                        onDragStart={() => setSelectedReportId(item.reportId)}
                        onResizeStart={() => setSelectedReportId(item.reportId)}
                        onDragStop={handleDragStop}
                        onResizeStop={handleResizeStop}
                        data-report-id={item.reportId}
                        className={selectedReportId === item.reportId ? 'z-20' : 'z-10'}
                      >
                        <div className="group relative h-full">
                          <DashboardCardContent report={report} />
                          <div className="absolute right-3 top-3 flex gap-2 opacity-100 transition group-hover:opacity-100">
                            <Button size="icon-sm" variant="secondary" onClick={() => navigate(`/reports/my/${report.id}`)}>
                              <ExternalLink className="size-4" />
                            </Button>
                            <Button size="icon-sm" variant="destructive" onClick={() => handleRemoveReport(report.id)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </Rnd>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
