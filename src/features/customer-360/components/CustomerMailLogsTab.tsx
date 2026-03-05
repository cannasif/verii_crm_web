import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Eye, Loader2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import { DataTableActionBar } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { googleIntegrationApi } from '@/features/google-integration/api/google-integration.api';
import type { GoogleCustomerMailLogDto } from '@/features/google-integration/types/google-integration.types';

const PAGE_KEY = 'customer-360-mail-logs';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type SortDirection = 'asc' | 'desc';
type MailLogColumnKey =
  | 'createdDate'
  | 'sentByUserName'
  | 'toEmails'
  | 'subject'
  | 'isSuccess'
  | 'templateName'
  | 'errorCode';

type MailLogColumnConfig = {
  key: MailLogColumnKey;
  labelKey: string;
  fallbackLabel: string;
  filterType: FilterColumnConfig['type'];
};

const MAIL_LOG_COLUMN_CONFIG: readonly MailLogColumnConfig[] = [
  { key: 'createdDate', labelKey: 'customer360.mail.columns.date', fallbackLabel: 'Tarih', filterType: 'date' },
  { key: 'sentByUserName', labelKey: 'customer360.mail.columns.sender', fallbackLabel: 'Gönderen', filterType: 'string' },
  { key: 'toEmails', labelKey: 'customer360.mail.columns.to', fallbackLabel: 'Alıcı', filterType: 'string' },
  { key: 'subject', labelKey: 'customer360.mail.columns.subject', fallbackLabel: 'Konu', filterType: 'string' },
  { key: 'isSuccess', labelKey: 'customer360.mail.columns.status', fallbackLabel: 'Durum', filterType: 'boolean' },
  { key: 'templateName', labelKey: 'customer360.mail.columns.template', fallbackLabel: 'Şablon', filterType: 'string' },
  { key: 'errorCode', labelKey: 'customer360.mail.columns.errorCode', fallbackLabel: 'Hata Kodu', filterType: 'string' },
];

interface CustomerMailLogsTabProps {
  customerId: number;
}

