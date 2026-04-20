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
import { Loader2, RefreshCw, Activity, Play, ShieldAlert, Clock3, CheckCircle2 } from 'lucide-react';
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

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type FailedColumnKey = 'jobId' | 'jobName' | 'state' | 'time' | 'reason';
type SuccessColumnKey = 'jobId' | 'jobName' | 'recurringJobId' | 'queue' | 'duration' | 'retryCount' | 'time';
type RecurringColumnKey = 'id' | 'job' | 'cron' | 'nextExecution' | 'lastExecution' | 'queue';

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
    if (key === 'id') return item.id;
    if (key === 'job') {
      return (
        <div>
          <div className="font-medium">{item.jobName}</div>
          {item.method ? <div className="text-xs text-slate-500">{item.method}</div> : null}
          {item.error ? <div className="text-xs text-red-500">{item.error}</div> : null}
        </div>
      );
    }
    if (key === 'cron') return item.cron || '-';
    if (key === 'nextExecution') return formatDate(item.nextExecution);
    if (key === 'lastExecution') return formatDate(item.lastExecution);
    if (key === 'queue') return item.queue || '-';
    return '-';
  };

  const renderFailedCell = (item: HangfireFailedResponseDto['items'][number], key: FailedColumnKey): ReactElement | string => {
    if (key === 'jobId') return item.jobId || '-';
    if (key === 'jobName') return item.jobName || '-';
    if (key === 'state') return <Badge variant="destructive">{item.state || 'Failed'}</Badge>;
    if (key === 'time') return formatDate(item.failedAt);
    if (key === 'reason') return item.reason || '-';
    return '-';
  };

  const renderSuccessCell = (item: HangfireSuccessJobItemDto, key: SuccessColumnKey): ReactElement | string | number => {
    if (key === 'jobId') return item.jobId || '-';
    if (key === 'jobName') return item.jobName || '-';
    if (key === 'recurringJobId') return item.recurringJobId || '-';
    if (key === 'queue') return item.queue || '-';
    if (key === 'duration') return formatDuration(item.durationMs);
    if (key === 'retryCount') return item.retryCount;
    if (key === 'time') return formatDate(item.finishedAt);
    return '-';
  };

  if (isInitialLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('common:loading')}</p>
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

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-linear-to-br from-white via-cyan-50/70 to-pink-50/70 p-5 shadow-sm dark:border-cyan-800/30 dark:from-blue-950/70 dark:via-blue-950/90 dark:to-cyan-950/40 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-white/80 px-3 py-1.5 text-xs font-black text-cyan-700 shadow-sm dark:border-cyan-800/40 dark:bg-blue-950/60 dark:text-cyan-300">
              <Activity className="size-4" />
              {t('hero.badge', { defaultValue: 'Job Kontrol Merkezi' })}
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {t('title')}
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                {t('description')}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="rounded-2xl">
            <RefreshCw size={18} className={isRefreshing ? 'mr-2 animate-spin' : 'mr-2'} />
            {t('refresh')}
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-slate-200/70 bg-white/85 shadow-sm dark:border-white/10 dark:bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">{t('stats.enqueued')}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-black text-slate-900 dark:text-white">
              {statsQuery.data?.enqueued ?? 0}
            </CardContent>
          </Card>
          <Card className="border-slate-200/70 bg-white/85 shadow-sm dark:border-white/10 dark:bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">{t('stats.processing')}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-black text-slate-900 dark:text-white">
              {statsQuery.data?.processing ?? 0}
            </CardContent>
          </Card>
          <Card className="border-slate-200/70 bg-white/85 shadow-sm dark:border-white/10 dark:bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {t('stats.succeeded')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-black text-emerald-600">
              {statsQuery.data?.succeeded ?? 0}
            </CardContent>
          </Card>
          <Card className="border-slate-200/70 bg-white/85 shadow-sm dark:border-white/10 dark:bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-slate-500">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                {t('stats.failed')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-black text-red-600">
              {statsQuery.data?.failed ?? 0}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0ea5e9_100%)] text-white shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Play className="h-5 w-5" />
              {t('recurring.title')}
            </CardTitle>
            <CardDescription className="text-sky-100">
              {t('recurring.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-sky-50">{t('recurring.selectLabel')}</div>
                <Select value={selectedRecurringJobId} onValueChange={setSelectedRecurringJobId}>
                  <SelectTrigger className="border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/15">
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
                className="bg-white text-slate-900 hover:bg-slate-100"
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
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                  {t('recurring.table.id')}
                </div>
                <div className="mt-2 text-sm font-medium text-white">
                  {selectedRecurringJob?.id ?? '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                  {t('recurring.table.nextExecution')}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                  <Clock3 className="h-4 w-4 text-sky-200" />
                  {formatDate(selectedRecurringJob?.nextExecution)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                  {t('recurring.table.queue')}
                </div>
                <div className="mt-2 text-sm font-medium text-white">
                  {selectedRecurringJob?.queue ?? '-'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
                {t('recurring.labels.schedule', { defaultValue: 'Zamanlama' })}: {normalizeCron(selectedRecurringJob?.cron)}
              </Badge>
              <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
                {t('recurring.labels.method', { defaultValue: 'Method' })}: {selectedRecurringJob?.method ?? '-'}
              </Badge>
              {selectedRecurringJob?.error ? (
                <Badge variant="destructive">
                  {t('recurring.labels.error', { defaultValue: 'Hata var' })}
                </Badge>
              ) : (
                <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
                  {t('recurring.labels.healthy', { defaultValue: 'Sağlıklı' })}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle>{t('summary.title', { defaultValue: 'Sistem Özeti' })}</CardTitle>
            <CardDescription>
              {t('summary.description', { defaultValue: 'Recurring job sağlığı ve kuyruk davranışını hızlıca gör.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {t('summary.totalJobs', { defaultValue: 'Toplam recurring job' })}
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {recurringHealth.total}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                  {t('summary.withQueue', { defaultValue: 'Queue bilgisi olan' })}
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-200">
                  {recurringHealth.withQueue}
                </div>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700 dark:text-red-300">
                  {t('summary.withErrors', { defaultValue: 'Hata veren recurring job' })}
                </div>
                <div className="mt-2 text-2xl font-black text-red-700 dark:text-red-200">
                  {recurringHealth.withErrors}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
              {t('summary.help', {
                defaultValue: 'Bu ekran, zamanlanmış işleri hızla tetiklemek ve başarılı/başarısız job akışını tek noktadan izlemek için ürünleştirilmiştir.',
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle>{t('recurring.tableTitle', { defaultValue: 'Recurring Job Listesi' })}</CardTitle>
          <CardDescription>
            {t('recurring.tableDescription', { defaultValue: 'Zamanlanmış işleri tablo görünümünde incele, satır seç ve üstteki kontrol alanından tetikle.' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            />
          </ManagementDataTableChrome>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle>{t('succeeded.title')}</CardTitle>
          <CardDescription>
            {t('succeeded.description', { defaultValue: 'Tamamlanan job geçmişini, süre ve retry bilgisiyle izle.' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              paginationInfoText={t('failed.total') + `: ${successQuery.data?.total ?? 0}`}
            />
          </ManagementDataTableChrome>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle>{t('failed.title')}</CardTitle>
          <CardDescription>
            {t('failed.description', { defaultValue: 'Hata alan işleri, zaman ve neden bilgisiyle izleyin.' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              paginationInfoText={t('failed.total') + `: ${failedQuery.data?.total ?? 0}`}
            />
          </ManagementDataTableChrome>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle>{t('deadLetter.title')}</CardTitle>
          <CardDescription>
            {t('deadLetter.description', { defaultValue: 'Dead-letter kuyruğuna düşen kayıtları tek yerde takip et.' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            {t('deadLetter.enqueued')}: {deadLetterQuery.data?.enqueued ?? 0}
          </div>

          <ManagementDataTableChrome>
            <DataTableGrid<HangfireFailedResponseDto['items'][number], FailedColumnKey>
              columns={failedColumns}
              visibleColumnKeys={['jobId', 'jobName', 'state', 'time', 'reason']}
              rows={deadLetterQuery.data?.items ?? []}
              rowKey={(row: HangfireFailedResponseDto['items'][number]) => `dead-${row.jobId}-${row.enqueuedAt ?? ''}`}
              renderCell={(row: HangfireFailedResponseDto['items'][number], key: FailedColumnKey) => {
                if (key === 'state') return <Badge variant="secondary">{row.state || 'Enqueued'}</Badge>;
                if (key === 'time') return formatDate(row.enqueuedAt);
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
              paginationInfoText={t('failed.total') + `: ${deadLetterQuery.data?.total ?? 0}`}
            />
          </ManagementDataTableChrome>
        </CardContent>
      </Card>
    </div>
  );
}
