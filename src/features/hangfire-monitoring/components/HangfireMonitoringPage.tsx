import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';
import {
  useHangfireDeadLetterQuery,
  useHangfireFailedJobsQuery,
  useHangfireStatsQuery,
} from '../hooks/useHangfireMonitoring';

const PAGE_SIZE = 20;

function formatDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export function HangfireMonitoringPage(): ReactElement {
  const { t } = useTranslation(['hangfire-monitoring', 'common']);
  const { setPageTitle } = useUIStore();

  const [failedPage, setFailedPage] = useState(1);
  const [deadLetterPage, setDeadLetterPage] = useState(1);

  const failedFrom = (failedPage - 1) * PAGE_SIZE;
  const deadLetterFrom = (deadLetterPage - 1) * PAGE_SIZE;

  const statsQuery = useHangfireStatsQuery();
  const failedQuery = useHangfireFailedJobsQuery(failedFrom, PAGE_SIZE);
  const deadLetterQuery = useHangfireDeadLetterQuery(deadLetterFrom, PAGE_SIZE);

  useEffect(() => {
    setPageTitle(t('title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const isRefreshing = statsQuery.isRefetching || failedQuery.isRefetching || deadLetterQuery.isRefetching;

  const handleRefresh = async (): Promise<void> => {
    await Promise.all([
      statsQuery.refetch(),
      failedQuery.refetch(),
      deadLetterQuery.refetch(),
    ]);
  };

  const failedTotalPages = Math.max(1, Math.ceil((failedQuery.data?.total ?? 0) / PAGE_SIZE));
  const deadLetterHasNext = (deadLetterQuery.data?.items?.length ?? 0) === PAGE_SIZE;

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
          <CardTitle>{t('failed.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.jobId')}</TableHead>
                  <TableHead>{t('table.jobName')}</TableHead>
                  <TableHead>{t('table.state')}</TableHead>
                  <TableHead>{t('table.time')}</TableHead>
                  <TableHead>{t('table.reason')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(failedQuery.data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                      {t('failed.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  (failedQuery.data?.items ?? []).map((item) => (
                    <TableRow key={`failed-${item.jobId}`}>
                      <TableCell className="font-mono text-xs">{item.jobId}</TableCell>
                      <TableCell>{item.jobName}</TableCell>
                      <TableCell><Badge variant="destructive">{item.state || 'Failed'}</Badge></TableCell>
                      <TableCell>{formatDate(item.failedAt)}</TableCell>
                      <TableCell className="max-w-[360px] truncate" title={item.reason}>{item.reason || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {t('failed.total')}: {failedQuery.data?.total ?? 0}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={failedPage <= 1} onClick={() => setFailedPage((p) => Math.max(1, p - 1))}>
                {t('common:common.previous')}
              </Button>
              <Button variant="outline" size="sm" disabled={failedPage >= failedTotalPages} onClick={() => setFailedPage((p) => Math.min(failedTotalPages, p + 1))}>
                {t('common:common.next')}
              </Button>
            </div>
          </div>
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

          <div className="rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.jobId')}</TableHead>
                  <TableHead>{t('table.jobName')}</TableHead>
                  <TableHead>{t('table.state')}</TableHead>
                  <TableHead>{t('table.time')}</TableHead>
                  <TableHead>{t('table.reason')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(deadLetterQuery.data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                      {t('deadLetter.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  (deadLetterQuery.data?.items ?? []).map((item) => (
                    <TableRow key={`dead-${item.jobId}`}>
                      <TableCell className="font-mono text-xs">{item.jobId}</TableCell>
                      <TableCell>{item.jobName}</TableCell>
                      <TableCell><Badge variant="secondary">{item.state || 'Enqueued'}</Badge></TableCell>
                      <TableCell>{formatDate(item.enqueuedAt)}</TableCell>
                      <TableCell className="max-w-[360px] truncate" title={item.reason}>{item.reason || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" disabled={deadLetterPage <= 1} onClick={() => setDeadLetterPage((p) => Math.max(1, p - 1))}>
              {t('common:common.previous')}
            </Button>
            <Button variant="outline" size="sm" disabled={!deadLetterHasNext} onClick={() => setDeadLetterPage((p) => p + 1)}>
              {t('common:common.next')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
