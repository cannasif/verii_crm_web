import { lazy, Suspense, type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_ID_COLUMN_CELL_CLASSNAME,
  MANAGEMENT_LIST_ID_COLUMN_HEAD_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import { arraysEqual } from '@/lib/utils';
import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import {
  DataTableGrid,
  DataTableActionBar,
  DocumentApprovalStatusFilter,
  DocumentBackButton,
  DocumentListIdCell,
  DocumentListOfferNoCell,
  DocumentListRowActions,
  ErpIntegrationPill,
  ManagementDataTableChrome,
  type DataTableGridColumn,
} from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useOrderList } from '../hooks/useOrderList';
import { useRefetchOnPageRestore } from '@/features/approval/hooks/useRefetchOnPageRestore';
import { orderApi } from '../api/order-api';
import { QUOTATION_QUERY_KEYS } from '../utils/query-keys';
import type { OrderGetDto } from '../types/order-types';
import type { PagedFilter } from '@/types/api';
import { formatCurrency } from '../utils/format-currency';
import { ApprovalStatusBadge } from '@/features/approval/components/ApprovalStatusBadge';
import { getApprovalStatusTranslationKey } from '@/features/approval/utils/approval-status-key';
import {
  resolveDocumentApprovalStatus,
  resolveDocumentCancellationReason,
} from '@/features/approval/utils/resolve-document-status';
import { filterDocumentsByApprovalStatus } from '@/features/approval/utils/filter-documents-by-status';
import type { ApprovalStatus } from '@/features/approval/types/approval-types';
import { useCreateRevisionOfOrder } from '../hooks/useCreateRevisionOfOrder';
import { useCleanupOrderErpAndCreateCopy } from '../hooks/useCleanupOrderErpAndCreateCopy';
const GoogleCustomerMailDialog = lazy(() =>
  import('@/features/google-integration/components/GoogleCustomerMailDialog').then((module) => ({ default: module.GoogleCustomerMailDialog }))
);
const OutlookCustomerMailDialog = lazy(() =>
  import('@/features/outlook-integration/components/OutlookCustomerMailDialog').then((module) => ({ default: module.OutlookCustomerMailDialog }))
);

const PAGE_KEY = 'order-list';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type OrderColumnKey =
  | 'Id'
  | 'OfferNo'
  | 'RevisionNo'
  | 'PotentialCustomerName'
  | 'ErpCustomerCode'
  | 'RepresentativeName'
  | 'KoliBaskiDefinitionName'
  | 'OfferDate'
  | 'ValidUntil'
  | 'Currency'
  | 'GrandTotal'
  | 'IsERPIntegrated'
  | 'ERPIntegrationNumber'
  | 'LastSyncDate'
  | 'CountTriedBy'
  | 'Status';
type SortDirection = 'asc' | 'desc';

type OrderColumnConfig = {
  key: OrderColumnKey;
  labelKey: string;
  fallbackLabel: string;
  filterType: FilterColumnConfig['type'];
};

