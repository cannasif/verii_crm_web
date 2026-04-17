import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DataTableGrid,
  ManagementDataTableChrome,
  type DataTableGridColumn,
} from '@/components/shared';
import { Loader2, RefreshCw } from 'lucide-react';
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

  const isRefreshing = statsQuery.isRefetching || failedQuery.isRefetching || deadLetterQuery.isRefetching;
  const isInitialLoading =
    statsQuery.isLoading || failedQuery.isLoading || successQuery.isLoading || deadLetterQuery.isLoading || recurringJobsQuery.isLoading;

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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
            {t('description')}
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw size={18} className={isRefreshing ? 'mr-2 animate-spin' : 'mr-2'} />
          {t('refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle>{t('stats.enqueued')}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{statsQuery.data?.enqueued ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>{t('stats.processing')}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{statsQuery.data?.processing ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>{t('stats.succeeded')}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-500">{statsQuery.data?.succeeded ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>{t('stats.failed')}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-red-500">{statsQuery.data?.failed ?? 0}</CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('recurring.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('recurring.description')}
          </p>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <div className="text-sm font-medium">{t('recurring.selectLabel')}</div>
              <Select value={selectedRecurringJobId} onValueChange={setSelectedRecurringJobId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('recurring.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(recurringJobsQuery.data?.items ?? []).map((job) => (
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
            >
              {triggerRecurringJobMutation.isPending ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : null}
              {t('recurring.triggerButton')}
            </Button>
          </div>

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

      <Card>
        <CardHeader>
          <CardTitle>{t('succeeded.title')}</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>{t('failed.title')}</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>{t('deadLetter.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-sm text-slate-500">
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
