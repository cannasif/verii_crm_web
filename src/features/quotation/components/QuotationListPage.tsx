import { lazy, Suspense, type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Edit2, GitBranchPlus, Mail, Plus } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import {
  DataTableGrid,
  ManagementDataTableChrome,
  type DataTableActionBarProps,
  type DataTableGridColumn,
} from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuotationList } from '../hooks/useQuotationList';
import { quotationApi } from '../api/quotation-api';
import { QUOTATION_QUERY_KEYS } from '../utils/query-keys';
import type { QuotationGetDto } from '../types/quotation-types';
import type { PagedFilter } from '@/types/api';
import { formatCurrency } from '../utils/format-currency';
import { ApprovalStatusBadge } from '@/features/approval/components/ApprovalStatusBadge';
import type { ApprovalStatus } from '@/features/approval/types/approval-types';
import { useCreateRevisionOfQuotation } from '../hooks/useCreateRevisionOfQuotation';
const GoogleCustomerMailDialog = lazy(() =>
  import('@/features/google-integration/components/GoogleCustomerMailDialog').then((module) => ({ default: module.GoogleCustomerMailDialog }))
);
const OutlookCustomerMailDialog = lazy(() =>
  import('@/features/outlook-integration/components/OutlookCustomerMailDialog').then((module) => ({ default: module.OutlookCustomerMailDialog }))
);

const PAGE_KEY = 'quotation-list';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type QuotationColumnKey =
  | 'Id'
  | 'OfferNo'
  | 'RevisionNo'
  | 'PotentialCustomerName'
  | 'ErpCustomerCode'
  | 'RepresentativeName'
  | 'OfferDate'
  | 'ValidUntil'
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
  { key: 'RevisionNo', labelKey: 'quotation.list.revisionNo', fallbackLabel: 'Revize No', filterType: 'string' },
  { key: 'PotentialCustomerName', labelKey: 'quotation.list.customer', fallbackLabel: 'Müşteri', filterType: 'string' },
  { key: 'ErpCustomerCode', labelKey: 'quotation.list.customerCode', fallbackLabel: 'Cari Kodu', filterType: 'string' },
  { key: 'RepresentativeName', labelKey: 'quotation.list.representative', fallbackLabel: 'Temsilci', filterType: 'string' },
  { key: 'OfferDate', labelKey: 'quotation.list.offerDate', fallbackLabel: 'Tarih', filterType: 'date' },
  { key: 'ValidUntil', labelKey: 'quotation.list.validUntil', fallbackLabel: 'Geçerlilik', filterType: 'date' },
  { key: 'Currency', labelKey: 'quotation.list.currency', fallbackLabel: 'Para Birimi', filterType: 'string' },
  { key: 'GrandTotal', labelKey: 'quotation.list.grandTotal', fallbackLabel: 'Toplam', filterType: 'number' },
  { key: 'Status', labelKey: 'quotation.list.status', fallbackLabel: 'Durum', filterType: 'number' },
];

function resolveLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  key: string,
  fallback: string
): string {
  const MISSING_TRANSLATION = 'Çeviri eksik';
  const ns = key.split('.')[0];
  const translated = t(key, { ns });
  if (!translated || translated === MISSING_TRANSLATION || translated === key) return fallback;
  return translated;
}