const ORDER_COLUMN_CONFIG: readonly OrderColumnConfig[] = [
  { key: 'Id', labelKey: 'order.list.id', fallbackLabel: 'ID', filterType: 'number' },
  { key: 'OfferNo', labelKey: 'order.list.offerNo', fallbackLabel: 'Teklif No', filterType: 'string' },
  { key: 'RevisionNo', labelKey: 'order.list.revisionNo', fallbackLabel: 'Revize No', filterType: 'string' },
  { key: 'PotentialCustomerName', labelKey: 'order.list.customer', fallbackLabel: 'Müşteri', filterType: 'string' },
  { key: 'ErpCustomerCode', labelKey: 'order.list.customerCode', fallbackLabel: 'Cari Kodu', filterType: 'string' },
  { key: 'RepresentativeName', labelKey: 'order.list.representative', fallbackLabel: 'Temsilci', filterType: 'string' },
  { key: 'KoliBaskiDefinitionName', labelKey: 'order.list.koliBaski', fallbackLabel: 'Koli Baskı', filterType: 'string' },
  { key: 'OfferDate', labelKey: 'order.list.offerDate', fallbackLabel: 'Tarih', filterType: 'date' },
  { key: 'ValidUntil', labelKey: 'order.list.validUntil', fallbackLabel: 'Geçerlilik', filterType: 'date' },
  { key: 'Currency', labelKey: 'order.list.currency', fallbackLabel: 'Para Birimi', filterType: 'string' },
  { key: 'GrandTotal', labelKey: 'order.list.grandTotal', fallbackLabel: 'Toplam', filterType: 'number' },
  { key: 'IsERPIntegrated', labelKey: 'order.list.isERPIntegrated', fallbackLabel: 'Netsis', filterType: 'boolean' },
  { key: 'ERPIntegrationNumber', labelKey: 'order.list.erpIntegrationNumber', fallbackLabel: 'Netsis No', filterType: 'string' },
  { key: 'LastSyncDate', labelKey: 'order.list.lastSyncDate', fallbackLabel: 'Netsis Tarihi', filterType: 'date' },
  { key: 'CountTriedBy', labelKey: 'order.list.countTriedBy', fallbackLabel: 'ERP Deneme', filterType: 'number' },
  { key: 'Status', labelKey: 'order.list.status', fallbackLabel: 'Durum', filterType: 'number' },
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

export function OrderListPage(): ReactElement {
  const { t, i18n } = useTranslation(['order', 'common', 'approval', 'google-integration']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();
  const createRevisionMutation = useCreateRevisionOfOrder();
  const cleanupErpMutation = useCleanupOrderErpAndCreateCopy();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<OrderColumnKey>('Id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('all');
  const initialFilterRows = useMemo<FilterRow[]>(() => {
    const representativeName = searchParams.get('representativeName')?.trim();
    if (!representativeName) {
      return [];
    }

    return [
      {
        id: `representative-${representativeName}`,
        column: 'RepresentativeName',
        operator: 'Contains',
        value: representativeName,
      },
    ];
  }, [searchParams]);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>(initialFilterRows);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>(initialFilterRows);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [outlookMailDialogOpen, setOutlookMailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderGetDto | null>(null);
  const [erpCleanupOrder, setErpCleanupOrder] = useState<OrderGetDto | null>(null);
  const [erpCleanupReason, setErpCleanupReason] = useState('');
  const [erpCleanupNote, setErpCleanupNote] = useState('');

  const countTriedByTooltip = t('documentList.countTriedByTooltip', {
    ns: 'common',
    defaultValue: "Netsis/ERP'ye aktarım deneme sayısı. Entegrasyon kolonu yalnızca sonucu gösterir.",
  });

  const baseColumns = useMemo(
    () =>
      ORDER_COLUMN_CONFIG.map((col) => ({
        key: col.key,
        label:
          col.key === 'CountTriedBy'
            ? t('documentList.countTriedBy', { ns: 'common', defaultValue: 'ERP Deneme' })
            : resolveLabel(t, col.labelKey, col.fallbackLabel),
      })),
    [t]
  );

  const columns = useMemo<DataTableGridColumn<OrderColumnKey>[]>(
    () =>
      baseColumns.map((col) => ({
        ...col,
        headTooltip: col.key === 'CountTriedBy' ? countTriedByTooltip : undefined,
        headClassName:
          col.key === 'Id'
            ? MANAGEMENT_LIST_ID_COLUMN_HEAD_CLASSNAME
            : col.key === 'GrandTotal'
            ? 'text-right'
            : col.key === 'IsERPIntegrated' || col.key === 'CountTriedBy' || col.key === 'Status'
              ? 'text-center'
              : undefined,
        cellClassName:
          col.key === 'Id'
            ? MANAGEMENT_LIST_ID_COLUMN_CELL_CLASSNAME
            : col.key === 'GrandTotal'
            ? 'text-right font-semibold'
            : col.key === 'IsERPIntegrated' || col.key === 'CountTriedBy' || col.key === 'Status'
              ? 'text-center'
              : undefined,
        sortable: true,
      })),
    [baseColumns, countTriedByTooltip]
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
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
  }, [defaultColumnKeys, user?.id]);

  const appliedFilters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);

  const filtersParam = useMemo<{ filters?: PagedFilter[] }>(
    () => (appliedFilters.length > 0 ? { filters: appliedFilters } : {}),
    [appliedFilters]
  );

  const orderQuery = useOrderList({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy,
    sortDirection,
    approvalStatusFilter,
    ...filtersParam,
  });
  useRefetchOnPageRestore(orderQuery.refetch);
  const pagedData = orderQuery.data;
  const currentPageRows = useMemo(() => pagedData?.data ?? [], [pagedData?.data]);
  const totalCount = pagedData?.totalCount ?? 0;
  const hasNextPage = pagedData?.hasNextPage ?? false;
  const hasPreviousPage = pagedData?.hasPreviousPage ?? pageNumber > 1;
  const totalPages = pagedData?.totalPages ?? 1;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as OrderColumnKey[];

  const filterColumns = useMemo<FilterColumnConfig[]>(
    () =>
      ORDER_COLUMN_CONFIG.map((col) => ({
        value: col.key,
        type: col.filterType,
        labelKey: col.labelKey,
      })),
    []
  );

  const getCurrencyLabel = useCallback((order: OrderGetDto): string => {
    return order.currencyDisplay || order.currencyCode || order.currency || '-';
  }, []);

  const getGrandTotalLabel = useCallback((order: OrderGetDto): string => {
    if (order.grandTotalDisplay) {
      return order.grandTotalDisplay;
    }

    const numericGrandTotal = Number(order.grandTotal);
    if (Number.isNaN(numericGrandTotal)) {
      return '-';
    }

    return formatCurrency(numericGrandTotal, order.currencyCode || order.currency || 'TRY');
  }, []);

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const column = baseColumns.find((item) => item.key === key);
        return { key, label: column?.label ?? key };
      }),
    [baseColumns, orderedVisibleColumns]
  );

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(i18n.language);
  };

  const getErpIntegrationLabel = useCallback(
    (isIntegrated?: boolean | null): string =>
      isIntegrated
        ? t('list.erpIntegrated', { defaultValue: 'Entegrasyon oldu' })
        : t('list.erpNotIntegrated', { defaultValue: 'Entegrasyon olmadı' }),
    [t]
  );

  const getApprovalStatusLabel = useCallback(
    (status: number | null | undefined): string => {
      if (typeof status !== 'number') {
        return '-';
      }

      const statusKey = getApprovalStatusTranslationKey(status);
      if (statusKey == null) {
        return '-';
      }

      return t(`approval.status.${statusKey}`, {
        defaultValue: status === 5 ? 'Müşteri tarafından iptal edildi' : undefined,
      });
    },
    [t]
  );

  const getErpDocumentNumber = useCallback(
    (order: OrderGetDto): string => order.erpIntegrationNumber || '-',
    []
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      currentPageRows.map((order) => ({
        Id: order.id,
        OfferNo: order.offerNo ?? '-',
        RevisionNo: order.revisionNo ?? '-',
        PotentialCustomerName: order.potentialCustomerName ?? '-',
        ErpCustomerCode: order.erpCustomerCode ?? '-',
        RepresentativeName: order.representativeName ?? '-',
        KoliBaskiDefinitionName: order.koliBaskiDefinitionName ?? '-',
        OfferDate: order.offerDate ? new Date(order.offerDate).toLocaleDateString(i18n.language) : '-',
        ValidUntil: order.validUntil ? new Date(order.validUntil).toLocaleDateString(i18n.language) : '-',
        Currency: getCurrencyLabel(order),
        GrandTotal: getGrandTotalLabel(order),
        IsERPIntegrated: getErpIntegrationLabel(order.isERPIntegrated),
        ERPIntegrationNumber: getErpDocumentNumber(order),
        LastSyncDate: order.lastSyncDate ? new Date(order.lastSyncDate).toLocaleDateString(i18n.language) : '-',
        CountTriedBy: order.countTriedBy ?? 0,
        Status: getApprovalStatusLabel(resolveDocumentApprovalStatus(order as unknown as Record<string, unknown>)),
      })),
    [currentPageRows, getCurrencyLabel, getGrandTotalLabel, getErpIntegrationLabel, getErpDocumentNumber, getApprovalStatusLabel, i18n.language]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list = filterDocumentsByApprovalStatus(
      await fetchAllPagedData({
        fetchPage: (exportPageNumber, exportPageSize) =>
          orderApi.getList({
            pageNumber: exportPageNumber,
            pageSize: exportPageSize,
            search: searchTerm || undefined,
            sortBy,
            sortDirection,
            ...filtersParam,
          }),
      }),
      approvalStatusFilter
    );
    return {
      columns: exportColumns,
      rows: list.map((order: OrderGetDto) => ({
        Id: order.id,
        OfferNo: order.offerNo ?? '-',
        RevisionNo: order.revisionNo ?? '-',
        PotentialCustomerName: order.potentialCustomerName ?? '-',
        ErpCustomerCode: order.erpCustomerCode ?? '-',
        RepresentativeName: order.representativeName ?? '-',
        KoliBaskiDefinitionName: order.koliBaskiDefinitionName ?? '-',
        OfferDate: order.offerDate ? new Date(order.offerDate).toLocaleDateString(i18n.language) : '-',
        ValidUntil: order.validUntil ? new Date(order.validUntil).toLocaleDateString(i18n.language) : '-',
        Currency: getCurrencyLabel(order),
        GrandTotal: getGrandTotalLabel(order),
        IsERPIntegrated: getErpIntegrationLabel(order.isERPIntegrated),
        ERPIntegrationNumber: getErpDocumentNumber(order),
        LastSyncDate: order.lastSyncDate ? new Date(order.lastSyncDate).toLocaleDateString(i18n.language) : '-',
        CountTriedBy: order.countTriedBy ?? 0,
        Status: getApprovalStatusLabel(resolveDocumentApprovalStatus(order as unknown as Record<string, unknown>)),
      })),
    };
  }, [exportColumns, searchTerm, sortBy, sortDirection, filtersParam, approvalStatusFilter, getCurrencyLabel, getGrandTotalLabel, getErpIntegrationLabel, getErpDocumentNumber, getApprovalStatusLabel, i18n.language]);

  useEffect(() => {
    setPageNumber((current) => current === 1 ? current : 1);
  }, [pageSize, sortBy, sortDirection, approvalStatusFilter, appliedFilterRows, searchTerm]);

  const onSort = (column: OrderColumnKey): void => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: OrderColumnKey): ReactElement => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
    );
  };

  const openDetailHint = t('documentList.openDetailHint', {
    ns: 'common',
    defaultValue: 'Çift tıklayarak detaya gidin',
  });

  const renderCell = (order: OrderGetDto, key: OrderColumnKey): ReactElement | string | number => {
    if (key === 'Id') {
      const resolvedStatus = resolveDocumentApprovalStatus(order as unknown as Record<string, unknown>);
      return (
        <DocumentListIdCell
          id={order.id}
          status={resolvedStatus as ApprovalStatus | null}
          cancellationReason={resolveDocumentCancellationReason(order as unknown as Record<string, unknown>)}
        />
      );
    }
    if (key === 'OfferNo') {
      const offerNo = order.offerNo || '-';
      if (offerNo === '-') return offerNo;
      return (
        <DocumentListOfferNoCell
          offerNo={offerNo}
          hint={openDetailHint}
          onOpenDetail={() => navigate(`/orders/${order.id}`)}
        />
      );
    }
    if (key === 'RevisionNo') return order.revisionNo || '-';
    if (key === 'PotentialCustomerName') return order.potentialCustomerName || '-';
    if (key === 'ErpCustomerCode') return order.erpCustomerCode || '-';
    if (key === 'RepresentativeName') return order.representativeName || '-';
    if (key === 'KoliBaskiDefinitionName') return order.koliBaskiDefinitionName || '-';
    if (key === 'OfferDate') return formatDate(order.offerDate);
    if (key === 'ValidUntil') return formatDate(order.validUntil);
    if (key === 'Currency') return getCurrencyLabel(order);
    if (key === 'GrandTotal') return getGrandTotalLabel(order);
    if (key === 'IsERPIntegrated') {
      return (
        <ErpIntegrationPill
          integrated={order.isERPIntegrated === true}
          label={getErpIntegrationLabel(order.isERPIntegrated === true)}
        />
      );
    }
    if (key === 'ERPIntegrationNumber') return getErpDocumentNumber(order);
    if (key === 'LastSyncDate') return formatDate(order.lastSyncDate);
    if (key === 'CountTriedBy') return order.countTriedBy ?? 0;
    if (key === 'Status') {
      const resolvedStatus = resolveDocumentApprovalStatus(order as unknown as Record<string, unknown>);
      return resolvedStatus != null ? (
        <div className="flex justify-center">
          <ApprovalStatusBadge
            status={resolvedStatus as ApprovalStatus}
            cancellationReason={resolveDocumentCancellationReason(order as unknown as Record<string, unknown>)}
          />
        </div>
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

  const handleRowClick = (orderId: number): void => {
    navigate(`/orders/${orderId}`);
  };

  const handleRevision = async (event: React.MouseEvent, orderId: number): Promise<void> => {
    event.stopPropagation();
    try {
      const result = await createRevisionMutation.mutateAsync(orderId);
      if (result.success && result.data?.id) {
        navigate(`/orders/${result.data.id}`);
      }
    } catch {
      void 0;
    }
  };

  const handleOpenMailDialog = (event: React.MouseEvent, order: OrderGetDto): void => {
    event.stopPropagation();
    setSelectedOrder(order);
    setMailDialogOpen(true);
  };

  const handleOpenOutlookMailDialog = (event: React.MouseEvent, order: OrderGetDto): void => {
    event.stopPropagation();
    setSelectedOrder(order);
    setOutlookMailDialogOpen(true);
  };

  const handleOpenErpCleanupDialog = (event: React.MouseEvent, order: OrderGetDto): void => {
    event.stopPropagation();
    setErpCleanupOrder(order);
    setErpCleanupReason('');
    setErpCleanupNote('');
  };

  const handleConfirmErpCleanup = async (): Promise<void> => {
    const reason = erpCleanupReason.trim();
    if (!erpCleanupOrder || !reason) {
      return;
    }

    const result = await cleanupErpMutation.mutateAsync({
      orderId: erpCleanupOrder.id,
      data: {
        cleanupReason: reason,
        cleanupNote: erpCleanupNote.trim() || null,
      },
    });

    setErpCleanupOrder(null);
    setErpCleanupReason('');
    setErpCleanupNote('');

    if (result.success && result.data?.id) {
      navigate(`/orders/${result.data.id}`);
    }
  };

  const renderActionsCell = (order: OrderGetDto): ReactElement => {
    const resolvedStatus = resolveDocumentApprovalStatus(order as unknown as Record<string, unknown>);

    return (
    <DocumentListRowActions
      detailLabel={t('list.detail', { defaultValue: 'Detay' })}
      mailMenuLabel={t('list.sendMail', { defaultValue: 'E-posta Gönder' })}
      gmailLabel={t('google-integration:mailDialog.openButton')}
      outlookLabel={t('outlook-integration:mailDialog.openButton')}
      reviseLabel={t('list.revise', { defaultValue: 'Revize Et' })}
      erpCleanupLabel={t('list.erpCleanupAction', { defaultValue: 'ERP kaydını sil ve revize kopya oluştur' })}
      onDetail={() => navigate(`/orders/${order.id}`)}
      onGmail={(event) => handleOpenMailDialog(event, order)}
      onOutlook={(event) => handleOpenOutlookMailDialog(event, order)}
      onRevise={(event) => {
        void handleRevision(event, order.id);
      }}
      isRevisePending={createRevisionMutation.isPending}
      onErpCleanup={(event) => handleOpenErpCleanupDialog(event, order)}
      isErpCleanupPending={cleanupErpMutation.isPending}
      showRevise={resolvedStatus === 0 || resolvedStatus === 3}
      showErpCleanup={order.isERPIntegrated === true && Boolean(order.erpIntegrationNumber)}
    />
    );
  };

  const handleBack = useCallback((): void => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="relative min-h-screen space-y-6 p-3 md:p-8 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

      <div className="relative z-10 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-2">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <DocumentBackButton
              onBack={handleBack}
              backLabel={t('common.back', { ns: 'common', defaultValue: 'Geri' })}
            />
            <div className="min-w-0 space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                {t('list.title')}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
                {t('list.description')}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/orders/create')}
            className="h-11 px-6 rounded-xl bg-[image:var(--crm-brand-gradient)] text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 border-0 hover:text-white group opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            {t('list.createNew')}
          </Button>
        </div>

        <div className="relative z-10 w-full">
          <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
            <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
              <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
                {t('list.cardTitle', { defaultValue: 'Sipariş listesi' })}
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
                exportFileName="order-list"
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
                  setSearchResetKey((prev) => prev + 1);
                }}
                translationNamespace="order"
                appliedFilterCount={appliedFilterRows.length}
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
                  isLoading: orderQuery.isFetching,
                  cooldownSeconds: 60,
                  label: t('list.refresh', { defaultValue: 'Yenile' }),
                }}
              />
              <DocumentApprovalStatusFilter
                value={approvalStatusFilter}
                onValueChange={setApprovalStatusFilter}
                className="mt-2 border-t border-slate-200/60 pt-2 dark:border-white/5 sm:mt-3 sm:pt-3"
              />
            </CardHeader>
            <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
              <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
                <ManagementDataTableChrome>
                  <DataTableGrid<OrderGetDto, OrderColumnKey>
                    columns={columns}
                    visibleColumnKeys={orderedVisibleColumns}
                    rows={currentPageRows}
                    rowKey={(row: OrderGetDto) => String(row.id)}
                    renderCell={renderCell}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    onSort={onSort}
                    renderSortIcon={renderSortIcon}
                    isLoading={orderQuery.isLoading || orderQuery.isFetching}
                    isError={orderQuery.isError}
                    loadingText={t('loading')}
                    errorText={t('loadError', { defaultValue: 'Veriler yüklenirken hata oluştu.' })}
                    emptyText={t('noData')}
                    minTableWidthClassName="min-w-[920px] lg:min-w-[1100px]"
                    showActionsColumn
                    actionsHeaderLabel={t('list.actions')}
                    renderActionsCell={renderActionsCell}
                    rowClassName="cursor-pointer hover:bg-muted/50 transition-colors"
                    onRowClick={(order: OrderGetDto) => handleRowClick(order.id)}
                    onRowDoubleClick={(order: OrderGetDto) => handleRowClick(order.id)}
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
                    disablePaginationButtons={orderQuery.isFetching}
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
        {mailDialogOpen && selectedOrder ? (
          <GoogleCustomerMailDialog
            open={mailDialogOpen}
            onOpenChange={setMailDialogOpen}
            moduleKey="order"
            recordId={selectedOrder.id}
            customerId={selectedOrder.potentialCustomerId}
            contactId={selectedOrder.contactId}
            customerName={selectedOrder.potentialCustomerName}
            customerCode={selectedOrder.erpCustomerCode}
            recordNo={selectedOrder.offerNo}
            revisionNo={selectedOrder.revisionNo}
            totalAmountDisplay={selectedOrder.grandTotalDisplay ?? undefined}
            validUntil={selectedOrder.validUntil}
            recordOwnerName={selectedOrder.representativeName}
          />
        ) : null}
        {outlookMailDialogOpen && selectedOrder ? (
          <OutlookCustomerMailDialog
            open={outlookMailDialogOpen}
            onOpenChange={setOutlookMailDialogOpen}
            moduleKey="order"
            recordId={selectedOrder.id}
            customerId={selectedOrder.potentialCustomerId}
            contactId={selectedOrder.contactId}
            customerName={selectedOrder.potentialCustomerName}
            customerCode={selectedOrder.erpCustomerCode}
            recordNo={selectedOrder.offerNo}
            revisionNo={selectedOrder.revisionNo}
            totalAmountDisplay={selectedOrder.grandTotalDisplay ?? undefined}
            validUntil={selectedOrder.validUntil}
            recordOwnerName={selectedOrder.representativeName}
          />
        ) : null}
      </Suspense>
      <Dialog
        open={Boolean(erpCleanupOrder)}
        onOpenChange={(open) => {
          if (!open && !cleanupErpMutation.isPending) {
            setErpCleanupOrder(null);
            setErpCleanupReason('');
            setErpCleanupNote('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('list.erpCleanupDialogTitle', { defaultValue: 'ERP kaydını sil ve revize kopya oluştur' })}
            </DialogTitle>
            <DialogDescription>
              {t('list.erpCleanupDialogDescription', {
                defaultValue:
                  'Bu işlem Netsis sipariş kaydını siler, mevcut siparişi geçmiş ERP numarasıyla işaretler ve CRM içinde yeni bir sipariş kopyası oluşturur.',
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm font-medium text-amber-800 dark:text-amber-200">
              {t('list.erpCleanupDocumentNumber', {
                defaultValue: 'Silinecek Netsis No: {{value}}',
                value: erpCleanupOrder ? getErpDocumentNumber(erpCleanupOrder) : '-',
              })}
            </div>
            <label className="space-y-2 text-sm font-semibold">
              <span>{t('list.erpCleanupReason', { defaultValue: 'Silme / revize nedeni' })}</span>
              <Textarea
                value={erpCleanupReason}
                onChange={(event) => setErpCleanupReason(event.target.value)}
                maxLength={500}
                placeholder={t('list.erpCleanupReasonPlaceholder', {
                  defaultValue: 'Örn: Satışçı tarafından revize için ERP kaydı iptal edildi.',
                })}
                disabled={cleanupErpMutation.isPending}
                className="min-h-24"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              <span>{t('list.erpCleanupNote', { defaultValue: 'Ek not' })}</span>
              <Textarea
                value={erpCleanupNote}
                onChange={(event) => setErpCleanupNote(event.target.value)}
                maxLength={2000}
                placeholder={t('list.erpCleanupNotePlaceholder', { defaultValue: 'İsteğe bağlı açıklama' })}
                disabled={cleanupErpMutation.isPending}
                className="min-h-20"
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setErpCleanupOrder(null)}
              disabled={cleanupErpMutation.isPending}
            >
              {t('common.cancel', { ns: 'common', defaultValue: 'İptal' })}
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleConfirmErpCleanup();
              }}
              disabled={cleanupErpMutation.isPending || erpCleanupReason.trim().length === 0}
              className="bg-[image:var(--crm-brand-gradient)] text-white hover:text-white"
            >
              {cleanupErpMutation.isPending
                ? t('common.processing', { ns: 'common', defaultValue: 'İşleniyor...' })
                : t('list.erpCleanupConfirm', { defaultValue: 'ERP kaydını sil ve kopya oluştur' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
