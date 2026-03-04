import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import { DataTableActionBar } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type { GoogleIntegrationLogDto } from '../types/google-integration.types';
import { useGoogleLogsQuery } from '../hooks/useGoogleLogsQuery';

const PAGE_KEY = 'google-integration-logs';
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
  | 'googleCalendarEventId';
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
  { key: 'activityId', labelKey: 'logs.columns.activityId', fallbackLabel: 'Activity Id', filterType: 'number' },
  { key: 'googleCalendarEventId', labelKey: 'logs.columns.googleCalendarEventId', fallbackLabel: 'Google Event Id', filterType: 'string' },
];

function resolveLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function GoogleLogsPage(): ReactElement {
  const { t } = useTranslation(['google-integration', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortBy, setSortBy] = useState<LogColumnKey>('createdDate');
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
      LOG_COLUMN_CONFIG.map((col) => ({
        key: col.key,
        label: resolveLabel(t, col.labelKey, col.fallbackLabel),
      })),
    [t]
  );

  const defaultColumnKeys = useMemo(() => columns.map((col) => col.key), [columns]);
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

  const logsQuery = useGoogleLogsQuery({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    errorsOnly,
    filters: appliedFilters.length > 0 ? appliedFilters : undefined,
    filterLogic: 'and',
  });

  const pagedLogs = logsQuery.data;
  const currentPageRows = pagedLogs?.data ?? [];
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
        operation: log.operation,
        isSuccess: log.isSuccess ? t('logs.success') : t('logs.failed'),
        severity: log.severity,
        message: log.message ?? '-',
        errorCode: log.errorCode ?? '-',
        userId: log.userId ?? '-',
        activityId: log.activityId ?? '-',
        googleCalendarEventId: log.googleCalendarEventId ?? '-',
      })),
    [currentPageRows, t]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, sortBy, sortDirection, errorsOnly, appliedFilters]);

  const onRefresh = () => {
    logsQuery.refetch();
  };

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

  const renderCell = (log: GoogleIntegrationLogDto, key: LogColumnKey): ReactElement | string | number => {
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
    if (key === 'googleCalendarEventId') return log.googleCalendarEventId || '-';
    return '-';
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
            columns={columns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="google-integration-logs"
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
            translationNamespace="google-integration"
            appliedFilterCount={appliedFilters.length}
            leftSlot={
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="google-logs-errors-only"
                    checked={errorsOnly}
                    onCheckedChange={(checked) => setErrorsOnly(Boolean(checked))}
                  />
                  <Label htmlFor="google-logs-errors-only" className="text-sm cursor-pointer">
                    {t('logs.errorsOnly')}
                  </Label>
                </div>
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={logsQuery.isFetching}>
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
        <CardContent className="space-y-4">
          <div
            ref={tableScrollRef}
            className={`rounded-md border overflow-x-auto ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            onClickCapture={handleClickCapture}
          >
            <Table className="min-w-[1200px]">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={orderedVisibleColumns.length || 1} className="text-center text-muted-foreground py-8">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t('logs.loading')}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!logsQuery.isLoading && logsQuery.isError && (
                  <TableRow>
                    <TableCell colSpan={orderedVisibleColumns.length || 1} className="text-center text-red-600 py-8">
                      {t('logs.loadError')}
                    </TableCell>
                  </TableRow>
                )}

                {!logsQuery.isLoading && !logsQuery.isError && currentPageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={orderedVisibleColumns.length || 1} className="text-center text-muted-foreground py-8">
                      {t('logs.empty')}
                    </TableCell>
                  </TableRow>
                )}

                {currentPageRows.map((log) => (
                  <TableRow key={log.id}>
                    {orderedVisibleColumns.map((key) => (
                      <TableCell
                        key={`${log.id}-${key}`}
                        className={key === 'message' ? 'max-w-[520px] truncate' : undefined}
                        title={key === 'message' ? log.message ?? undefined : undefined}
                      >
                        {renderCell(log, key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-3">
                    <span>{pageSize}</span>
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-24">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <DropdownMenuItem key={size} onClick={() => setPageSize(size)}>
                      {size}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="text-xs text-muted-foreground">
                {t('common.paginationInfo', {
                  start: startRow,
                  end: endRow,
                  total: totalCount,
                  ns: 'common',
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                disabled={!hasPreviousPage}
              >
                {t('logs.previous')}
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {pageNumber} / {Math.max(totalPages, 1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageNumber((prev) => prev + 1)}
                disabled={!hasNextPage}
              >
                {t('logs.next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
