import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUIStore } from '@/stores/ui-store';
import { Loader2, RefreshCw } from 'lucide-react';
import { useWhatsappLogsQuery } from '../hooks/useWhatsappLogsQuery';

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

export function WhatsappLogsPage(): ReactElement {
  const { t } = useTranslation(['whatsapp-integration', 'common']);
  const { setPageTitle } = useUIStore();
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [direction, setDirection] = useState<string>('all');

  const query = useWhatsappLogsQuery({
    pageNumber,
    pageSize: 20,
    search,
    errorsOnly,
    direction: direction === 'all' ? undefined : direction,
    sortBy: 'createdDate',
    sortDirection: 'desc',
  });

  useEffect(() => {
    setPageTitle(t('logs.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const logs = query.data?.data ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const hasNext = query.data?.hasNextPage === true;
  const hasPrevious = query.data?.hasPreviousPage === true;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('logs.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('logs.description')}</p>
      </div>

      <Card className="rounded-2xl border-white/60 bg-white/75 shadow-sm backdrop-blur-xl">
        <CardHeader>
          <CardTitle>{t('logs.tableTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPageNumber(1);
                }}
                placeholder={t('logs.searchPlaceholder')}
                className="w-full sm:w-72"
              />
              <Select
                value={direction}
                onValueChange={(value) => {
                  setDirection(value);
                  setPageNumber(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('logs.directionAll')}</SelectItem>
                  <SelectItem value="Inbound">{t('logs.inbound')}</SelectItem>
                  <SelectItem value="Outbound">{t('logs.outbound')}</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={errorsOnly}
                  onCheckedChange={(checked) => {
                    setErrorsOnly(checked);
                    setPageNumber(1);
                  }}
                />
                {t('logs.errorsOnly')}
              </label>
            </div>
            <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t('common:refresh')}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('logs.columns.date')}</TableHead>
                  <TableHead>{t('logs.columns.direction')}</TableHead>
                  <TableHead>{t('logs.columns.operation')}</TableHead>
                  <TableHead>{t('logs.columns.phone')}</TableHead>
                  <TableHead>{t('logs.columns.message')}</TableHead>
                  <TableHead>{t('logs.columns.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {t('logs.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(log.createdDate)}</TableCell>
                      <TableCell>
                        <Badge variant={log.direction === 'Outbound' ? 'default' : 'secondary'}>
                          {log.direction === 'Outbound' ? t('logs.outbound') : t('logs.inbound')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.operation}</TableCell>
                      <TableCell>{log.phoneNumber || '-'}</TableCell>
                      <TableCell className="max-w-[420px] truncate">{log.message || log.errorCode || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={log.isSuccess ? 'default' : 'destructive'}>
                          {log.isSuccess ? t('logs.success') : t('logs.error')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('logs.total', { count: totalCount })}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!hasPrevious} onClick={() => setPageNumber((value) => Math.max(1, value - 1))}>
                {t('common:previous')}
              </Button>
              <span>{pageNumber}</span>
              <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPageNumber((value) => value + 1)}>
                {t('common:next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
