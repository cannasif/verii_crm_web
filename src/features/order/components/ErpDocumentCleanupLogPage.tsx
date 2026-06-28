import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DataTableActionBar,
  DataTableGrid,
  ManagementDataTableChrome,
  ManagementListPageHeader,
  type DataTableGridColumn,
} from '@/components/shared';
import type { FilterColumnConfig, FilterRow } from '@/lib/advanced-filter-types';
import { rowsToBackendFilters } from '@/lib/advanced-filter-types';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { arraysEqual, cn } from '@/lib/utils';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { erpDocumentCleanupLogApi } from '../api/erp-document-cleanup-log-api';
import { useErpDocumentCleanupLogs } from '../hooks/useErpDocumentCleanupLogs';
import type { ErpCleanupDocumentType, ErpCleanupOperationStatus, ErpDocumentCleanupLog } from '../types/erp-document-cleanup-log-types';

type CleanupLogColumnKey =
  | 'createdDate'
  | 'documentType'
  | 'sourceDocumentNumber'
  | 'erpDocumentNumber'
  | 'newDocumentNumber'
  | 'overallStatus'
  | 'erpDeleteStatus'
  | 'requestedByUserFullName'
  | 'cleanupReason';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const EMPTY_ROWS: ErpDocumentCleanupLog[] = [];
const PAGE_KEY = 'erp-document-cleanup-logs';

type CleanupLogSortDirection = 'asc' | 'desc';

const CLEANUP_LOG_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'sourceDocumentNumber', labelKey: 'erpCleanupLogs.columns.sourceDocumentNumber', type: 'string' },
  { value: 'erpDocumentNumber', labelKey: 'erpCleanupLogs.columns.erpDocumentNumber', type: 'string' },
  { value: 'newDocumentNumber', labelKey: 'erpCleanupLogs.columns.newDocumentNumber', type: 'string' },
  { value: 'requestedByUserFullName', labelKey: 'erpCleanupLogs.columns.requestedByUserFullName', type: 'string' },
  { value: 'cleanupReason', labelKey: 'erpCleanupLogs.columns.cleanupReason', type: 'string' },
];

function getDocumentTypeLabel(type: ErpCleanupDocumentType, t: TFunction): string {
  switch (type) {
    case 1:
      return t('erpCleanupLogs.documentTypes.demand', { defaultValue: 'Talep' });
    case 2:
      return t('erpCleanupLogs.documentTypes.offer', { defaultValue: 'Teklif' });
    case 3:
      return t('erpCleanupLogs.documentTypes.order', { defaultValue: 'Sipariş' });
    default:
      return '-';
  }
}

function getStatusLabel(status: ErpCleanupOperationStatus, t: TFunction): string {
  switch (status) {
    case 0:
      return t('erpCleanupLogs.statuses.notStarted', { defaultValue: 'Başlamadı' });
    case 1:
      return t('erpCleanupLogs.statuses.pending', { defaultValue: 'Bekliyor' });
    case 2:
      return t('erpCleanupLogs.statuses.success', { defaultValue: 'Başarılı' });
    case 3:
      return t('erpCleanupLogs.statuses.error', { defaultValue: 'Hatalı' });
    default:
      return '-';
  }
}

function getStatusVariant(status: ErpCleanupOperationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 2) return 'default';
  if (status === 3) return 'destructive';
  if (status === 1) return 'secondary';
  return 'outline';
}

function formatDate(value?: string | null, locale?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
}

