import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Loader2, RefreshCw } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import { DataTableActionBar, DataTableGrid, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { OutlookIntegrationLogDto } from '../types/outlook-integration.types';
import { useOutlookLogsQuery } from '../hooks/useOutlookLogsQuery';

const PAGE_KEY = 'outlook-integration-logs';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type LogColumnKey =
  | 'createdDate'
  | 'operation'
  | 'isSuccess'
  | 'severity'
  | 'message'
  | 'errorCode'
  | 'userId'
  | 'activityId'
  | 'providerEventId';
type SortDirection = 'asc' | 'desc';

type LogColumnConfig = {
  key: LogColumnKey;
  labelKey: string;
  fallbackLabel: string;
  filterType: FilterColumnConfig['type'];
};

const LOG_COLUMN_CONFIG: readonly LogColumnConfig[] = [
  { key: 'createdDate', labelKey: 'logs.columns.date', fallbackLabel: 'Date', filterType: 'date' },
  { key: 'operation', labelKey: 'logs.columns.operation', fallbackLabel: 'Operation', filterType: 'string' },
  { key: 'isSuccess', labelKey: 'logs.columns.status', fallbackLabel: 'Status', filterType: 'boolean' },
  { key: 'severity', labelKey: 'logs.columns.severity', fallbackLabel: 'Severity', filterType: 'string' },
  { key: 'message', labelKey: 'logs.columns.message', fallbackLabel: 'Message', filterType: 'string' },
  { key: 'errorCode', labelKey: 'logs.columns.errorCode', fallbackLabel: 'Error Code', filterType: 'string' },
  { key: 'userId', labelKey: 'logs.columns.userId', fallbackLabel: 'User Id', filterType: 'number' },
  { key: 'activityId', labelKey: 'logs.columns.activityId', fallbackLabel: 'Activity Id', filterType: 'string' },
  { key: 'providerEventId', labelKey: 'logs.columns.providerEventId', fallbackLabel: 'Provider Event Id', filterType: 'string' },
];

type RowActionType = 'delete' | 'update' | 'edit';
const ROW_ACTIONS: readonly RowActionType[] = [];
const SHOW_ACTIONS_COLUMN = ROW_ACTIONS.length > 0;

function resolveLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function OutlookLogsPage(): ReactElement {
  const { t } = useTranslation(['outlook-integration', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortBy, setSortBy] = useState<LogColumnKey>('createdDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const baseColumns = useMemo(
    () =>
      LOG_COLUMN_CONFIG.map((col) => ({
        key: col.key,
        label: resolveLabel(t, col.labelKey, col.fallbackLabel),
      })),
    [t]
  );

  const columns = useMemo<DataTableGridColumn<LogColumnKey>[]>(
    () =>
      baseColumns.map((col) => ({
        ...col,
        cellClassName: col.key === 'message' ? 'max-w-[520px] truncate' : undefined,
      })),
    [baseColumns]
  );

  const defaultColumnKeys = useMemo(() => baseColumns.map((col) => col.key), [baseColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('page.logsTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setColumnOrder(prefs.order);
    setVisibleColumns(prefs.visibleKeys);
  }, [defaultColumnKeys, user?.id]);

  const appliedFilters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);

  const logsQuery = useOutlookLogsQuery({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    errorsOnly,
    filters: appliedFilters.length > 0 ? appliedFilters : undefined,
    filterLogic: 'and',
  });

  const pagedLogs = logsQuery.data;
  const currentPageRows = useMemo(() => pagedLogs?.data ?? [], [pagedLogs?.data]);
  const totalCount = pagedLogs?.totalCount ?? 0;
  const hasNextPage = pagedLogs?.hasNextPage ?? false;
  const hasPreviousPage = pagedLogs?.hasPreviousPage ?? pageNumber > 1;
  const totalPages = pagedLogs?.totalPages ?? 1;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as LogColumnKey[];

  const filterColumns = useMemo<FilterColumnConfig[]>(
    () =>
      LOG_COLUMN_CONFIG.map((col) => ({
        value: col.key,
        type: col.filterType,
        labelKey: col.labelKey,
      })),
    []
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const column = baseColumns.find((item) => item.key === key);
        return {
          key,
          label: column?.label ?? key,
        };
      }),
    [baseColumns, orderedVisibleColumns]
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      currentPageRows.map((log) => ({
        createdDate: new Date(log.createdDate).toLocaleString(),
        operation: log.operation,
        isSuccess: log.isSuccess ? t('logs.success') : t('logs.failed'),
        severity: log.severity,
        message: log.message ?? '-',
        errorCode: log.errorCode ?? '-',
        userId: log.userId ?? '-',
        activityId: log.activityId ?? '-',
        providerEventId: log.providerEventId ?? '-',
      })),
    [currentPageRows, t]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, sortBy, sortDirection, errorsOnly, appliedFilters]);

  const onSort = (column: LogColumnKey): void => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: LogColumnKey): ReactElement => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }

    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
    );
  };

  const renderCell = (log: OutlookIntegrationLogDto, key: LogColumnKey): ReactElement | string | number => {
    if (key === 'createdDate') return new Date(log.createdDate).toLocaleString();
    if (key === 'operation') return log.operation;
    if (key === 'isSuccess') {
      return log.isSuccess ? (
        <Badge variant="default">{t('logs.success')}</Badge>
      ) : (
        <Badge variant="destructive">{t('logs.failed')}</Badge>
      );
    }
    if (key === 'severity') return <Badge variant="secondary">{log.severity}</Badge>;
    if (key === 'message') return log.message || '-';
    if (key === 'errorCode') return log.errorCode || '-';
    if (key === 'userId') return log.userId ?? '-';
    if (key === 'activityId') return log.activityId ?? '-';
    if (key === 'providerEventId') return log.providerEventId || '-';
    return '-';
  };

  const [selectedLog, setSelectedLog] = useState<OutlookIntegrationLogDto | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleOpenDetails = (log: OutlookIntegrationLogDto): void => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleCloseDetails = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setDetailsOpen(false);
      setSelectedLog(null);
    } else {
      setDetailsOpen(true);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('page.logsTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('page.logsDescription')}</p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>{t('logs.cardTitle')}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="outlook-integration-logs"
            exportColumns={exportColumns}
            exportRows={exportRows}
            filterColumns={filterColumns}
            defaultFilterColumn="operation"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="outlook-integration"
            appliedFilterCount={appliedFilters.length}
            leftSlot={
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="outlook-logs-errors-only"
                    checked={errorsOnly}
                    onCheckedChange={(checked) => setErrorsOnly(Boolean(checked))}
                  />
                  <Label htmlFor="outlook-logs-errors-only" className="text-sm cursor-pointer">
                    {t('logs.errorsOnly')}
                  </Label>
                </div>
                <Button variant="outline" size="sm" onClick={() => logsQuery.refetch()} disabled={logsQuery.isFetching}>
                  {logsQuery.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {t('logs.refresh')}
                </Button>
              </>
            }
          />
        </CardHeader>
        <CardContent>
          <DataTableGrid<OutlookIntegrationLogDto, LogColumnKey>
            columns={columns}
            visibleColumnKeys={orderedVisibleColumns}
            rows={currentPageRows}
            rowKey={(row) => row.id}
            renderCell={renderCell}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={onSort}
            renderSortIcon={renderSortIcon}
            isLoading={logsQuery.isLoading}
            isError={logsQuery.isError}
            loadingText={t('logs.loading')}
            errorText={t('logs.loadError')}
            emptyText={t('logs.empty')}
            minTableWidthClassName="min-w-[1200px]"
            showActionsColumn={SHOW_ACTIONS_COLUMN}
            actionsHeaderLabel={t('logs.actions')}
            renderActionsCell={(log) => (
              <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                  onClick={() => handleOpenDetails(log)}
                  title={t('logs.viewDetails')}
                >
                  <Eye size={16} />
                </Button>
              </div>
            )}
            rowClassName={(_log) =>
              `group hover:bg-pink-50/40 dark:hover:bg-pink-500/5 transition-colors duration-200 ${
                !SHOW_ACTIONS_COLUMN ? 'cursor-pointer' : ''
              }`
            }
            onRowClick={!SHOW_ACTIONS_COLUMN ? handleOpenDetails : undefined}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
            pageNumber={pageNumber}
            totalPages={totalPages}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            onPreviousPage={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
            onNextPage={() => setPageNumber((prev) => prev + 1)}
            previousLabel={t('logs.previous')}
            nextLabel={t('logs.next')}
            paginationInfoText={t('common.paginationInfo', {
              start: startRow,
              end: endRow,
              total: totalCount,
              ns: 'common',
            })}
            disablePaginationButtons={logsQuery.isFetching}
          />
        </CardContent>
      </Card>

      {selectedLog && (
        <Dialog open={detailsOpen} onOpenChange={handleCloseDetails}>
          <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
            <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50">
              <DialogTitle className="text-lg font-semibold">
                {t('logs.detailsTitle')}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                {t('logs.detailsDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('logs.columns.date')}
                  </span>
                  <span className="font-mono">
                    {new Date(selectedLog.createdDate).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('logs.columns.operation')}
                  </span>
                  <span className="break-all">
                    {selectedLog.operation}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('logs.columns.status')}
                  </span>
                  <div>
                    {selectedLog.isSuccess ? (
                      <Badge variant="default">{t('logs.success')}</Badge>
                    ) : (
                      <Badge variant="destructive">{t('logs.failed')}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('logs.columns.severity')}
                  </span>
                  <Badge variant="secondary" className="w-fit">
                    {selectedLog.severity}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('logs.columns.errorCode')}
                  </span>
                  <span className="break-all">
                    {selectedLog.errorCode || '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('logs.columns.userId')}
                  </span>
                  <span>
                    {selectedLog.userId ?? '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('logs.columns.activityId')}
                  </span>
                  <span>
                    {selectedLog.activityId ?? '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('logs.columns.providerEventId')}
                  </span>
                  <span className="break-all">
                    {selectedLog.providerEventId || '-'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('logs.columns.message')}
                </span>
                <div className="rounded-lg border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 max-h-60 overflow-auto text-xs whitespace-pre-wrap">
                  {selectedLog.message || '-'}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