export function QuotationListPage(): ReactElement {
  const { t, i18n } = useTranslation(['quotation', 'common', 'approval', 'google-integration']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();
  const createRevisionMutation = useCreateRevisionOfQuotation();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<QuotationColumnKey>('Id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('all');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [outlookMailDialogOpen, setOutlookMailDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationGetDto | null>(null);

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
    setPageTitle(t('list.title'));
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
    search: searchTerm || undefined,
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

  const getCurrencyLabel = useCallback(
    (quotation: QuotationGetDto): string => quotation.currencyDisplay || quotation.currencyCode || quotation.currency || '-',
    []
  );

  const getGrandTotalLabel = useCallback(
    (quotation: QuotationGetDto): string => {
      if (quotation.grandTotalDisplay) {
        return quotation.grandTotalDisplay;
      }

      const amount = typeof quotation.grandTotal === 'number' ? quotation.grandTotal : Number(quotation.grandTotal);
      if (Number.isNaN(amount)) {
        return '-';
      }

      return formatCurrency(amount, quotation.currencyCode || quotation.currency || 'TRY');
    },
    []
  );

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
      currentPageRows.map((quotation) => ({
        Id: quotation.id,
        OfferNo: quotation.offerNo ?? '-',
        RevisionNo: quotation.revisionNo ?? '-',
        PotentialCustomerName: quotation.potentialCustomerName ?? '-',
        ErpCustomerCode: quotation.erpCustomerCode ?? '-',
        RepresentativeName: quotation.representativeName ?? '-',
        OfferDate: quotation.offerDate ? new Date(quotation.offerDate).toLocaleDateString(i18n.language) : '-',
        ValidUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString(i18n.language) : '-',
        Currency: getCurrencyLabel(quotation),
        GrandTotal: getGrandTotalLabel(quotation),
        Status:
          typeof quotation.status === 'number' && quotation.status >= 0 && quotation.status <= 4
            ? t(`approval.status.${['notRequired', 'waiting', 'approved', 'rejected', 'closed'][quotation.status]}`)
            : '-',
      })),
    [currentPageRows, t, i18n.language, getCurrencyLabel, getGrandTotalLabel]
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
    const list = await fetchAllPagedData({
      fetchPage: (exportPageNumber, exportPageSize) =>
        quotationApi.getList({
          pageNumber: exportPageNumber,
          pageSize: exportPageSize,
          search: searchTerm || undefined,
          sortBy,
          sortDirection,
          ...filtersParam,
        }),
    });
    return {
      columns: exportColumns,
      rows: list.map((quotation: QuotationGetDto) => ({
        Id: quotation.id,
        OfferNo: quotation.offerNo ?? '-',
        RevisionNo: quotation.revisionNo ?? '-',
        PotentialCustomerName: quotation.potentialCustomerName ?? '-',
        ErpCustomerCode: quotation.erpCustomerCode ?? '-',
        RepresentativeName: quotation.representativeName ?? '-',
        OfferDate: quotation.offerDate ? new Date(quotation.offerDate).toLocaleDateString(i18n.language) : '-',
        ValidUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString(i18n.language) : '-',
        Currency: getCurrencyLabel(quotation),
        GrandTotal: getGrandTotalLabel(quotation),
        Status:
          typeof quotation.status === 'number' && quotation.status >= 0 && quotation.status <= 4
            ? t(`approval.status.${['notRequired', 'waiting', 'approved', 'rejected', 'closed'][quotation.status]}`)
            : '-',
      })),
    };
  }, [exportColumns, searchTerm, sortBy, sortDirection, filtersParam, t, i18n.language, getCurrencyLabel, getGrandTotalLabel]);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, sortBy, sortDirection, approvalStatusFilter, appliedFilters, searchTerm]);

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
    if (key === 'RevisionNo') return quotation.revisionNo || '-';
    if (key === 'PotentialCustomerName') return quotation.potentialCustomerName || '-';
    if (key === 'ErpCustomerCode') return quotation.erpCustomerCode || '-';
    if (key === 'RepresentativeName') return quotation.representativeName || '-';
    if (key === 'OfferDate') return formatDate(quotation.offerDate);
    if (key === 'ValidUntil') return formatDate(quotation.validUntil);
    if (key === 'Currency') return getCurrencyLabel(quotation);
    if (key === 'GrandTotal') return getGrandTotalLabel(quotation);
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

  const handleGridRefresh = async (): Promise<void> => {
    setSearchTerm('');
    setSearchResetKey((value) => value + 1);
    setApprovalStatusFilter('all');
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
    setPageNumber(1);
    await handleRefresh();
  };

  const handleRowClick = (quotationId: number): void => {
    navigate(`/quotations/${quotationId}`);
  };

  const handleRevision = async (event: React.MouseEvent, quotationId: number): Promise<void> => {
    event.stopPropagation();
    try {
      const result = await createRevisionMutation.mutateAsync(quotationId);
      if (result.success && result.data?.id) {
        navigate(`/quotations/${result.data.id}`);
      }
    } catch {
      void 0;
    }
  };

  const handleOpenMailDialog = (event: React.MouseEvent, quotation: QuotationGetDto): void => {
    event.stopPropagation();
    setSelectedQuotation(quotation);
    setMailDialogOpen(true);
  };

  const handleOpenOutlookMailDialog = (event: React.MouseEvent, quotation: QuotationGetDto): void => {
    event.stopPropagation();
    setSelectedQuotation(quotation);
    setOutlookMailDialogOpen(true);
  };

  const renderActionsCell = (quotation: QuotationGetDto): ReactElement => (
    <div className="flex items-center justify-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate(`/quotations/${quotation.id}`)}>
        <Edit2 className="h-4 w-4 mr-1" />
        {t('list.detail', { defaultValue: 'Detay' })}
      </Button>
      <Button variant="outline" size="sm" onClick={(event) => handleOpenMailDialog(event, quotation)}>
        <Mail className="h-4 w-4 mr-1" />
        {t('list.sendGmail', { defaultValue: 'Gmail Gonder' })}
      </Button>
      <Button variant="outline" size="sm" onClick={(event) => handleOpenOutlookMailDialog(event, quotation)}>
        <Mail className="h-4 w-4 mr-1" />
        {t('list.sendOutlook', { defaultValue: 'Outlook Gonder' })}
      </Button>
      {(quotation.status === 0 || quotation.status === 3) && (
        <Button
          variant="outline"
          size="sm"
          onClick={(event) => {
            void handleRevision(event, quotation.id);
          }}
          disabled={createRevisionMutation.isPending}
        >
          <GitBranchPlus className="h-4 w-4 mr-1" />
          {createRevisionMutation.isPending
            ? t('loading')
            : t('list.revise', { defaultValue: 'Revize Et' })}
        </Button>
      )}
    </div>
  );

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

      <div className="relative z-10 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-2">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {t('list.title')}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
              {t('list.description')}
            </p>
          </div>
          <Button
            onClick={() => navigate('/quotations/create')}
            className="h-11 px-6 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all duration-300 border-0 hover:text-white group opacity-75 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            {t('list.createNew')}
          </Button>
        </div>

        <div className="relative z-10 w-full">
          <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
            <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
              <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
                {t('list.cardTitle', { defaultValue: 'Teklif listesi' })}
              </CardTitle>
            </CardHeader>
            <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
              <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
                <ManagementDataTableChrome>
                  <DataTableGrid<QuotationGetDto, QuotationColumnKey>
                    actionBar={{
                      pageKey: PAGE_KEY,
                      userId: user?.id,
                      columns: baseColumns,
                      visibleColumns,
                      columnOrder,
                      onVisibleColumnsChange: setVisibleColumns,
                      onColumnOrderChange: setColumnOrder,
                      exportFileName: 'quotation-list',
                      exportColumns,
                      exportRows,
                      getExportData,
                      filterColumns,
                      defaultFilterColumn: 'OfferNo',
                      draftFilterRows,
                      onDraftFilterRowsChange: setDraftFilterRows,
                      onApplyFilters: () => setAppliedFilterRows(draftFilterRows),
                      onClearFilters: () => {
                        setDraftFilterRows([]);
                        setAppliedFilterRows([]);
                      },
                      translationNamespace: 'quotation',
                      appliedFilterCount: appliedFilters.length,
                      search: {
                        onSearchChange: setSearchTerm,
                        placeholder: t('common.search', { ns: 'common' }),
                        minLength: 1,
                        resetKey: searchResetKey,
                      },
                      refresh: {
                        onRefresh: () => {
                          void handleGridRefresh();
                        },
                        isLoading: quotationQuery.isFetching,
                        cooldownSeconds: 60,
                        label: t('list.refresh', { defaultValue: 'Yenile' }),
                      },
                      leftSlot: (
                        <>
                          <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
                            <SelectTrigger className="w-[180px] h-9">
                              <SelectValue placeholder={t('approval.statusFilterLabel', { defaultValue: 'Onay durumu' })} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('common.all', { ns: 'common' })}</SelectItem>
                              <SelectItem value="0">{t('approval.status.notRequired')}</SelectItem>
                              <SelectItem value="1">{t('approval.status.waiting')}</SelectItem>
                              <SelectItem value="2">{t('approval.status.approved')}</SelectItem>
                              <SelectItem value="3">{t('approval.status.rejected')}</SelectItem>
                              <SelectItem value="4">{t('approval.status.closed')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      ),
                    } satisfies DataTableActionBarProps}
                    columns={columns}
                    visibleColumnKeys={orderedVisibleColumns}
                    rows={currentPageRows}
                    rowKey={(row: QuotationGetDto) => String(row.id)}
                    renderCell={renderCell}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    onSort={onSort}
                    renderSortIcon={renderSortIcon}
                    isLoading={quotationQuery.isLoading || quotationQuery.isFetching}
                    isError={quotationQuery.isError}
                    loadingText={t('loading')}
                    errorText={t('loadError', { defaultValue: 'Veriler yüklenirken hata oluştu.' })}
                    emptyText={t('noData')}
                    minTableWidthClassName="min-w-[920px] lg:min-w-[1100px]"
                    showActionsColumn
                    actionsHeaderLabel={t('list.actions')}
                    renderActionsCell={renderActionsCell}
                    iconOnlyActions={false}
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
                    previousLabel={t('previous')}
                    nextLabel={t('next')}
                    paginationInfoText={t('common.paginationInfo', {
                      ns: 'common',
                      start: startRow,
                      end: endRow,
                      total: totalCount,
                    })}
                    disablePaginationButtons={quotationQuery.isFetching}
                    centerColumnHeaders
                  />
                </ManagementDataTableChrome>
              </div>
            </CardContent>
          </Card>
        </div>
        <Suspense fallback={null}>
          {mailDialogOpen && selectedQuotation ? (
            <GoogleCustomerMailDialog
              open={mailDialogOpen}
              onOpenChange={setMailDialogOpen}
              moduleKey="quotation"
              recordId={selectedQuotation.id}
              customerId={selectedQuotation.potentialCustomerId}
              contactId={selectedQuotation.contactId}
              customerName={selectedQuotation.potentialCustomerName}
              customerCode={selectedQuotation.erpCustomerCode}
              recordNo={selectedQuotation.offerNo}
              revisionNo={selectedQuotation.revisionNo}
              totalAmountDisplay={selectedQuotation.grandTotalDisplay ?? undefined}
              validUntil={selectedQuotation.validUntil}
              recordOwnerName={selectedQuotation.representativeName}
            />
          ) : null}
          {outlookMailDialogOpen && selectedQuotation ? (
            <OutlookCustomerMailDialog
              open={outlookMailDialogOpen}
              onOpenChange={setOutlookMailDialogOpen}
              moduleKey="quotation"
              recordId={selectedQuotation.id}
              customerId={selectedQuotation.potentialCustomerId}
              contactId={selectedQuotation.contactId}
              customerName={selectedQuotation.potentialCustomerName}
              customerCode={selectedQuotation.erpCustomerCode}
              recordNo={selectedQuotation.offerNo}
              revisionNo={selectedQuotation.revisionNo}
              totalAmountDisplay={selectedQuotation.grandTotalDisplay ?? undefined}
              validUntil={selectedQuotation.validUntil}
              recordOwnerName={selectedQuotation.representativeName}
            />
          ) : null}
        </Suspense>
      </div>
    </div>
  );
}
