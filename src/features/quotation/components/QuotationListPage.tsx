import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QuotationTable } from './QuotationTable';
import { useQuotationList } from '../hooks/useQuotationList';
import { QUOTATION_QUERY_KEYS } from '../utils/query-keys';
import type { QuotationGetDto } from '../types/quotation-types';
import type { PagedFilter } from '@/types/api';
import { formatCurrency } from '../utils/format-currency';
import { ApprovalStatusBadge } from '@/features/approval/components/ApprovalStatusBadge';
import type { ApprovalStatus } from '@/features/approval/types/approval-types';

const PAGE_KEY = 'quotation-list';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type QuotationColumnKey =
  | 'Id'
  | 'OfferNo'
  | 'PotentialCustomerName'
  | 'RepresentativeName'
  | 'OfferDate'
  | 'Currency'
  | 'GrandTotal'
  | 'Status';
type SortDirection = 'asc' | 'desc';

type QuotationColumnConfig = {
  key: QuotationColumnKey;
  labelKey: string;
  fallbackLabel: string;
  filterType: FilterColumnConfig['type'];
};

const QUOTATION_COLUMN_CONFIG: readonly QuotationColumnConfig[] = [
  { key: 'Id', labelKey: 'quotation.list.id', fallbackLabel: 'ID', filterType: 'number' },
  { key: 'OfferNo', labelKey: 'quotation.list.offerNo', fallbackLabel: 'Teklif No', filterType: 'string' },
  { key: 'PotentialCustomerName', labelKey: 'quotation.list.customer', fallbackLabel: 'Müşteri', filterType: 'string' },
  { key: 'RepresentativeName', labelKey: 'quotation.list.representative', fallbackLabel: 'Temsilci', filterType: 'string' },
  { key: 'OfferDate', labelKey: 'quotation.list.offerDate', fallbackLabel: 'Tarih', filterType: 'date' },
  { key: 'Currency', labelKey: 'quotation.list.currency', fallbackLabel: 'Para Birimi', filterType: 'string' },
  { key: 'GrandTotal', labelKey: 'quotation.list.grandTotal', fallbackLabel: 'Toplam', filterType: 'number' },
  { key: 'Status', labelKey: 'quotation.list.status', fallbackLabel: 'Durum', filterType: 'number' },
];

function resolveLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function QuotationListPage(): ReactElement {
  const { t, i18n } = useTranslation(['quotation', 'common', 'approval', 'google-integration']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<QuotationColumnKey>('Id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('all');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const baseColumns = useMemo(
    () =>
      QUOTATION_COLUMN_CONFIG.map((col) => ({
        key: col.key,
        label: resolveLabel(t, col.labelKey, col.fallbackLabel),
      })),
    [t]
  );

  const columns = useMemo<DataTableGridColumn<QuotationColumnKey>[]>(
    () =>
      baseColumns.map((col) => ({
        ...col,
        headClassName: col.key === 'GrandTotal' ? 'text-right' : undefined,
        cellClassName:
          col.key === 'GrandTotal' ? 'text-right font-semibold' : col.key === 'Id' ? 'font-medium' : undefined,
        sortable: true,
      })),
    [baseColumns]
  );

  const defaultColumnKeys = useMemo(() => baseColumns.map((col) => col.key), [baseColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('quotation.list.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys, 'Id');
    setColumnOrder(prefs.order);
    setVisibleColumns(prefs.visibleKeys);
  }, [defaultColumnKeys, user?.id]);

  const appliedFilters = useMemo(() => {
    const fromRows = rowsToBackendFilters(appliedFilterRows);
    if (approvalStatusFilter !== 'all') {
      return [...fromRows, { column: 'Status', operator: 'equals', value: approvalStatusFilter }];
    }
    return fromRows;
  }, [appliedFilterRows, approvalStatusFilter]);

  const filtersParam: { filters?: PagedFilter[] } =
    appliedFilters.length > 0 ? { filters: appliedFilters } : {};

  const quotationQuery = useQuotationList({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    ...filtersParam,
  });
  const quotationExportQuery = useQuotationList({
    pageNumber: 1,
    pageSize: 10000,
    sortBy,
    sortDirection,
    ...filtersParam,
  });

  const pagedData = quotationQuery.data;
  const currentPageRows = useMemo(() => pagedData?.data ?? [], [pagedData?.data]);
  const totalCount = pagedData?.totalCount ?? 0;
  const hasNextPage = pagedData?.hasNextPage ?? false;
  const hasPreviousPage = pagedData?.hasPreviousPage ?? pageNumber > 1;
  const totalPages = pagedData?.totalPages ?? 1;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as QuotationColumnKey[];

  const filterColumns = useMemo<FilterColumnConfig[]>(
    () =>
      QUOTATION_COLUMN_CONFIG.map((col) => ({
        value: col.key,
        type: col.filterType,
        labelKey: col.labelKey,
      })),
    []
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      (quotationExportQuery.data?.data ?? currentPageRows).map((quotation) => ({
        Id: quotation.id,
        OfferNo: quotation.offerNo ?? '-',
        PotentialCustomerName: quotation.potentialCustomerName ?? '-',
        RepresentativeName: quotation.representativeName ?? '-',
        OfferDate: quotation.offerDate ? new Date(quotation.offerDate).toLocaleDateString(i18n.language) : '-',
        Currency: quotation.currency ?? '-',
        GrandTotal: formatCurrency(quotation.grandTotal, quotation.currency ?? 'TRY'),
        Status:
          typeof quotation.status === 'number' && quotation.status >= 0 && quotation.status <= 4
            ? t(`approval.status.${['notRequired', 'waiting', 'approved', 'rejected', 'closed'][quotation.status]}`)
            : '-',
      })),
    [currentPageRows, quotationExportQuery.data?.data, t, i18n.language]
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const column = baseColumns.find((item) => item.key === key);
        return { key, label: column?.label ?? key };
      }),
    [baseColumns, orderedVisibleColumns]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const { data } = await quotationExportQuery.refetch();
    const list = data?.data ?? [];
    return {
      columns: exportColumns,
      rows: list.map((quotation: QuotationGetDto) => ({
        Id: quotation.id,
        OfferNo: quotation.offerNo ?? '-',
        PotentialCustomerName: quotation.potentialCustomerName ?? '-',
        RepresentativeName: quotation.representativeName ?? '-',
        OfferDate: quotation.offerDate ? new Date(quotation.offerDate).toLocaleDateString(i18n.language) : '-',
        Currency: quotation.currency ?? '-',
        GrandTotal: formatCurrency(quotation.grandTotal, quotation.currency ?? 'TRY'),
        Status:
          typeof quotation.status === 'number' && quotation.status >= 0 && quotation.status <= 4
            ? t(`approval.status.${['notRequired', 'waiting', 'approved', 'rejected', 'closed'][quotation.status]}`)
            : '-',
      })),
    };
  }, [quotationExportQuery, exportColumns, t, i18n.language]);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, sortBy, sortDirection, approvalStatusFilter, appliedFilters]);

  const onSort = (column: QuotationColumnKey): void => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: QuotationColumnKey): ReactElement => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
    );
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(i18n.language);
  };

  const renderCell = (quotation: QuotationGetDto, key: QuotationColumnKey): ReactElement | string | number => {
    if (key === 'Id') return quotation.id;
    if (key === 'OfferNo') return quotation.offerNo || '-';
    if (key === 'PotentialCustomerName') return quotation.potentialCustomerName || '-';
    if (key === 'RepresentativeName') return quotation.representativeName || '-';
    if (key === 'OfferDate') return formatDate(quotation.offerDate);
    if (key === 'Currency') return quotation.currency || '-';
    if (key === 'GrandTotal') return formatCurrency(quotation.grandTotal, quotation.currency || 'TRY');
    if (key === 'Status') {
      return typeof quotation.status === 'number' && quotation.status >= 0 && quotation.status <= 4 ? (
        <ApprovalStatusBadge status={quotation.status as ApprovalStatus} />
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      );
    }
    return '-';
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [QUOTATION_QUERY_KEYS.QUOTATIONS] });
  };

  const handleRowClick = (quotationId: number): void => {
    navigate(`/quotations/${quotationId}`);
  };

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

      <div className="relative z-10 space-y-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-2">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {t('quotation.list.title')}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
              {t('quotation.list.description')}
            </p>
          </div>
          <Button
            onClick={() => navigate('/quotations/create')}
            className="h-11 px-6 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all duration-300 border-0 hover:text-white group"
          >
            <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            {t('quotation.list.createNew')}
          </Button>
        </div>

        <div className="relative z-10 bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl shadow-zinc-200/50 dark:shadow-none overflow-hidden p-3 sm:p-6">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="space-y-4">
              <CardTitle>{t('quotation.list.cardTitle', { defaultValue: 'Teklif listesi' })}</CardTitle>
              <DataTableActionBar
                pageKey={PAGE_KEY}
                userId={user?.id}
                columns={baseColumns}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibleColumnsChange={setVisibleColumns}
                onColumnOrderChange={setColumnOrder}
                exportFileName="quotation-list"
                exportColumns={exportColumns}
                exportRows={exportRows}
                getExportData={getExportData}
                filterColumns={filterColumns}
                defaultFilterColumn="OfferNo"
                draftFilterRows={draftFilterRows}
                onDraftFilterRowsChange={setDraftFilterRows}
                onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
                onClearFilters={() => {
                  setDraftFilterRows([]);
                  setAppliedFilterRows([]);
                }}
                translationNamespace="quotation"
                appliedFilterCount={appliedFilters.length}
                leftSlot={
                  <>
                    <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
                      <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder={t('approval.statusFilterLabel')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('common.all')}</SelectItem>
                        <SelectItem value="0">{t('approval.status.notRequired')}</SelectItem>
                        <SelectItem value="1">{t('approval.status.waiting')}</SelectItem>
                        <SelectItem value="2">{t('approval.status.approved')}</SelectItem>
                        <SelectItem value="3">{t('approval.status.rejected')}</SelectItem>
                        <SelectItem value="4">{t('approval.status.closed')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefresh()}
                      disabled={quotationQuery.isFetching}
                    >
                      {quotationQuery.isFetching ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      {t('quotation.list.refresh', { defaultValue: 'Yenile' })}
                    </Button>
                  </>
                }
              />
            </CardHeader>
            <CardContent>
              <QuotationTable
                columns={columns}
                visibleColumnKeys={orderedVisibleColumns}
                rows={currentPageRows}
                rowKey={(row: QuotationGetDto) => String(row.id)}
                renderCell={renderCell}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={onSort}
                renderSortIcon={renderSortIcon}
                isLoading={quotationQuery.isLoading}
                isError={quotationQuery.isError}
                loadingText={t('quotation.loading')}
                errorText={t('quotation.loadError', { defaultValue: 'Veriler yüklenirken hata oluştu.' })}
                emptyText={t('quotation.noData')}
                minTableWidthClassName="min-w-[920px] lg:min-w-[1100px]"
                showActionsColumn
                actionsHeaderLabel={t('quotation.list.actions')}
                rowClassName="cursor-pointer hover:bg-muted/50 transition-colors"
                onRowClick={(quotation: QuotationGetDto) => handleRowClick(quotation.id)}
                onRowDoubleClick={(quotation: QuotationGetDto) => handleRowClick(quotation.id)}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={setPageSize}
                pageNumber={pageNumber}
                totalPages={totalPages}
                hasPreviousPage={hasPreviousPage}
                hasNextPage={hasNextPage}
                onPreviousPage={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                onNextPage={() => setPageNumber((prev) => prev + 1)}
                previousLabel={t('quotation.previous')}
                nextLabel={t('quotation.next')}
                paginationInfoText={t('common.paginationInfo', {
                  start: startRow,
                  end: endRow,
                  total: totalCount,
                  ns: 'common',
                })}
                disablePaginationButtons={quotationQuery.isFetching}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
