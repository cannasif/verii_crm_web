import type { ReactElement } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useReportsStore } from '../store';
import { useReportsList } from '../hooks/useReportsList';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { reportsApi } from '../api';
import { ChevronsRight, Copy, ExternalLink, LayoutGrid, List, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { createDashboardItem, getReportSummary, loadMyDashboardLayout, saveMyDashboardLayout, sanitizeMyDashboardLayout } from '../utils';
import type { MyReportDashboardLayout, ReportConfig } from '../types';

function formatReportsListDateLabel(
  publishedAt: string | undefined,
  updatedAt: string | undefined,
  locale: string,
  noDateLabel: string,
): string {
  if (publishedAt) return new Date(publishedAt).toLocaleDateString(locale);
  if (updatedAt) return new Date(updatedAt).toLocaleDateString(locale);
  return noDateLabel;
}

export function ReportsListPage(): ReactElement {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const isMyReports = location.pathname === '/reports/my';
  const userId = useAuthStore((state) => state.user?.id);
  const { search, setSearch, myReportsViewLayout, setMyReportsViewLayout } = useReportsStore();
  const { data: items = [], isLoading: loading, error: queryError, refetch } = useReportsList(
    search || undefined,
    isMyReports ? 'assigned' : 'all',
  );
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reportPendingDelete, setReportPendingDelete] = useState<{ id: number; name: string } | null>(null);
  const error = queryError?.message ?? null;

  const handleAddToDashboard = (reportId: number): void => {
    if (!userId) return;
    const report = items.find((item) => item.id === reportId);
    let defaultWidgetId: string | undefined;
    let defaultWidgetTitle: string | undefined;
    if (report) {
      try {
        const parsed = JSON.parse(report.configJson) as ReportConfig;
        const firstWidget = parsed.widgets?.[0];
        defaultWidgetId = firstWidget?.id;
        defaultWidgetTitle = firstWidget?.title?.trim() || undefined;
      } catch {
        defaultWidgetId = undefined;
        defaultWidgetTitle = undefined;
      }
    }
    const currentLayout = sanitizeMyDashboardLayout(loadMyDashboardLayout(userId), items.map((item) => item.id));
    if (currentLayout.items.some((item) => item.reportId === reportId && (item.widgetId ?? undefined) === defaultWidgetId)) {
      toast.info(t('common.reportBuilder.dashboardAlreadyAdded'));
      return;
    }
    const nextLayout: MyReportDashboardLayout = {
      version: 2,
      maxCols: currentLayout.maxCols,
      maxRows: currentLayout.maxRows,
      updatedAt: new Date().toISOString(),
      items: [...currentLayout.items, createDashboardItem(reportId, currentLayout.items, { widgetId: defaultWidgetId, widgetTitle: defaultWidgetTitle })],
    };
    saveMyDashboardLayout(userId, nextLayout);
    toast.success(t('common.reportBuilder.dashboardAdded'));
  };

  const getStatusLabel = (status: string): string =>
    status === 'published'
      ? t('common.reportBuilder.lifecycle.publish')
      : status === 'archived'
        ? t('common.reportBuilder.lifecycle.archive')
        : t('common.reportBuilder.lifecycle.draft');


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

  const handleDelete = async (reportId: number): Promise<boolean> => {
    try {
      setPendingId(reportId);
      await reportsApi.remove(reportId);
      if (userId) {
        const current = loadMyDashboardLayout(userId);
        const nextItems = current.items.filter((item) => item.reportId !== reportId);
        if (nextItems.length !== current.items.length) {
          saveMyDashboardLayout(userId, {
            ...current,
            updatedAt: new Date().toISOString(),
            items: nextItems,
          });
        }
      }
      await refetch();
      toast.success(t('common.reportBuilder.reportDeleteSuccess'));
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.deleteError'));
      return false;
    } finally {
      setPendingId(null);
    }
  };

  const requestDeleteReport = (report: { id: number; name: string }): void => {
    setReportPendingDelete({ id: report.id, name: report.name.trim() || t('common.reportBuilder.reportName') });
  };

  const confirmDeleteReport = async (): Promise<void> => {
    if (reportPendingDelete == null || confirmingDelete) return;
    const target = reportPendingDelete;
    setConfirmingDelete(true);
    try {
      const ok = await handleDelete(target.id);
      if (ok) setReportPendingDelete(null);
    } finally {
      setConfirmingDelete(false);
    }
  };

  return (
    <div className="w-full px-6 pt-0 pb-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <LayoutGrid className="size-8 text-pink-600 dark:text-pink-400 relative z-10" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {isMyReports ? t('common.reportBuilder.myReportsTitle') : t('common.reportBuilder.allReportsTitle')}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                  {isMyReports ? t('common.reportBuilder.myReportsDescription') : t('common.reportBuilder.allReportsDescription')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isMyReports && (
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="rounded-xl border-slate-200 dark:border-white/10 h-11 px-6 font-bold from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500  transition-all shadow-sm"
              >
                <LayoutGrid className="mr-2 size-4 text-pink-500" />
                {t('common.reportBuilder.openDashboardHome')}
              </Button>
            )}
            {!isMyReports && (
              <Button
                onClick={() => navigate('/reports/new')}
                className="rounded-xl bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 text-white h-11 px-8 font-bold border-0 shadow-lg shadow-pink-500/20 transition-all hover:scale-105 active:scale-95
                opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
              >
                <Plus className="mr-2 size-4" />
                {t('common.reportBuilder.newReport')}
              </Button>
            )}

          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white/50 p-2 shadow-inner backdrop-blur-md dark:border-white/10 dark:bg-white/[0.02]">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t('common.reportBuilder.searchReport')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 border-0 bg-transparent pl-11 text-base font-medium placeholder:font-normal placeholder:text-slate-400 focus-visible:ring-0"
              />
            </div>
            {isMyReports ? (
              <div
                className="flex shrink-0 items-center rounded-xl border border-slate-200/90 bg-white/80 p-0.5 dark:border-white/10 dark:bg-white/5"
                role="group"
                aria-label={t('common.reportBuilder.reportsViewModeLabel')}
              >
                <Button
                  type="button"
                  variant={myReportsViewLayout === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-10 gap-1.5 rounded-lg px-3"
                  aria-pressed={myReportsViewLayout === 'cards'}
                  onClick={() => setMyReportsViewLayout('cards')}
                >
                  <LayoutGrid className="size-4" />
                  <span className="hidden font-semibold sm:inline">{t('common.reportBuilder.reportsViewCards')}</span>
                </Button>
                <Button
                  type="button"
                  variant={myReportsViewLayout === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-10 gap-1.5 rounded-lg px-3"
                  aria-pressed={myReportsViewLayout === 'list'}
                  onClick={() => setMyReportsViewLayout('list')}
                >
                  <List className="size-4" />
                  <span className="hidden font-semibold sm:inline">{t('common.reportBuilder.reportsViewList')}</span>
                </Button>
              </div>
            ) : null}
          </div>
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
            <p>{isMyReports ? t('common.reportBuilder.noAssignedReports') : t('common.reportBuilder.noReports')}</p>
            {!isMyReports && (
              <Button variant="outline" className="mt-2" onClick={() => navigate('/reports/new')}>
                {t('common.reportBuilder.newReport')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && items.length > 0 && isMyReports && myReportsViewLayout === 'list' ? (
        <div
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/50"
          role="list"
        >
          {items.map((r) => {
            const summary = getReportSummary(r.configJson);
            const dateLabel = formatReportsListDateLabel(
              summary.publishedAt,
              r.updatedAt,
              i18n.language,
              t('common.reportBuilder.dashboardNoDate'),
            );
            const snippetParts = [
              `${r.connectionKey} / ${r.dataSourceType} / ${r.dataSourceName}`,
              getStatusLabel(summary.status),
              `v${summary.version}`,
              t('common.reportBuilder.widgetCountBadge', { count: summary.widgetCount }),
            ];
            if (summary.category) snippetParts.push(summary.category);
            if (summary.sharedWith.length > 0) {
              snippetParts.push(t('common.reportBuilder.sharedShort', { count: summary.sharedWith.length }));
            }
            const snippet = snippetParts.join(' · ');
            return (
              <div
                key={r.id}
                role="listitem"
                className="group relative flex min-h-11 cursor-pointer items-center gap-2 border-b border-slate-200/90 px-2 py-1 last:border-b-0 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.04] sm:gap-3 sm:px-3 sm:py-1.5"
                onClick={() => navigate(`/reports/my/${r.id}`)}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors group-hover:border-slate-200 group-hover:bg-white dark:group-hover:border-white/10 dark:group-hover:bg-white/5">
                  <LayoutGrid className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{r.name}</span>
                    {summary.certified ? (
                      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm" aria-hidden>
                        <Plus className="size-2 stroke-[4]" />
                      </span>
                    ) : null}
                    <ChevronsRight className="hidden size-3.5 shrink-0 text-muted-foreground opacity-60 sm:inline" aria-hidden />
                    <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground md:inline">{snippet}</span>
                  </div>
                  <p className="truncate text-[11px] leading-snug text-muted-foreground md:hidden">{snippet}</p>
                </div>
                <div className="relative flex shrink-0 items-center">
                  <span className="shrink-0 px-1 text-xs tabular-nums text-muted-foreground transition-opacity sm:group-hover:opacity-0">
                    {dateLabel}
                  </span>
                  <div
                    className={cn(
                      'flex items-center',
                      'max-sm:ml-1',
                      'sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 sm:rounded-md sm:border sm:border-transparent sm:bg-background/95 sm:px-0.5 sm:shadow-sm sm:dark:bg-slate-950/95',
                      'sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100',
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-md hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-500/10 dark:hover:text-pink-400"
                      onClick={() => handleAddToDashboard(r.id)}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-md hover:bg-slate-100 dark:hover:bg-white/10"
                      onClick={() => navigate('/')}
                    >
                      <ExternalLink className="size-4" />
                    </Button>
                    {r.canManage !== false ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={pendingId === r.id}
                          className="size-8 rounded-md hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                          onClick={() => navigate(`/reports/${r.id}/edit`)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={pendingId !== null || confirmingDelete}
                          className="size-8 rounded-md text-red-500/80 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                          onClick={() => requestDeleteReport({ id: r.id, name: r.name })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !loading && items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {items.map((r) => {
            const summary = getReportSummary(r.configJson);
            return (
              <Card
                key={r.id}
                className="group cursor-pointer transition-all hover:bg-white dark:hover:bg-white/5 border-slate-200 dark:border-white/10 hover:border-pink-500/30 dark:hover:border-pink-500/30 bg-white/80 dark:bg-white/[0.03] shadow-sm hover:shadow-md rounded-2xl overflow-hidden"
                onClick={() => navigate(isMyReports ? `/reports/my/${r.id}` : `/reports/${r.id}`)}
              >
                <CardContent className="flex flex-row items-center justify-between gap-4 py-5 px-6">
                  <div className="flex items-center gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm group-hover:scale-105 transition-transform">
                      <LayoutGrid className="size-6 text-slate-500 dark:text-slate-400 group-hover:text-pink-500 transition-colors" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-wide">{r.name}</p>
                        {summary.certified && (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                            <Plus className="size-2.5 stroke-[4]" />
                          </div>
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mt-0.5">
                        {r.connectionKey} <span className="mx-1 text-slate-300">/</span> {r.dataSourceType} <span className="mx-1 text-slate-300">/</span> {r.dataSourceName}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-md bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-500/20 font-bold px-2 py-0.5 text-[10px] uppercase">
                          {getStatusLabel(summary.status)}
                        </Badge>
                        <Badge variant="outline" className="rounded-md border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                          v{summary.version}
                        </Badge>
                        {summary.category && (
                          <Badge variant="outline" className="rounded-md border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                            {summary.category}
                          </Badge>
                        )}
                        {summary.sharedWith.length > 0 && (
                          <Badge variant="outline" className="rounded-md border-orange-100 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/5 text-orange-600 dark:text-orange-400 font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                            {t('common.reportBuilder.sharedShort', { count: summary.sharedWith.length })}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                          {t('common.reportBuilder.widgetCountBadge', { count: summary.widgetCount })}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block min-w-[5.5rem]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {t('common.reportBuilder.reportsListDateCaption')}
                      </p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5 tabular-nums">
                        {formatReportsListDateLabel(
                          summary.publishedAt,
                          r.updatedAt,
                          i18n.language,
                          t('common.reportBuilder.dashboardNoDate'),
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {isMyReports ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:text-pink-600 dark:hover:text-pink-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToDashboard(r.id);
                            }}
                          >
                            <Plus className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/');
                            }}
                          >
                            <ExternalLink className="size-4" />
                          </Button>
                          {r.canManage !== false ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={pendingId === r.id}
                                className="size-9 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
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
                                size="icon"
                                disabled={pendingId !== null || confirmingDelete}
                                className="size-9 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 text-red-500/70"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestDeleteReport({ id: r.id, name: r.name });
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          ) : null}
                        </>
                      ) : (
                        <>
                          {r.canManage !== false ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={pendingId === r.id}
                              className="size-9 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/reports/${r.id}/edit`);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={pendingId === r.id}
                            className="size-9 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDuplicate(r.id);
                            }}
                          >
                            {pendingId === r.id ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                          </Button>
                          {r.canManage !== false ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={pendingId !== null || confirmingDelete}
                              className="size-9 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 text-red-500/70"
                              onClick={(e) => {
                                e.stopPropagation();
                                requestDeleteReport({ id: r.id, name: r.name });
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <AlertDialog
        open={reportPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && pendingId === null && !confirmingDelete) setReportPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.reportBuilder.reportsListDeleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.reportBuilder.reportsListDeleteConfirmDescription', {
                name: reportPendingDelete?.name ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pendingId !== null || confirmingDelete}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="h-10"
              disabled={pendingId !== null || confirmingDelete}
              onClick={(e) => {
                e.stopPropagation();
                void confirmDeleteReport();
              }}
            >
              {pendingId === reportPendingDelete?.id || confirmingDelete ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {t('common.delete.action')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