export function ErpDocumentCleanupLogPage(): ReactElement {
  const { t, i18n } = useTranslation(['common']);
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<CleanupLogColumnKey>('createdDate');
  const [sortDirection, setSortDirection] = useState<CleanupLogSortDirection>('desc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [filterLogic, setFilterLogic] = useState<'and' | 'or'>('and');

  useEffect(() => {
    setPageTitle(t('sidebar.erpDocumentCleanupLogs', { defaultValue: 'ERP Kayıt Temizleme Logları' }));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const appliedFilters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);

  const request = useMemo(
    () => ({
      pageNumber,
      pageSize,
      search: searchTerm || undefined,
      sortBy,
      sortDirection,
      filters: appliedFilters,
      filterLogic,
    }),
    [appliedFilters, filterLogic, pageNumber, pageSize, searchTerm, sortBy, sortDirection]
  );

  const logsQuery = useErpDocumentCleanupLogs(request);
  const rows = logsQuery.data?.data ?? EMPTY_ROWS;
  const totalPages = logsQuery.data?.totalPages ?? 1;
  const totalCount = logsQuery.data?.totalCount ?? 0;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);

  const columns = useMemo<DataTableGridColumn<CleanupLogColumnKey>[]>(
    () => [
      {
        key: 'createdDate',
        label: t('erpCleanupLogs.columns.date', { defaultValue: 'Tarih' }),
        sortable: true,
        cellClassName: 'whitespace-nowrap font-medium text-slate-700 dark:text-slate-200',
      },
      {
        key: 'documentType',
        label: t('erpCleanupLogs.columns.documentType', { defaultValue: 'Belge Tipi' }),
        sortable: true,
        cellClassName: 'whitespace-nowrap',
      },
      {
        key: 'sourceDocumentNumber',
        label: t('erpCleanupLogs.columns.sourceDocumentNumber', { defaultValue: 'Eski Belge No' }),
        sortable: true,
        cellClassName: 'font-mono text-xs font-semibold text-slate-900 dark:text-white',
      },
      {
        key: 'erpDocumentNumber',
        label: t('erpCleanupLogs.columns.erpDocumentNumber', { defaultValue: 'ERP No' }),
        sortable: true,
        cellClassName: 'font-mono text-xs',
      },
      {
        key: 'newDocumentNumber',
        label: t('erpCleanupLogs.columns.newDocumentNumber', { defaultValue: 'Yeni Belge No' }),
        sortable: true,
        cellClassName: 'font-mono text-xs',
      },
      {
        key: 'overallStatus',
        label: t('erpCleanupLogs.columns.overallStatus', { defaultValue: 'Durum' }),
        sortable: true,
        cellClassName: 'whitespace-nowrap',
      },
      {
        key: 'erpDeleteStatus',
        label: t('erpCleanupLogs.columns.erpDeleteStatus', { defaultValue: 'ERP Silme' }),
        sortable: true,
        cellClassName: 'whitespace-nowrap',
      },
      {
        key: 'requestedByUserFullName',
        label: t('erpCleanupLogs.columns.requestedByUserFullName', { defaultValue: 'İşlemi Yapan' }),
        sortable: true,
        cellClassName: 'min-w-[160px]',
      },
      {
        key: 'cleanupReason',
        label: t('erpCleanupLogs.columns.cleanupReason', { defaultValue: 'Silme Nedeni' }),
        sortable: false,
        cellClassName: 'min-w-[260px] max-w-[420px]',
      },
    ],
    [t]
  );

  const baseColumns = useMemo(
    () => columns.map((column) => ({ key: column.key, label: column.label })),
    [columns]
  );
  const defaultColumnKeys = useMemo(() => columns.map((column) => column.key), [columns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys, 'createdDate');
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
  }, [defaultColumnKeys, user?.id]);

  useEffect(() => {
    setPageNumber(1);
  }, [appliedFilterRows, filterLogic, pageSize, searchTerm, sortBy, sortDirection]);

  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as CleanupLogColumnKey[];

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const column = columns.find((item) => item.key === key);
        return { key, label: column?.label ?? key };
      }),
    [columns, orderedVisibleColumns]
  );

  const toExportRow = useCallback(
    (row: ErpDocumentCleanupLog): Record<string, unknown> => ({
      createdDate: formatDate(row.createdDate, i18n.language),
      documentType: getDocumentTypeLabel(row.documentType, t),
      sourceDocumentNumber: row.sourceDocumentNumber || row.sourceDocumentId,
      erpDocumentNumber: row.erpDocumentNumber || '',
      newDocumentNumber: row.newDocumentNumber || row.newDocumentId || '',
      overallStatus: getStatusLabel(row.overallStatus, t),
      erpDeleteStatus: getStatusLabel(row.erpDeleteStatus, t),
      requestedByUserFullName: row.requestedByUserFullName || row.requestedByUserId,
      cleanupReason: row.cleanupReason || '',
    }),
    [i18n.language, t]
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () => rows.map(toExportRow),
    [rows, toExportRow]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const firstPage = await erpDocumentCleanupLogApi.getList({
      ...request,
      pageNumber: 1,
      pageSize: 500,
    });
    const totalExportPages = Math.max(1, firstPage.totalPages ?? 1);
    const allRows = [...(firstPage.data ?? [])];

    for (let nextPage = 2; nextPage <= totalExportPages; nextPage += 1) {
      const page = await erpDocumentCleanupLogApi.getList({
        ...request,
        pageNumber: nextPage,
        pageSize: 500,
      });
      allRows.push(...(page.data ?? []));
    }

    return {
      columns: exportColumns,
      rows: allRows.map(toExportRow),
    };
  }, [exportColumns, request, toExportRow]);

  const renderCell = (row: ErpDocumentCleanupLog, key: CleanupLogColumnKey): React.ReactNode => {
    switch (key) {
      case 'createdDate':
        return formatDate(row.createdDate, i18n.language);
      case 'documentType':
        return <Badge variant="outline">{getDocumentTypeLabel(row.documentType, t)}</Badge>;
      case 'overallStatus':
        return <Badge variant={getStatusVariant(row.overallStatus)}>{getStatusLabel(row.overallStatus, t)}</Badge>;
      case 'erpDeleteStatus':
        return <Badge variant={getStatusVariant(row.erpDeleteStatus)}>{getStatusLabel(row.erpDeleteStatus, t)}</Badge>;
      case 'sourceDocumentNumber':
        return row.sourceDocumentNumber || row.sourceDocumentId;
      case 'newDocumentNumber':
        return row.newDocumentNumber || row.newDocumentId || '-';
      case 'erpDocumentNumber':
        return row.erpDocumentNumber || '-';
      case 'requestedByUserFullName':
        return row.requestedByUserFullName || row.requestedByUserId;
      case 'cleanupReason':
        return <span className="line-clamp-2 whitespace-normal text-slate-600 dark:text-slate-300">{row.cleanupReason || '-'}</span>;
      default:
        return '-';
    }
  };

  const onSort = (column: CleanupLogColumnKey): void => {
    const columnConfig = columns.find((item) => item.key === column);
    if (columnConfig?.sortable === false) return;
    if (sortBy === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: CleanupLogColumnKey): ReactElement => {
    const columnConfig = columns.find((item) => item.key === column);
    if (columnConfig?.sortable === false) return <></>;
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
    );
  };

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((row) => row.value.trim()).length,
    [appliedFilterRows]
  );

  const handleRefresh = (): void => {
    void logsQuery.refetch();
  };

  return (
    <div className="w-full space-y-6 relative">
      <ManagementListPageHeader
        title={t('sidebar.erpDocumentCleanupLogs', { defaultValue: 'ERP Kayıt Temizleme Logları' })}
        description={t('erpCleanupLogs.subtitle', { defaultValue: 'Talep, teklif ve siparişlerde ERP kaydı temizleme/kopyalama operasyonlarının izlenebilir kayıtları.' })}
        backLabel={t('common.back', { defaultValue: 'Geri' })}
      />

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{t('erpCleanupLogs.listTitle', { defaultValue: 'Log Listesi' })}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="erp-document-cleanup-logs"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={CLEANUP_LOG_FILTER_COLUMNS}
            defaultFilterColumn="sourceDocumentNumber"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            filterLogic={filterLogic}
            onFilterLogicChange={setFilterLogic}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
              setFilterLogic('and');
            }}
            translationNamespace="common"
            appliedFilterCount={appliedFilterCount}
            search={{
              onSearchChange: setSearchTerm,
              placeholder: t('erpCleanupLogs.searchPlaceholder', { defaultValue: 'Belge no, ERP no veya neden ara...' }),
              minLength: 1,
            }}
            refresh={{
              onRefresh: handleRefresh,
              isLoading: logsQuery.isFetching,
              label: t('common.refresh', { defaultValue: 'Yenile' }),
            }}
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={cn(MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME, 'bg-white/70 dark:bg-transparent')}>
            <ManagementDataTableChrome>
              <DataTableGrid<ErpDocumentCleanupLog, CleanupLogColumnKey>
                columns={columns}
                visibleColumnKeys={orderedVisibleColumns}
                rows={rows}
                rowKey={(row) => row.id}
                renderCell={renderCell}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={onSort}
                renderSortIcon={renderSortIcon}
                isLoading={logsQuery.isLoading || logsQuery.isFetching}
                isError={logsQuery.isError}
                loadingText={t('erpCleanupLogs.loadingText', { defaultValue: 'ERP kayıt temizleme logları yükleniyor...' })}
                errorText={logsQuery.error instanceof Error ? logsQuery.error.message : t('erpCleanupLogs.errorText', { defaultValue: 'Loglar yüklenemedi.' })}
                emptyText={t('erpCleanupLogs.emptyText', { defaultValue: 'Henüz ERP kayıt temizleme logu yok.' })}
                minTableWidthClassName="min-w-[1180px]"
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={setPageSize}
                pageNumber={pageNumber}
                totalPages={totalPages}
                hasPreviousPage={logsQuery.data?.hasPreviousPage ?? pageNumber > 1}
                hasNextPage={logsQuery.data?.hasNextPage ?? pageNumber < totalPages}
                onPreviousPage={() => setPageNumber((current) => Math.max(1, current - 1))}
                onNextPage={() => setPageNumber((current) => Math.min(totalPages, current + 1))}
                previousLabel={t('common.previous', { defaultValue: 'Önceki' })}
                nextLabel={t('common.next', { defaultValue: 'Sonraki' })}
                paginationInfoText={t('common.paginationInfo', {
                  start: startRow,
                  end: endRow,
                  total: totalCount,
                  ns: 'common',
                })}
                disablePaginationButtons={logsQuery.isFetching}
                centerColumnHeaders
                onColumnOrderChange={(newVisibleOrder) => {
                  setColumnOrder((currentOrder) => {
                    const hiddenColumns = currentOrder.filter((key) => !(newVisibleOrder as string[]).includes(key));
                    const finalOrder = [...newVisibleOrder, ...hiddenColumns];
                    saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                    return finalOrder;
                  });
                }}
              />
            </ManagementDataTableChrome>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
