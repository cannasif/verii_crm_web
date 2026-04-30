import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DataTableGrid,
  ManagementDataTableChrome,
  type DataTableGridColumn,
} from '@/components/shared';
import { Loader2, RefreshCw, Play, ShieldAlert, Clock3, CheckCircle2, Timer, Zap } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useHangfireDeadLetterQuery,
  useHangfireFailedJobsQuery,
  useHangfireRecurringJobsQuery,
  useHangfireSuccessJobsQuery,
  useHangfireStatsQuery,
  HANGFIRE_QUERY_KEYS,
} from '../hooks/useHangfireMonitoring';
import { hangfireMonitoringApi } from '../api/hangfireMonitoring.api';
import type {
  HangfireFailedResponseDto,
  HangfireRecurringJobItemDto,
  HangfireSuccessJobItemDto,
} from '../types/hangfireMonitoring.types';
import { cn } from '@/lib/utils';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type FailedColumnKey = 'jobId' | 'jobName' | 'state' | 'time' | 'reason';
type SuccessColumnKey = 'jobId' | 'jobName' | 'recurringJobId' | 'queue' | 'duration' | 'retryCount' | 'time';
type RecurringColumnKey = 'id' | 'job' | 'cron' | 'nextExecution' | 'lastExecution' | 'queue';

const headerCardStyle = `
  relative overflow-hidden rounded-[2.5rem] p-8 mb-8
  bg-white dark:bg-[#180F22]
  border border-slate-100 dark:border-white/5
  shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)]
`;

const statCardStyle = `
  relative overflow-hidden rounded-[2rem] p-6
  bg-white dark:bg-[#1E1627]
  border border-slate-100 dark:border-white/5
  shadow-sm hover:shadow-md transition-all duration-300
`;

function formatDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return '-';
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)} sn`;
}

function normalizeCron(cron?: string): string {
  if (!cron) return '-';
  return cron.length > 24 ? `${cron.slice(0, 24)}...` : cron;
}

export function HangfireMonitoringPage(): ReactElement {
  const { t } = useTranslation(['hangfire-monitoring', 'common']);
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();

  const [failedPage, setFailedPage] = useState(1);
  const [failedPageSize, setFailedPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [successPage, setSuccessPage] = useState(1);
  const [successPageSize, setSuccessPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [deadLetterPage, setDeadLetterPage] = useState(1);
  const [deadLetterPageSize, setDeadLetterPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [recurringPage, setRecurringPage] = useState(1);
  const [recurringPageSize, setRecurringPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [selectedRecurringJobId, setSelectedRecurringJobId] = useState<string>('');

  const failedFrom = (failedPage - 1) * failedPageSize;
  const successFrom = (successPage - 1) * successPageSize;
  const deadLetterFrom = (deadLetterPage - 1) * deadLetterPageSize;

  const statsQuery = useHangfireStatsQuery();
  const failedQuery = useHangfireFailedJobsQuery(failedFrom, failedPageSize);
  const successQuery = useHangfireSuccessJobsQuery(successFrom, successPageSize);
  const deadLetterQuery = useHangfireDeadLetterQuery(deadLetterFrom, deadLetterPageSize);
  const recurringJobsQuery = useHangfireRecurringJobsQuery();

  useEffect(() => {
    const firstJobId = recurringJobsQuery.data?.items?.[0]?.id;
    if (!selectedRecurringJobId && firstJobId) {
      setSelectedRecurringJobId(firstJobId);
    }
  }, [recurringJobsQuery.data?.items, selectedRecurringJobId]);

  const triggerRecurringJobMutation = useMutation({
    mutationFn: (jobId: string) => hangfireMonitoringApi.triggerRecurringJob(jobId),
    onSuccess: async (result) => {
      toast.success(t('recurring.triggerSuccess', { jobName: result.jobId }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: HANGFIRE_QUERY_KEYS.RECURRING }),
        queryClient.invalidateQueries({ queryKey: HANGFIRE_QUERY_KEYS.STATS }),
        queryClient.invalidateQueries({ queryKey: ['hangfire'] }),
      ]);
    },
    onError: () => {
      toast.error(t('recurring.triggerError'));
    },
  });

  useEffect(() => {
    setPageTitle(t('title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const isRefreshing =
    statsQuery.isRefetching ||
    failedQuery.isRefetching ||
    successQuery.isRefetching ||
    deadLetterQuery.isRefetching ||
    recurringJobsQuery.isRefetching;

  const isInitialLoading =
    statsQuery.isLoading ||
    failedQuery.isLoading ||
    successQuery.isLoading ||
    deadLetterQuery.isLoading ||
    recurringJobsQuery.isLoading;

  const handleRefresh = async (): Promise<void> => {
    await Promise.all([
      statsQuery.refetch(),
      failedQuery.refetch(),
      successQuery.refetch(),
      deadLetterQuery.refetch(),
      recurringJobsQuery.refetch(),
    ]);
  };

  const recurringItems = recurringJobsQuery.data?.items ?? [];
  const recurringTotalPages = Math.max(1, Math.ceil(recurringItems.length / recurringPageSize));
  const recurringRows = recurringItems.slice((recurringPage - 1) * recurringPageSize, recurringPage * recurringPageSize);
  const failedTotalPages = Math.max(1, Math.ceil((failedQuery.data?.total ?? 0) / failedPageSize));
  const successTotalPages = Math.max(1, Math.ceil((successQuery.data?.total ?? 0) / successPageSize));
  const deadLetterTotalPages = Math.max(1, Math.ceil((deadLetterQuery.data?.total ?? 0) / deadLetterPageSize));

  const selectedRecurringJob = useMemo(
    () => recurringItems.find((job) => job.id === selectedRecurringJobId) ?? recurringItems[0] ?? null,
    [recurringItems, selectedRecurringJobId],
  );

  const recurringHealth = useMemo(() => {
    const items = recurringItems;
    return {
      total: items.length,
      withErrors: items.filter((item) => Boolean(item.error)).length,
      withQueue: items.filter((item) => Boolean(item.queue)).length,
    };
  }, [recurringItems]);

  const recurringColumns: DataTableGridColumn<RecurringColumnKey>[] = [
    { key: 'id', label: t('recurring.table.id') },
    { key: 'job', label: t('recurring.table.job') },
    { key: 'cron', label: t('recurring.table.cron') },
    { key: 'nextExecution', label: t('recurring.table.nextExecution') },
    { key: 'lastExecution', label: t('recurring.table.lastExecution') },
    { key: 'queue', label: t('recurring.table.queue') },
  ];

  const failedColumns: DataTableGridColumn<FailedColumnKey>[] = [
    { key: 'jobId', label: t('table.jobId') },
    { key: 'jobName', label: t('table.jobName') },
    { key: 'state', label: t('table.state') },
    { key: 'time', label: t('table.time') },
    { key: 'reason', label: t('table.reason') },
  ];

  const successColumns: DataTableGridColumn<SuccessColumnKey>[] = [
    { key: 'jobId', label: t('table.jobId') },
    { key: 'jobName', label: t('table.jobName') },
    { key: 'recurringJobId', label: t('table.recurringJobId') },
    { key: 'queue', label: t('table.queue') },
    { key: 'duration', label: t('table.duration') },
    { key: 'retryCount', label: t('table.retryCount') },
    { key: 'time', label: t('table.time') },
  ];

  const renderRecurringCell = (item: HangfireRecurringJobItemDto, key: RecurringColumnKey): ReactElement | string => {
    if (key === 'id') return <span className="font-mono text-xs">{item.id}</span>;
    if (key === 'job') {
      return (
        <div className="flex flex-col gap-0.5">
          <div className="font-bold text-slate-900 dark:text-white">{item.jobName}</div>
          {item.method ? <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{item.method}</div> : null}
          {item.error ? <div className="text-[10px] font-bold text-red-500 flex items-center gap-1"><ShieldAlert size={10} /> {item.error}</div> : null}
        </div>
      );
    }
    if (key === 'cron') return <Badge variant="secondary" className="font-mono text-[10px] bg-slate-100 dark:bg-white/5">{item.cron || '-'}</Badge>;
    if (key === 'nextExecution') return <div className="text-xs font-medium">{formatDate(item.nextExecution)}</div>;
    if (key === 'lastExecution') return <div className="text-xs text-slate-500">{formatDate(item.lastExecution)}</div>;
    if (key === 'queue') return <Badge variant="outline" className="rounded-lg text-[10px] uppercase font-black">{item.queue || '-'}</Badge>;
    return '-';
  };

  const renderFailedCell = (item: HangfireFailedResponseDto['items'][number], key: FailedColumnKey): ReactElement | string => {
    if (key === 'jobId') return <span className="font-mono text-xs">{item.jobId || '-'}</span>;
    if (key === 'jobName') return <span className="font-bold">{item.jobName || '-'}</span>;
    if (key === 'state') return <Badge variant="destructive" className="rounded-lg font-black text-[10px]">{item.state || 'FAILED'}</Badge>;
    if (key === 'time') return <div className="text-xs">{formatDate(item.failedAt)}</div>;
    if (key === 'reason') return <div className="text-[11px] text-red-500 max-w-[250px] truncate">{item.reason || '-'}</div>;
    return '-';
  };

  const renderSuccessCell = (item: HangfireSuccessJobItemDto, key: SuccessColumnKey): ReactElement | string | number => {
    if (key === 'jobId') return <span className="font-mono text-xs">{item.jobId || '-'}</span>;
    if (key === 'jobName') return <span className="font-bold">{item.jobName || '-'}</span>;
    if (key === 'recurringJobId') return <span className="text-xs text-slate-500">{item.recurringJobId || '-'}</span>;
    if (key === 'queue') return <Badge variant="outline" className="text-[10px]">{item.queue || '-'}</Badge>;
    if (key === 'duration') return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-bold text-[11px]">{formatDuration(item.durationMs)}</Badge>;
    if (key === 'retryCount') return <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center font-bold text-xs">{item.retryCount}</Badge>;
    if (key === 'time') return <div className="text-xs">{formatDate(item.finishedAt)}</div>;
    return '-';
  };

  if (isInitialLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
        <p className="text-sm font-bold text-slate-500 animate-pulse">{t('common:loading')}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Breadcrumb
        items={[
          { label: t('common:sidebar.accessControl') },
          { label: t('menu'), isActive: true },
        ]}
      />

      <div className={headerCardStyle}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 dark:bg-pink-500/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 dark:bg-orange-500/10 blur-[80px] rounded-full -ml-20 -mb-20 pointer-events-none" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10">
          <div className="min-w-0">

            <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="mt-2 text-sm md:text-base font-medium text-slate-500 dark:text-slate-400 max-w-2xl">
              {t('description')}
            </p>
          </div>

          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-12 px-8 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pink-500/25
            opacity-75 grayscale-[0] 
            dark:opacity-100 dark:grayscale-0"
          >
            <RefreshCw size={18} className={cn("mr-2", isRefreshing && "animate-spin")} />
            {t('refresh')}
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 relative z-10">
          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Timer size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('stats.enqueued')}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{statsQuery.data?.enqueued ?? 0}</p>
              </div>
            </div>
          </div>

          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                <Zap size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('stats.processing')}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{statsQuery.data?.processing ?? 0}</p>
              </div>
            </div>
          </div>

          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <CheckCircle2 size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('stats.succeeded')}</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{statsQuery.data?.succeeded ?? 0}</p>
              </div>
            </div>
          </div>

          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                <ShieldAlert size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('stats.failed')}</p>
                <p className="text-2xl font-black text-red-600 dark:text-red-400">{statsQuery.data?.failed ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="overflow-hidden border-none bg-white dark:bg-[linear-gradient(135deg,#1E1627_10%,#1E1627_45%,#EB2757_300%)] text-black dark:text-white shadow-xl rounded-2x1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Play className="h-5 w-5" />
              {t('recurring.title')}
            </CardTitle>
            <CardDescription className="text-white-100/80">
              {t('recurring.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-[#EB000B] dark:text-sky-50">{t('recurring.selectLabel')}</div>
                <Select value={selectedRecurringJobId} onValueChange={setSelectedRecurringJobId}>
                  <SelectTrigger className="border-[#F7DEEE] dark:border-white/20 bg-white/10 text-black dark:text-white backdrop-blur hover:bg-white/15">
                    <SelectValue placeholder={t('recurring.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {recurringItems.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.jobName} ({job.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => selectedRecurringJobId && triggerRecurringJobMutation.mutate(selectedRecurringJobId)}
                disabled={!selectedRecurringJobId || triggerRecurringJobMutation.isPending}
                className="bg-linear-to-r from-pink-600 to-orange-600 text-white font-black hover:scale-[1.05] active:scale-[0.95] transition-all shadow-[0_10px_20px_-10px_rgba(219,39,119,0.5)] rounded-xl 
                opacity-75 grayscale-[0] 
                dark:opacity-100 dark:grayscale-0"
              >
                {triggerRecurringJobMutation.isPending ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Play size={16} className="mr-2" />
                )}
                {t('recurring.triggerButton')}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[#F6DFEE] dark:border-none bg-white/10 p-4 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#EB000B] dark:text-sky-100">
                  {t('recurring.table.id')}
                </div>
                <div className="mt-2 text-sm font-medium text-black dark:text-white">
                  {selectedRecurringJob?.id ?? '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-[#F6DFEE] dark:border-none bg-white/10 p-4 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#EB000B] dark:text-sky-100">
                  {t('recurring.table.nextExecution')}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-black dark:text-white">
                  <Clock3 className="h-4 w-4 text-sky-200" />
                  {formatDate(selectedRecurringJob?.nextExecution)}
                </div>
              </div>
              <div className="rounded-2xl border border-[#F6DFEE] dark:border-none bg-white/10 p-4 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#EB000B] dark:text-sky-100">
                  {t('recurring.table.queue')}
                </div>
                <div className="mt-2 text-sm font-medium text-black dark:text-white">
                  {selectedRecurringJob?.queue ?? '-'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border-[#F6DFEE] dark:border-white/15 bg-white/10 text-[#EB000B] dark:text-white">
                {t('recurring.labels.schedule', { defaultValue: 'Zamanlama' })}: {normalizeCron(selectedRecurringJob?.cron)}
              </Badge>
              <Badge variant="secondary" className="border-[#F6DFEE] dark:border-white/15 bg-white/10 text-[#EB000B] dark:text-white">
                {t('recurring.labels.method', { defaultValue: 'Method' })}: {selectedRecurringJob?.method ?? '-'}
              </Badge>
              {selectedRecurringJob?.error ? (
                <Badge variant="destructive">
                  {t('recurring.labels.error', { defaultValue: 'Hata var' })}
                </Badge>
              ) : (
                <Badge className="border-[#F6DFEE] dark:border-white/15 bg-white/10 text-[#EB000B] dark:text-white">
                  {t('recurring.labels.healthy', { defaultValue: 'Sağlıklı' })}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/20 bg-white dark:bg-[#1E1627] shadow-sm rounded-2x1">
          <CardHeader>
            <CardTitle>{t('summary.title', { defaultValue: 'Sistem Özeti' })}</CardTitle>
            <CardDescription>
              {t('summary.description', { defaultValue: 'Recurring job sağlığı ve kuyruk davranışını hızlıca gör.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-white/5 dark:bg-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {t('summary.totalJobs', { defaultValue: 'Toplam recurring job' })}
              </div>
              <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                {recurringHealth.total}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  {t('summary.withQueue', { defaultValue: 'Aktif Kuyruklar' })}
                </div>
                <div className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  {recurringHealth.withQueue}
                </div>
              </div>
              <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5 dark:border-red-500/20 dark:bg-red-500/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                  {t('summary.withErrors', { defaultValue: 'Hatalı İşler' })}
                </div>
                <div className="mt-1 text-2xl font-black text-red-700 dark:text-red-300">
                  {recurringHealth.withErrors}
                </div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-linear-to-br from-pink-500/5 to-orange-500/5 border border-pink-500/10 dark:from-pink-500/10 dark:to-orange-500/10">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                {t('summary.help', {
                  defaultValue: 'Bu ekran, zamanlanmış işleri hızla tetiklemek ve başarılı/başarısız job akışını tek noktadan izlemek için ürünleştirilmiştir.',
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/20 bg-white dark:bg-[#180F22] shadow-xl rounded-2xl overflow-hidden mt-6">
        <CardHeader className="px-8 py-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <Zap size={20} />
            </div>
            <div>
              <CardTitle className="text-xl font-black">{t('recurring.tableTitle', { defaultValue: 'Zamanlanmış İşler' })}</CardTitle>
              <CardDescription className="text-sm font-medium">{t('recurring.tableDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-8 py-4 border-t border-slate-100 dark:border-white/5">
          <ManagementDataTableChrome>
            <DataTableGrid<HangfireRecurringJobItemDto, RecurringColumnKey>
              columns={recurringColumns}
              visibleColumnKeys={['id', 'job', 'cron', 'nextExecution', 'lastExecution', 'queue']}
              rows={recurringRows}
              rowKey={(row: HangfireRecurringJobItemDto) => row.id}
              renderCell={renderRecurringCell}
              isLoading={recurringJobsQuery.isLoading}
              isError={recurringJobsQuery.isError}
              loadingText={t('common:loading')}
              errorText={t('common:error')}
              emptyText={t('recurring.empty')}
              minTableWidthClassName="min-w-[900px]"
              pageSize={recurringPageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => {
                setRecurringPageSize(size);
                setRecurringPage(1);
              }}
              pageNumber={recurringPage}
              totalPages={recurringTotalPages}
              hasPreviousPage={recurringPage > 1}
              hasNextPage={recurringPage < recurringTotalPages}
              onPreviousPage={() => setRecurringPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setRecurringPage((p) => Math.min(recurringTotalPages, p + 1))}
              previousLabel={t('common:previous')}
              nextLabel={t('common:next')}
              paginationInfoText={t('failed.total') + `: ${recurringJobsQuery.data?.total ?? 0}`}
              rowClassName={(row: HangfireRecurringJobItemDto) => (selectedRecurringJobId === row.id ? 'bg-pink-50 dark:bg-pink-500/10' : undefined)}
              onRowClick={(row: HangfireRecurringJobItemDto) => setSelectedRecurringJobId(row.id)}
              centerColumnHeaders
            />
          </ManagementDataTableChrome>
        </CardContent>
      </Card>

      <Card className="border-none bg-white dark:bg-[#180F22] shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="px-8 py-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <CardTitle className="text-xl font-black">{t('succeeded.title')}</CardTitle>
              <CardDescription className="text-sm font-medium">{t('succeeded.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-8 py-4 border-t border-slate-100 dark:border-white/5">
          <ManagementDataTableChrome>
            <DataTableGrid<HangfireSuccessJobItemDto, SuccessColumnKey>
              columns={successColumns}
              visibleColumnKeys={['jobId', 'jobName', 'recurringJobId', 'queue', 'duration', 'retryCount', 'time']}
              rows={successQuery.data?.items ?? []}
              rowKey={(row: HangfireSuccessJobItemDto) => `${row.jobId}-${row.finishedAt ?? ''}`}
              renderCell={renderSuccessCell}
              isLoading={successQuery.isLoading}
              isError={successQuery.isError}
              loadingText={t('common:loading')}
              errorText={t('common:error')}
              emptyText={t('succeeded.empty')}
              minTableWidthClassName="min-w-[1100px]"
              pageSize={successPageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => {
                setSuccessPageSize(size);
                setSuccessPage(1);
              }}
              pageNumber={successPage}
              totalPages={successTotalPages}
              hasPreviousPage={successPage > 1}
              hasNextPage={successPage < successTotalPages}
              onPreviousPage={() => setSuccessPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setSuccessPage((p) => Math.min(successTotalPages, p + 1))}
              previousLabel={t('common:previous')}
              nextLabel={t('common:next')}
              paginationInfoText={t('common:total') + `: ${successQuery.data?.total ?? 0}`}
              centerColumnHeaders
            />
          </ManagementDataTableChrome>
        </CardContent>
      </Card>

      <Card className="border-none bg-white dark:bg-[#180F22] shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="px-8 py-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <CardTitle className="text-xl font-black">{t('failed.title')}</CardTitle>
              <CardDescription className="text-sm font-medium">{t('failed.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-8 py-4 border-t border-slate-100 dark:border-white/5">
          <ManagementDataTableChrome>
            <DataTableGrid<HangfireFailedResponseDto['items'][number], FailedColumnKey>
              columns={failedColumns}
              visibleColumnKeys={['jobId', 'jobName', 'state', 'time', 'reason']}
              rows={failedQuery.data?.items ?? []}
              rowKey={(row: HangfireFailedResponseDto['items'][number]) => `failed-${row.jobId}-${row.failedAt ?? ''}`}
              renderCell={renderFailedCell}
              isLoading={failedQuery.isLoading}
              isError={failedQuery.isError}
              loadingText={t('common:loading')}
              errorText={t('common:error')}
              emptyText={t('failed.empty')}
              minTableWidthClassName="min-w-[980px]"
              pageSize={failedPageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => {
                setFailedPageSize(size);
                setFailedPage(1);
              }}
              pageNumber={failedPage}
              totalPages={failedTotalPages}
              hasPreviousPage={failedPage > 1}
              hasNextPage={failedPage < failedTotalPages}
              onPreviousPage={() => setFailedPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setFailedPage((p) => Math.min(failedTotalPages, p + 1))}
              previousLabel={t('common:previous')}
              nextLabel={t('common:next')}
              paginationInfoText={t('common:total') + `: ${failedQuery.data?.total ?? 0}`}
              centerColumnHeaders
            />
          </ManagementDataTableChrome>
        </CardContent>
      </Card>

      <Card className="border-none bg-white dark:bg-[#180F22] shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="px-8 py-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <CardTitle className="text-xl font-black">{t('deadLetter.title')}</CardTitle>
              <CardDescription className="text-sm font-medium">{t('deadLetter.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-8 py-4 border-t border-slate-100 dark:border-white/5">
          <div className="px-8 py-4 bg-amber-500/5 flex items-center gap-3">
            <div className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
              {t('deadLetter.enqueued')}: {deadLetterQuery.data?.enqueued ?? 0}
            </div>
          </div>
          <ManagementDataTableChrome>
            <DataTableGrid<HangfireFailedResponseDto['items'][number], FailedColumnKey>
              columns={failedColumns}
              visibleColumnKeys={['jobId', 'jobName', 'state', 'time', 'reason']}
              rows={deadLetterQuery.data?.items ?? []}
              rowKey={(row: HangfireFailedResponseDto['items'][number]) => `dead-${row.jobId}-${row.enqueuedAt ?? ''}`}
              renderCell={(row: HangfireFailedResponseDto['items'][number], key: FailedColumnKey) => {
                if (key === 'state') return <Badge variant="secondary" className="font-black text-[10px]">{row.state || 'ENQUEUED'}</Badge>;
                if (key === 'time') return <div className="text-xs">{formatDate(row.enqueuedAt)}</div>;
                return renderFailedCell(row, key);
              }}
              isLoading={deadLetterQuery.isLoading}
              isError={deadLetterQuery.isError}
              loadingText={t('common:loading')}
              errorText={t('common:error')}
              emptyText={t('deadLetter.empty')}
              minTableWidthClassName="min-w-[980px]"
              pageSize={deadLetterPageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => {
                setDeadLetterPageSize(size);
                setDeadLetterPage(1);
              }}
              pageNumber={deadLetterPage}
              totalPages={deadLetterTotalPages}
              hasPreviousPage={deadLetterPage > 1}
              hasNextPage={deadLetterPage < deadLetterTotalPages}
              onPreviousPage={() => setDeadLetterPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setDeadLetterPage((p) => Math.min(deadLetterTotalPages, p + 1))}
              previousLabel={t('common:previous')}
              nextLabel={t('common:next')}
              paginationInfoText={t('common:total') + `: ${deadLetterQuery.data?.total ?? 0}`}
              centerColumnHeaders
            />
          </ManagementDataTableChrome>
        </CardContent>
      </Card>
    </div >
  );
}