export function CustomerMailLogsTab({ customerId }: CustomerMailLogsTabProps): ReactElement {
  const { t } = useTranslation(['customer360', 'google-integration', 'common']);
  const { user } = useAuthStore();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortBy, setSortBy] = useState<MailLogColumnKey>('createdDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
    pointerId: -1,
  });

  const columns = useMemo(
    () =>
      MAIL_LOG_COLUMN_CONFIG.map((col) => ({
        key: col.key,
        label: t(col.labelKey, { defaultValue: col.fallbackLabel }),
      })),
    [t]
  );

  const defaultColumnKeys = useMemo(() => columns.map((col) => col.key), [columns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setColumnOrder(prefs.order);
    setVisibleColumns(prefs.visibleKeys);
  }, [defaultColumnKeys, user?.id]);

  const appliedFilters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);

  const logsQuery = useQuery({
    queryKey: ['customer-360', 'mail-logs', customerId, pageNumber, pageSize, sortBy, sortDirection, errorsOnly, JSON.stringify(appliedFilters)],
    queryFn: () =>
      googleIntegrationApi.getCustomerMailLogs({
        customerId,
        pageNumber,
        pageSize,
        sortBy,
        sortDirection,
        errorsOnly,
        filters: appliedFilters.length > 0 ? appliedFilters : undefined,
        filterLogic: 'and',
      }),
    enabled: customerId > 0,
  });

  const pagedLogs = logsQuery.data;
  const currentPageRows = pagedLogs?.data ?? [];
  const totalCount = pagedLogs?.totalCount ?? 0;
  const hasNextPage = pagedLogs?.hasNextPage ?? false;
  const hasPreviousPage = pagedLogs?.hasPreviousPage ?? pageNumber > 1;
  const totalPages = pagedLogs?.totalPages ?? 1;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as MailLogColumnKey[];

  const filterColumns = useMemo<FilterColumnConfig[]>(
    () =>
      MAIL_LOG_COLUMN_CONFIG.map((col) => ({
        value: col.key,
        type: col.filterType,
        labelKey: col.labelKey,
      })),
    []
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const column = columns.find((item) => item.key === key);
        return {
          key,
          label: column?.label ?? key,
        };
      }),
    [columns, orderedVisibleColumns]
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      currentPageRows.map((log) => ({
        createdDate: new Date(log.createdDate).toLocaleString(),
        sentByUserName: log.sentByUserName ?? '-',
        toEmails: log.toEmails,
        subject: log.subject,
        isSuccess: log.isSuccess ? t('google-integration:logs.success') : t('google-integration:logs.failed'),
        templateName: log.templateName ?? '-',
        errorCode: log.errorCode ?? '-',
      })),
    [currentPageRows, t]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, sortBy, sortDirection, errorsOnly, appliedFilters]);

  const onRefresh = () => logsQuery.refetch();

  const onSort = (column: MailLogColumnKey): void => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: MailLogColumnKey): ReactElement => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-foreground" />
      : <ArrowDown className="h-3.5 w-3.5 text-foreground" />;
  };

  const isInteractiveTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest(
        'button, a, input, select, textarea, label, [role="button"], [data-no-drag-scroll="true"]'
      )
    );
  };

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;

    const container = tableScrollRef.current;
    if (!container) return;

    dragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
      moved: false,
      pointerId: event.pointerId,
    };
    setIsDragging(true);
    container.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const container = tableScrollRef.current;
    if (!container || !dragStateRef.current.isDragging) return;
    if (dragStateRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragStateRef.current.startX;
    if (Math.abs(deltaX) > 4) {
      dragStateRef.current.moved = true;
    }
    container.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
  };

  const handleDragEnd = (): void => {
    dragStateRef.current.isDragging = false;
    dragStateRef.current.pointerId = -1;
    setIsDragging(false);
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (!dragStateRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current.moved = false;
  };

  const [selectedLog, setSelectedLog] = useState<GoogleCustomerMailLogDto | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleOpenDetails = (log: GoogleCustomerMailLogDto): void => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const renderCell = (log: GoogleCustomerMailLogDto, key: MailLogColumnKey): ReactElement | string => {
    if (key === 'createdDate') return new Date(log.createdDate).toLocaleString();
    if (key === 'sentByUserName') return log.sentByUserName ?? '-';
    if (key === 'toEmails') return log.toEmails || '-';
    if (key === 'subject') return log.subject || '-';
    if (key === 'isSuccess') {
      return log.isSuccess ? (
        <Badge variant="default">{t('google-integration:logs.success')}</Badge>
      ) : (
        <Badge variant="destructive">{t('google-integration:logs.failed')}</Badge>
      );
    }
    if (key === 'templateName') return log.templateName ?? '-';
    if (key === 'errorCode') return log.errorCode ?? '-';
    return '-';
  };

  return (
    <Card className="rounded-xl border border-slate-200 dark:border-white/10">
      <CardContent className="pt-6 space-y-4">
        <DataTableActionBar
          pageKey={PAGE_KEY}
          userId={user?.id}
          columns={columns}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
          onVisibleColumnsChange={setVisibleColumns}
          onColumnOrderChange={setColumnOrder}
          exportFileName="customer-360-mail-logs"
          exportColumns={exportColumns}
          exportRows={exportRows}
          filterColumns={filterColumns}
          defaultFilterColumn="subject"
          draftFilterRows={draftFilterRows}
          onDraftFilterRowsChange={setDraftFilterRows}
          onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
          onClearFilters={() => {
            setDraftFilterRows([]);
            setAppliedFilterRows([]);
          }}
          translationNamespace="google-integration"
          appliedFilterCount={appliedFilters.length}
          leftSlot={(
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="customer-mail-logs-errors-only"
                  checked={errorsOnly}
                  onCheckedChange={(checked) => setErrorsOnly(Boolean(checked))}
                />
                <Label htmlFor="customer-mail-logs-errors-only" className="text-sm cursor-pointer">
                  {t('google-integration:logs.errorsOnly')}
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={logsQuery.isFetching}>
                {logsQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {t('google-integration:logs.refresh')}
              </Button>
            </>
          )}
        />

        <div
          ref={tableScrollRef}
          className={`rounded-md border overflow-x-auto ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          onClickCapture={handleClickCapture}
        >
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                {orderedVisibleColumns.map((key) => {
                  const column = columns.find((item) => item.key === key);
                  return (
                    <TableHead key={key}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSort(key)}
                        className="h-7 px-1 -ml-1 hover:bg-transparent"
                      >
                        <span>{column?.label ?? key}</span>
                        {renderSortIcon(key)}
                      </Button>
                    </TableHead>
                  );
                })}
                <TableHead className="text-right w-[84px]">
                  {t('google-integration:logs.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={orderedVisibleColumns.length + 1} className="text-center text-muted-foreground py-8">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('google-integration:logs.loading')}</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!logsQuery.isLoading && logsQuery.isError && (
                <TableRow>
                  <TableCell colSpan={orderedVisibleColumns.length + 1} className="text-center text-red-600 py-8">
                    {t('google-integration:logs.loadError')}
                  </TableCell>
                </TableRow>
              )}

              {!logsQuery.isLoading && !logsQuery.isError && currentPageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={orderedVisibleColumns.length + 1} className="text-center text-muted-foreground py-8">
                    {t('google-integration:logs.empty')}
                  </TableCell>
                </TableRow>
              )}

              {currentPageRows.map((log) => (
                <TableRow key={log.id} className="group">
                  {orderedVisibleColumns.map((key) => (
                    <TableCell key={`${log.id}-${key}`}>{renderCell(log, key)}</TableCell>
                  ))}
                  <TableCell className="text-right" data-no-drag-scroll="true">
                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                        onClick={() => handleOpenDetails(log)}
                        title={t('google-integration:logs.viewDetails')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-3">
                  {pageSize}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <DropdownMenuItem key={size} onClick={() => setPageSize(size)}>
                    {size}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-muted-foreground">
              {startRow}-{endRow}/{totalCount} kayıt
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
              disabled={!hasPreviousPage || logsQuery.isFetching}
            >
              {t('google-integration:logs.previous')}
            </Button>
            <span className="text-sm text-muted-foreground min-w-[56px] text-center">
              {pageNumber}/{Math.max(totalPages, 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageNumber((prev) => prev + 1)}
              disabled={!hasNextPage || logsQuery.isFetching}
            >
              {t('google-integration:logs.next')}
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('google-integration:logs.detailsTitle')}</DialogTitle>
            <DialogDescription>{t('google-integration:logs.detailsDescription')}</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><span className="font-medium">{t('mail.columns.date', { ns: 'customer360' })}:</span> {new Date(selectedLog.createdDate).toLocaleString()}</div>
                <div><span className="font-medium">{t('mail.columns.sender', { ns: 'customer360' })}:</span> {selectedLog.sentByUserName ?? '-'}</div>
                <div><span className="font-medium">{t('mail.columns.to', { ns: 'customer360' })}:</span> {selectedLog.toEmails || '-'}</div>
                <div><span className="font-medium">{t('mail.columns.status', { ns: 'customer360' })}:</span> {selectedLog.isSuccess ? t('google-integration:logs.success') : t('google-integration:logs.failed')}</div>
              </div>
              <div><span className="font-medium">{t('mail.columns.subject', { ns: 'customer360' })}:</span> {selectedLog.subject || '-'}</div>
              <div>
                <span className="font-medium">{t('mail.columns.body', { ns: 'customer360' })}:</span>
                <div className="mt-1 rounded-md border bg-muted/30 p-3 whitespace-pre-wrap break-words">
                  {selectedLog.body || selectedLog.bodyPreview || '-'}
                </div>
              </div>
              {!selectedLog.isSuccess && (
                <div className="text-red-600">
                  <span className="font-medium">{t('mail.columns.errorCode', { ns: 'customer360' })}:</span> {selectedLog.errorCode || '-'}
                  {selectedLog.errorMessage ? (
                    <div className="mt-1 rounded-md border border-red-200 bg-red-50 p-2 text-red-700 whitespace-pre-wrap break-words">
                      {selectedLog.errorMessage}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
