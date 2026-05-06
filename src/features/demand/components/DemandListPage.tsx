import { lazy, Suspense, type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Edit2, Mail, PencilLine, Plus } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
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
  DataTableActionBar,
  ManagementDataTableChrome,
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
import { useDemandList } from '../hooks/useDemandList';
import { demandApi } from '../api/demand-api';
import { DEMAND_QUERY_KEYS } from '../utils/query-keys';
import type { DemandGetDto } from '../types/demand-types';
import type { PagedFilter } from '@/types/api';
import { formatCurrency } from '../utils/format-currency';
import { ApprovalStatusBadge } from '@/features/approval/components/ApprovalStatusBadge';
import type { ApprovalStatus } from '@/features/approval/types/approval-types';
import { useCreateRevisionOfDemand } from '../hooks/useCreateRevisionOfDemand';
const GoogleCustomerMailDialog = lazy(() =>
  import('@/features/google-integration/components/GoogleCustomerMailDialog').then((module) => ({ default: module.GoogleCustomerMailDialog }))
);
const OutlookCustomerMailDialog = lazy(() =>
  import('@/features/outlook-integration/components/OutlookCustomerMailDialog').then((module) => ({ default: module.OutlookCustomerMailDialog }))
);

const PAGE_KEY = 'demand-list';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type DemandColumnKey =
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

type DemandColumnConfig = {
  key: DemandColumnKey;
  labelKey: string;
  fallbackLabel: string;
  filterType: FilterColumnConfig['type'];
};

