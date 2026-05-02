import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Eye, Loader2, RefreshCw, SearchX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTableActionBar, DataTableGrid, ManagementDataTableChrome, type DataTableGridColumn } from '@/components/shared';
import type { FilterRow } from '@/lib/advanced-filter-types';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { auditLogApi } from '../api/auditLogApi';
import type { AuditLogDto, PagedRequest } from '../types/access-control.types';

const PAGE_KEY = 'audit-logs';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const EMPTY_ITEMS: AuditLogDto[] = [];

type AuditLogColumnKey =
  | 'createdDate'
  | 'traceId'
  | 'actionType'
  | 'entityType'
  | 'entityId'
  | 'result'
  | 'source'
  | 'performedByUserEmail'
  | 'branchCode'
  | 'requestPath';

function getResultBadgeVariant(result: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalized = result.trim().toLowerCase();
  if (normalized === 'success' || normalized === 'succeeded') return 'default';
  if (normalized === 'warning' || normalized === 'partial') return 'secondary';
  if (normalized === 'error' || normalized === 'failed') return 'destructive';
  return 'outline';
}

function formatValue(value: unknown): string {
  if (value == null) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseJsonPreview(payload?: string | null): string {
  if (!payload) return '-';
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

export function AuditLogsPage(): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [traceFilter, setTraceFilter] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<number | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'createdDate',
    'traceId',
    'actionType',
    'entityType',
    'result',
    'performedByUserEmail',
    'requestPath',
  ]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'createdDate',
    'traceId',
    'actionType',
    'entityType',
    'entityId',
    'result',
    'source',
    'performedByUserEmail',
    'branchCode',
    'requestPath',
  ]);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);

  useEffect(() => {
    setPageTitle(t('auditLogs.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const queryParams = useMemo<PagedRequest>(
    () => ({
      pageNumber,
      pageSize,
      search: searchTerm || undefined,
      sortBy: 'createdDate',
      sortDirection: 'desc',
    }),
    [pageNumber, pageSize, searchTerm]
  );

  const listQuery = useQuery({
    queryKey: ['audit-logs', traceFilter ?? 'all', queryParams],
    queryFn: () => (traceFilter ? auditLogApi.getByTraceId(traceFilter, queryParams) : auditLogApi.getList(queryParams)),
  });

  const detailQuery = useQuery({
    queryKey: ['audit-log-detail', selectedAuditLogId],
    queryFn: () => auditLogApi.getById(selectedAuditLogId as number),
    enabled: selectedAuditLogId != null,
  });

  const items = listQuery.data?.data ?? EMPTY_ITEMS;
  const totalCount = listQuery.data?.totalCount ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 1;

  const columns: DataTableGridColumn<AuditLogColumnKey>[] = useMemo(
    () => [
      { key: 'createdDate', label: t('auditLogs.table.createdDate') },
      { key: 'traceId', label: t('auditLogs.table.traceId'), cellClassName: 'font-mono text-xs' },
      { key: 'actionType', label: t('auditLogs.table.actionType') },
      { key: 'entityType', label: t('auditLogs.table.entityType') },
      { key: 'entityId', label: t('auditLogs.table.entityId') },
      { key: 'result', label: t('auditLogs.table.result') },
      { key: 'source', label: t('auditLogs.table.source') },
      { key: 'performedByUserEmail', label: t('auditLogs.table.performedBy') },
      { key: 'branchCode', label: t('auditLogs.table.branchCode') },
      { key: 'requestPath', label: t('auditLogs.table.requestPath') },
    ],
    [t]
  );

  const exportColumns = [
    { key: 'createdDate', label: t('auditLogs.table.createdDate') },
    { key: 'traceId', label: t('auditLogs.table.traceId') },
    { key: 'actionType', label: t('auditLogs.table.actionType') },
    { key: 'entityType', label: t('auditLogs.table.entityType') },
    { key: 'entityId', label: t('auditLogs.table.entityId') },
    { key: 'result', label: t('auditLogs.table.result') },
    { key: 'source', label: t('auditLogs.table.source') },
    { key: 'performedByUserEmail', label: t('auditLogs.table.performedBy') },
    { key: 'branchCode', label: t('auditLogs.table.branchCode') },
    { key: 'requestPath', label: t('auditLogs.table.requestPath') },
    { key: 'requestMethod', label: t('auditLogs.table.requestMethod') },
  ];

  const exportRows = items.map((item) => ({
    createdDate: new Date(item.createdDate).toLocaleString(),
    traceId: item.traceId,
    actionType: item.actionType,
    entityType: item.entityType ?? '-',
    entityId: item.entityId ?? '-',
    result: item.result,
    source: item.source ?? '-',
    performedByUserEmail: item.performedByUserEmail ?? '-',
    branchCode: item.branchCode ?? '-',
    requestPath: item.requestPath ?? '-',
    requestMethod: item.requestMethod ?? '-',
  }));

  const selectedAuditLog = detailQuery.data ?? items.find((item) => item.id === selectedAuditLogId) ?? null;
  const currentPageErrorCount = items.filter((item) => ['error', 'failed'].includes(item.result.trim().toLowerCase())).length;
  const currentPageTraceCount = new Set(items.map((item) => item.traceId)).size;

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    if (selectedAuditLogId != null) {
      await queryClient.invalidateQueries({ queryKey: ['audit-log-detail', selectedAuditLogId] });
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t('auditLogs.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">{t('auditLogs.description')}</p>
        </div>
        {traceFilter ? (
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setTraceFilter(null);
              setPageNumber(1);
            }}
          >
            <SearchX className="mr-2 size-4" />
            {t('auditLogs.clearTraceFilter')}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
          <CardContent className="p-5">
            <div className="text-sm text-slate-500">{t('auditLogs.stats.total')}</div>
            <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{totalCount}</div>
          </CardContent>
        </Card>
        <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
          <CardContent className="p-5">
            <div className="text-sm text-slate-500">{t('auditLogs.stats.errors')}</div>
            <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{currentPageErrorCount}</div>
          </CardContent>
        </Card>
        <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
          <CardContent className="p-5">
            <div className="text-sm text-slate-500">{t('auditLogs.stats.traces')}</div>
            <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{currentPageTraceCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{t('auditLogs.table.title')}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={columns.map((column) => ({ key: column.key as string, label: column.label }))}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="audit-logs"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={async () => ({ columns: exportColumns, rows: exportRows })}
            filterColumns={[]}
            defaultFilterColumn=""
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => undefined}
            onClearFilters={() => undefined}
            translationNamespace="access-control"
            searchValue={searchTerm}
            searchPlaceholder={t('auditLogs.search')}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setPageNumber(1);
            }}
            leftSlot={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                  onClick={() => handleRefresh()}
                  disabled={listQuery.isLoading}
                >
                  {listQuery.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {t('common.refresh', { defaultValue: 'Yenile' })}
                </Button>
                {traceFilter ? (
                  <Badge variant="secondary" className="rounded-xl px-3 py-1 font-mono text-xs">
                    {traceFilter}
                  </Badge>
                ) : null}
              </div>
            }
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <ManagementDataTableChrome>
              <DataTableGrid<AuditLogDto, AuditLogColumnKey>
                columns={columns}
                visibleColumnKeys={columnOrder.filter((key) => visibleColumns.includes(key)) as AuditLogColumnKey[]}
                rows={items}
                rowKey={(row) => row.id}
                renderCell={(row, key) => {
                  if (key === 'createdDate') {
                    return new Date(row.createdDate).toLocaleString();
                  }
                  if (key === 'result') {
                    return <Badge variant={getResultBadgeVariant(row.result)}>{row.result}</Badge>;
                  }
                  return formatValue(row[key]);
                }}
                sortBy="createdDate"
                sortDirection="desc"
                onSort={() => undefined}
                renderSortIcon={() => null}
                isLoading={listQuery.isLoading}
                isError={listQuery.isError}
                loadingText={t('common.loading')}
                errorText={t('auditLogs.loadError')}
                emptyText={t('common.noData')}
                minTableWidthClassName="min-w-[1240px]"
                showActionsColumn
                actionsHeaderLabel={t('common.actions')}
                renderActionsCell={(row) => (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-cyan-900/30 dark:hover:text-cyan-300"
                      onClick={() => setSelectedAuditLogId(row.id)}
                    >
                      <Eye className="mr-2 size-4" />
                      {t('auditLogs.viewDetail')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-slate-600 hover:bg-amber-50 hover:text-amber-700 dark:text-slate-300 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
                      onClick={() => {
                        setTraceFilter(row.traceId);
                        setPageNumber(1);
                      }}
                    >
                      {t('auditLogs.filterTrace')}
                    </Button>
                  </div>
                )}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageNumber(1);
                }}
                pageNumber={pageNumber}
                totalPages={totalPages}
                hasPreviousPage={pageNumber > 1}
                hasNextPage={pageNumber < totalPages}
                onPreviousPage={() => setPageNumber((value) => Math.max(1, value - 1))}
                onNextPage={() => setPageNumber((value) => Math.min(totalPages, value + 1))}
                previousLabel={t('common.previous')}
                nextLabel={t('common.next')}
                paginationInfoText={t('auditLogs.table.showing', {
                  from: totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1,
                  to: Math.min(pageNumber * pageSize, totalCount),
                  total: totalCount,
                })}
              />
            </ManagementDataTableChrome>
          </div>
        </CardContent>
      </Card>

      <Dialog open={selectedAuditLogId != null} onOpenChange={(open) => !open && setSelectedAuditLogId(null)}>
        <DialogContent className="w-[95vw] max-w-5xl bg-white p-0 text-slate-900 dark:bg-[#130822] dark:text-white">
          <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left dark:border-white/10">
            <DialogTitle className="text-xl font-bold tracking-tight">{t('auditLogs.detail.title')}</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              {t('auditLogs.detail.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
            {detailQuery.isLoading && selectedAuditLog == null ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : selectedAuditLog ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Card className="border-slate-200/70 shadow-none dark:border-white/10">
                    <CardContent className="space-y-2 p-4 text-sm">
                      <div className="text-slate-500">{t('auditLogs.table.traceId')}</div>
                      <div className="font-mono text-xs break-all">{selectedAuditLog.traceId}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-slate-200/70 shadow-none dark:border-white/10">
                    <CardContent className="space-y-2 p-4 text-sm">
                      <div className="text-slate-500">{t('auditLogs.table.actionType')}</div>
                      <div>{selectedAuditLog.actionType}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-slate-200/70 shadow-none dark:border-white/10">
                    <CardContent className="space-y-2 p-4 text-sm">
                      <div className="text-slate-500">{t('auditLogs.table.result')}</div>
                      <div>
                        <Badge variant={getResultBadgeVariant(selectedAuditLog.result)}>{selectedAuditLog.result}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-slate-200/70 shadow-none dark:border-white/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('auditLogs.detail.contextTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div><span className="font-semibold">{t('auditLogs.table.createdDate')}:</span> {new Date(selectedAuditLog.createdDate).toLocaleString()}</div>
                      <div><span className="font-semibold">{t('auditLogs.table.entityType')}:</span> {selectedAuditLog.entityType ?? '-'}</div>
                      <div><span className="font-semibold">{t('auditLogs.table.entityId')}:</span> {selectedAuditLog.entityId ?? '-'}</div>
                      <div><span className="font-semibold">{t('auditLogs.table.performedBy')}:</span> {selectedAuditLog.performedByUserEmail ?? '-'}</div>
                      <div><span className="font-semibold">{t('auditLogs.table.branchCode')}:</span> {selectedAuditLog.branchCode ?? '-'}</div>
                      <div><span className="font-semibold">{t('auditLogs.table.source')}:</span> {selectedAuditLog.source ?? '-'}</div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200/70 shadow-none dark:border-white/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('auditLogs.detail.requestTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div><span className="font-semibold">{t('auditLogs.table.requestMethod')}:</span> {selectedAuditLog.requestMethod ?? '-'}</div>
                      <div><span className="font-semibold">{t('auditLogs.table.requestPath')}:</span> {selectedAuditLog.requestPath ?? '-'}</div>
                      <div><span className="font-semibold">{t('auditLogs.detail.reason')}:</span> {selectedAuditLog.reason ?? '-'}</div>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                        <div>
                          <span className="font-semibold">{t('auditLogs.detail.failureReason')}:</span>{' '}
                          {selectedAuditLog.failureReason ?? '-'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-slate-200/70 shadow-none dark:border-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('auditLogs.detail.changedFieldsTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedAuditLog.changedFields.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedAuditLog.changedFields.map((field) => (
                          <Badge key={`${field.field}-${field.newValue ?? ''}`} variant="outline">
                            {field.field}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">{t('auditLogs.detail.noChangedFields')}</div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="border-slate-200/70 shadow-none dark:border-white/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('auditLogs.detail.oldValuesTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                        {parseJsonPreview(selectedAuditLog.oldValuesJson)}
                      </pre>
                    </CardContent>
                  </Card>
                  <Card className="border-slate-200/70 shadow-none dark:border-white/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('auditLogs.detail.newValuesTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                        {parseJsonPreview(selectedAuditLog.newValuesJson)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">{t('common.noData')}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
