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
import { reportsApi } from '../api';
import { Copy, ExternalLink, LayoutGrid, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { createDashboardItem, getReportSummary, loadMyDashboardLayout, saveMyDashboardLayout, sanitizeMyDashboardLayout } from '../utils';
import type { ReportConfig } from '../types';

export function ReportsListPage(): ReactElement {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const isMyReports = location.pathname === '/reports/my';
  const userId = useAuthStore((state) => state.user?.id);
  const { search, setSearch } = useReportsStore();
  const { data: items = [], isLoading: loading, error: queryError, refetch } = useReportsList(
    search || undefined,
    isMyReports ? 'assigned' : 'all',
  );
  const [pendingId, setPendingId] = useState<number | null>(null);
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
    const nextLayout = {
      version: 1 as const,
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
                opacity-75 grayscale-[0] dark:opacity-100 dark:grayscale-0"
              >
                <Plus className="mr-2 size-4" />
                {t('common.reportBuilder.newReport')}
              </Button>
            )}

          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/50 dark:bg-white/[0.02] p-2 rounded-2xl border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-inner">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t('common.reportBuilder.searchReport')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 bg-transparent border-0 focus-visible:ring-0 text-base font-medium placeholder:text-slate-400 placeholder:font-normal"
            />
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

      {!loading && items.length > 0 && (
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
                    <div className="text-right hidden sm:block">

                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5 uppercase">
                        {summary.publishedAt
                          ? new Date(summary.publishedAt).toLocaleDateString(i18n.language)
                          : r.updatedAt
                            ? new Date(r.updatedAt).toLocaleDateString(i18n.language)
                            : '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isMyReports && r.canManage !== false && (
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
                      )}
                      {!isMyReports && (
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
                      )}
                      {isMyReports && (
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
                        </>
                      )}
                      {!isMyReports && r.canManage !== false && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={pendingId === r.id}
                          className="size-9 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 text-red-500/70"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(r.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
}