const DEMAND_COLUMN_CONFIG: readonly DemandColumnConfig[] = [
  { key: 'Id', labelKey: 'demand.list.id', fallbackLabel: 'ID', filterType: 'number' },
  { key: 'OfferNo', labelKey: 'demand.list.offerNo', fallbackLabel: 'Teklif No', filterType: 'string' },
  { key: 'RevisionNo', labelKey: 'demand.list.revisionNo', fallbackLabel: 'Revize No', filterType: 'string' },
  { key: 'PotentialCustomerName', labelKey: 'demand.list.customer', fallbackLabel: 'Müşteri', filterType: 'string' },
  { key: 'ErpCustomerCode', labelKey: 'demand.list.customerCode', fallbackLabel: 'Cari Kodu', filterType: 'string' },
  { key: 'RepresentativeName', labelKey: 'demand.list.representative', fallbackLabel: 'Temsilci', filterType: 'string' },
  { key: 'OfferDate', labelKey: 'demand.list.offerDate', fallbackLabel: 'Tarih', filterType: 'date' },
  { key: 'ValidUntil', labelKey: 'demand.list.validUntil', fallbackLabel: 'Geçerlilik', filterType: 'date' },
  { key: 'Currency', labelKey: 'demand.list.currency', fallbackLabel: 'Para Birimi', filterType: 'string' },
  { key: 'GrandTotal', labelKey: 'demand.list.grandTotal', fallbackLabel: 'Toplam', filterType: 'number' },
  { key: 'Status', labelKey: 'demand.list.status', fallbackLabel: 'Durum', filterType: 'number' },
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

export function DemandListPage(): ReactElement {
  const { t, i18n } = useTranslation(['demand', 'common', 'approval', 'google-integration']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();
  const createRevisionMutation = useCreateRevisionOfDemand();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<DemandColumnKey>('Id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('all');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [outlookMailDialogOpen, setOutlookMailDialogOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<DemandGetDto | null>(null);

  const baseColumns = useMemo(
    () =>
      DEMAND_COLUMN_CONFIG.map((col) => ({
        key: col.key,
        label: resolveLabel(t, col.labelKey, col.fallbackLabel),
      })),
    [t]
  );

  const columns = useMemo<DataTableGridColumn<DemandColumnKey>[]>(
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

  const demandQuery = useDemandList({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy,
    sortDirection,
    ...filtersParam,
  });
  const pagedData = demandQuery.data;
  const currentPageRows = useMemo(() => pagedData?.data ?? [], [pagedData?.data]);
  const totalCount = pagedData?.totalCount ?? 0;
  const hasNextPage = pagedData?.hasNextPage ?? false;
  const hasPreviousPage = pagedData?.hasPreviousPage ?? pageNumber > 1;
  const totalPages = pagedData?.totalPages ?? 1;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as DemandColumnKey[];

  const filterColumns = useMemo<FilterColumnConfig[]>(
    () =>
      DEMAND_COLUMN_CONFIG.map((col) => ({
        value: col.key,
        type: col.filterType,
        labelKey: col.labelKey,
      })),
    []
  );

  const getCurrencyLabel = useCallback((demand: DemandGetDto): string => {
    return demand.currencyDisplay || demand.currencyCode || demand.currency || '-';
  }, []);

  const getGrandTotalLabel = useCallback((demand: DemandGetDto): string => {
    if (demand.grandTotalDisplay) {
      return demand.grandTotalDisplay;
    }

    const numericGrandTotal = Number(demand.grandTotal);
    if (Number.isNaN(numericGrandTotal)) {
      return '-';
    }

    return formatCurrency(numericGrandTotal, demand.currencyCode || demand.currency || 'TRY');
  }, []);

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      currentPageRows.map((demand) => ({
        Id: demand.id,
        OfferNo: demand.offerNo ?? '-',
        RevisionNo: demand.revisionNo ?? '-',
        PotentialCustomerName: demand.potentialCustomerName ?? '-',
        ErpCustomerCode: demand.erpCustomerCode ?? '-',
        RepresentativeName: demand.representativeName ?? '-',
        OfferDate: demand.offerDate ? new Date(demand.offerDate).toLocaleDateString(i18n.language) : '-',
        ValidUntil: demand.validUntil ? new Date(demand.validUntil).toLocaleDateString(i18n.language) : '-',
        Currency: getCurrencyLabel(demand),
        GrandTotal: getGrandTotalLabel(demand),
        Status:
          typeof demand.status === 'number' && demand.status >= 0 && demand.status <= 4
            ? t(`approval.status.${['notRequired', 'waiting', 'approved', 'rejected', 'closed'][demand.status]}`)
            : '-',
      })),
    [currentPageRows, getCurrencyLabel, getGrandTotalLabel, t, i18n.language]
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
        demandApi.getList({
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
      rows: list.map((demand: DemandGetDto) => ({
        Id: demand.id,
        OfferNo: demand.offerNo ?? '-',
        RevisionNo: demand.revisionNo ?? '-',
        PotentialCustomerName: demand.potentialCustomerName ?? '-',
        ErpCustomerCode: demand.erpCustomerCode ?? '-',
        RepresentativeName: demand.representativeName ?? '-',
        OfferDate: demand.offerDate ? new Date(demand.offerDate).toLocaleDateString(i18n.language) : '-',
        ValidUntil: demand.validUntil ? new Date(demand.validUntil).toLocaleDateString(i18n.language) : '-',
        Currency: getCurrencyLabel(demand),
        GrandTotal: getGrandTotalLabel(demand),
        Status:
          typeof demand.status === 'number' && demand.status >= 0 && demand.status <= 4
            ? t(`approval.status.${['notRequired', 'waiting', 'approved', 'rejected', 'closed'][demand.status]}`)
            : '-',
      })),
    };
  }, [exportColumns, searchTerm, sortBy, sortDirection, filtersParam, getCurrencyLabel, getGrandTotalLabel, t, i18n.language]);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, sortBy, sortDirection, approvalStatusFilter, appliedFilters, searchTerm]);

  const onSort = (column: DemandColumnKey): void => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: DemandColumnKey): ReactElement => {
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

  const renderCell = (demand: DemandGetDto, key: DemandColumnKey): ReactElement | string | number => {
    if (key === 'Id') return demand.id;
    if (key === 'OfferNo') return demand.offerNo || '-';
    if (key === 'RevisionNo') return demand.revisionNo || '-';
    if (key === 'PotentialCustomerName') return demand.potentialCustomerName || '-';
    if (key === 'ErpCustomerCode') return demand.erpCustomerCode || '-';
    if (key === 'RepresentativeName') return demand.representativeName || '-';
    if (key === 'OfferDate') return formatDate(demand.offerDate);
    if (key === 'ValidUntil') return formatDate(demand.validUntil);
    if (key === 'Currency') return getCurrencyLabel(demand);
    if (key === 'GrandTotal') return getGrandTotalLabel(demand);
    if (key === 'Status') {
      return typeof demand.status === 'number' && demand.status >= 0 && demand.status <= 4 ? (
        <ApprovalStatusBadge status={demand.status as ApprovalStatus} />
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      );
    }
    return '-';
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [DEMAND_QUERY_KEYS.DEMANDS] });
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

  const handleRowClick = (demandId: number): void => {
    navigate(`/demands/${demandId}`);
  };

  const handleRevision = async (event: React.MouseEvent, demandId: number): Promise<void> => {
    event.stopPropagation();
    try {
      const result = await createRevisionMutation.mutateAsync(demandId);
      if (result.success && result.data?.id) {
        navigate(`/demands/${result.data.id}`);
      }
    } catch {
      void 0;
    }
  };

  const handleOpenMailDialog = (event: React.MouseEvent, demand: DemandGetDto): void => {
    event.stopPropagation();
    setSelectedDemand(demand);
    setMailDialogOpen(true);
  };

  const handleOpenOutlookMailDialog = (event: React.MouseEvent, demand: DemandGetDto): void => {
    event.stopPropagation();
    setSelectedDemand(demand);
    setOutlookMailDialogOpen(true);
  };

  const renderActionsCell = (demand: DemandGetDto): ReactElement => (
    <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        title={t('list.detail', { defaultValue: 'Detay' })}
        onClick={() => navigate(`/demands/${demand.id}`)}
        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={t('google-integration:mailDialog.openButton')}
        onClick={(event) => handleOpenMailDialog(event, demand)}
        className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
      >
        <Mail className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={t('outlook-integration:mailDialog.openButton')}
        onClick={(event) => handleOpenOutlookMailDialog(event, demand)}
        className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"
      >
        <Mail className="h-4 w-4" />
      </Button>
      {(demand.status === 0 || demand.status === 3) && (
        <Button
          variant="ghost"
          size="icon"
          title={t('list.revise')}
          onClick={(event) => {
            void handleRevision(event, demand.id);
          }}
          disabled={createRevisionMutation.isPending}
          className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"
        >
          <PencilLine className={createRevisionMutation.isPending ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} />
        </Button>
      )}
    </div>
  );

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

      <div className="relative z-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white transition-colors">
              {t('list.title')}
            </h1>
            <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
              {t('list.description')}
            </p>
          </div>
          <Button
            onClick={() => navigate('/demands/create')}
            className="h-12 px-8 bg-linear-to-r from-pink-600 to-orange-600 rounded-2xl text-white text-sm font-black shadow-xl shadow-pink-500/20 transition-all duration-300 hover:scale-[1.05] hover:shadow-pink-500/30 active:scale-[0.98] border-0 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            <Plus size={20} className="mr-2 stroke-[3px]" />
            {t('list.createNew')}
          </Button>
        </div>

        <div className="relative z-10 w-full">
          <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
            <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
              <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
                {t('list.cardTitle', { defaultValue: 'Talep listesi' })}
              </CardTitle>
              <DataTableActionBar
                pageKey={PAGE_KEY}
                userId={user?.id}
                columns={baseColumns}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibleColumnsChange={setVisibleColumns}
                onColumnOrderChange={(newVisibleOrder) => {
                  setColumnOrder((currentOrder) => {
                    const hiddenCols = currentOrder.filter((k) => !newVisibleOrder.includes(k));
                    const finalOrder = [...newVisibleOrder, ...hiddenCols];
                    saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                    return finalOrder;
                  });
                }}
                exportFileName="demand-list"
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
                translationNamespace="demand"
                appliedFilterCount={appliedFilters.length}
                search={{
                  onSearchChange: setSearchTerm,
                  placeholder: t('common.search'),
                  minLength: 1,
                  resetKey: searchResetKey,
                }}
                refresh={{
                  onRefresh: () => {
                    void handleGridRefresh();
                  },
                  isLoading: demandQuery.isFetching,
                  cooldownSeconds: 60,
                  label: t('list.refresh', { defaultValue: 'Yenile' }),
                }}
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
                  </>
                }
              />
            </CardHeader>
            <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
              <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
                <ManagementDataTableChrome>
                  <DataTableGrid<DemandGetDto, DemandColumnKey>
                    columns={columns}
                    visibleColumnKeys={orderedVisibleColumns}
                    rows={currentPageRows}
                    rowKey={(row: DemandGetDto) => String(row.id)}
                    renderCell={renderCell}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    onSort={onSort}
                    renderSortIcon={renderSortIcon}
                    isLoading={demandQuery.isLoading || demandQuery.isFetching}
                    isError={demandQuery.isError}
                    loadingText={t('loading')}
                    errorText={t('loadError', { defaultValue: 'Veriler yüklenirken hata oluştu.' })}
                    emptyText={t('noData')}
                    minTableWidthClassName="min-w-[920px] lg:min-w-[1100px]"
                    showActionsColumn
                    actionsHeaderLabel={t('list.actions')}
                    renderActionsCell={renderActionsCell}
                    rowClassName="cursor-pointer hover:bg-muted/50 transition-colors"
                    onRowClick={(order: DemandGetDto) => handleRowClick(order.id)}
                    onRowDoubleClick={(order: DemandGetDto) => handleRowClick(order.id)}
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
                      start: startRow,
                      end: endRow,
                      total: totalCount,
                      ns: 'common',
                    })}
                    disablePaginationButtons={demandQuery.isFetching}
                    centerColumnHeaders
                    onColumnOrderChange={(newVisibleOrder) => {
                      setColumnOrder((currentOrder) => {
                        const hiddenCols = currentOrder.filter((k) => !(newVisibleOrder as string[]).includes(k));
                        const finalOrder = [...newVisibleOrder, ...hiddenCols];
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
      </div>
      <Suspense fallback={null}>
        {mailDialogOpen && selectedDemand ? (
          <GoogleCustomerMailDialog
            open={mailDialogOpen}
            onOpenChange={setMailDialogOpen}
            moduleKey="demand"
            recordId={selectedDemand.id}
            customerId={selectedDemand.potentialCustomerId}
            contactId={selectedDemand.contactId}
            customerName={selectedDemand.potentialCustomerName}
            customerCode={selectedDemand.erpCustomerCode}
            recordNo={selectedDemand.offerNo}
            revisionNo={selectedDemand.revisionNo}
            totalAmountDisplay={selectedDemand.grandTotalDisplay ?? undefined}
            validUntil={selectedDemand.validUntil}
            recordOwnerName={selectedDemand.representativeName}
          />
        ) : null}
        {outlookMailDialogOpen && selectedDemand ? (
          <OutlookCustomerMailDialog
            open={outlookMailDialogOpen}
            onOpenChange={setOutlookMailDialogOpen}
            moduleKey="demand"
            recordId={selectedDemand.id}
            customerId={selectedDemand.potentialCustomerId}
            contactId={selectedDemand.contactId}
            customerName={selectedDemand.potentialCustomerName}
            customerCode={selectedDemand.erpCustomerCode}
            recordNo={selectedDemand.offerNo}
            revisionNo={selectedDemand.revisionNo}
            totalAmountDisplay={selectedDemand.grandTotalDisplay ?? undefined}
            validUntil={selectedDemand.validUntil}
            recordOwnerName={selectedDemand.representativeName}
          />
        ) : null}
      </Suspense>
    </div>
  );
}
