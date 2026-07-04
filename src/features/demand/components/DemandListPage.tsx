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
import { useDemandList } from '../hooks/useDemandList';
import { useRefetchOnPageRestore } from '@/features/approval/hooks/useRefetchOnPageRestore';
import { demandApi } from '../api/demand-api';
import { DEMAND_QUERY_KEYS } from '../utils/query-keys';
import type { DemandGetDto } from '../types/demand-types';
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
import { useCreateRevisionOfDemand } from '../hooks/useCreateRevisionOfDemand';
import { useCleanupDemandErpAndCreateCopy } from '../hooks/useCleanupDemandErpAndCreateCopy';
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
  { key: 'KoliBaskiDefinitionName', labelKey: 'demand.list.koliBaski', fallbackLabel: 'Koli Baskı', filterType: 'string' },
  { key: 'OfferDate', labelKey: 'demand.list.offerDate', fallbackLabel: 'Tarih', filterType: 'date' },
  { key: 'ValidUntil', labelKey: 'demand.list.validUntil', fallbackLabel: 'Geçerlilik', filterType: 'date' },
  { key: 'Currency', labelKey: 'demand.list.currency', fallbackLabel: 'Para Birimi', filterType: 'string' },
  { key: 'GrandTotal', labelKey: 'demand.list.grandTotal', fallbackLabel: 'Toplam', filterType: 'number' },
  { key: 'IsERPIntegrated', labelKey: 'demand.list.isERPIntegrated', fallbackLabel: 'Netsis', filterType: 'boolean' },
  { key: 'ERPIntegrationNumber', labelKey: 'demand.list.erpIntegrationNumber', fallbackLabel: 'Netsis No', filterType: 'string' },
  { key: 'LastSyncDate', labelKey: 'demand.list.lastSyncDate', fallbackLabel: 'Netsis Tarihi', filterType: 'date' },
  { key: 'CountTriedBy', labelKey: 'demand.list.countTriedBy', fallbackLabel: 'ERP Deneme', filterType: 'number' },
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
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();
  const createRevisionMutation = useCreateRevisionOfDemand();
  const cleanupErpMutation = useCleanupDemandErpAndCreateCopy();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<DemandColumnKey>('Id');
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
  const [selectedDemand, setSelectedDemand] = useState<DemandGetDto | null>(null);
  const [erpCleanupDemand, setErpCleanupDemand] = useState<DemandGetDto | null>(null);
  const [erpCleanupReason, setErpCleanupReason] = useState('');
  const [erpCleanupNote, setErpCleanupNote] = useState('');

  const countTriedByTooltip = t('documentList.countTriedByTooltip', {
    ns: 'common',
    defaultValue: "Netsis/ERP'ye aktarım deneme sayısı. Entegrasyon kolonu yalnızca sonucu gösterir.",
  });

  const baseColumns = useMemo(
    () =>
      DEMAND_COLUMN_CONFIG.map((col) => ({
        key: col.key,
        label:
          col.key === 'CountTriedBy'
            ? t('documentList.countTriedBy', { ns: 'common', defaultValue: 'ERP Deneme' })
            : resolveLabel(t, col.labelKey, col.fallbackLabel),
      })),
    [t]
  );

  const columns = useMemo<DataTableGridColumn<DemandColumnKey>[]>(
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

  const demandQuery = useDemandList({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy,
    sortDirection,
    approvalStatusFilter,
    ...filtersParam,
  });
  useRefetchOnPageRestore(demandQuery.refetch);
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
    (demand: DemandGetDto): string => demand.erpIntegrationNumber || '-',
    []
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      currentPageRows.map((demand) => ({
        Id: demand.id,
        OfferNo: demand.offerNo ?? '-',
        RevisionNo: demand.revisionNo ?? '-',
        PotentialCustomerName: demand.potentialCustomerName ?? '-',
        ErpCustomerCode: demand.erpCustomerCode ?? '-',
        RepresentativeName: demand.representativeName ?? '-',
        KoliBaskiDefinitionName: demand.koliBaskiDefinitionName ?? '-',
        OfferDate: demand.offerDate ? new Date(demand.offerDate).toLocaleDateString(i18n.language) : '-',
        ValidUntil: demand.validUntil ? new Date(demand.validUntil).toLocaleDateString(i18n.language) : '-',
        Currency: getCurrencyLabel(demand),
        GrandTotal: getGrandTotalLabel(demand),
        IsERPIntegrated: getErpIntegrationLabel(demand.isERPIntegrated),
        ERPIntegrationNumber: getErpDocumentNumber(demand),
        LastSyncDate: demand.lastSyncDate ? new Date(demand.lastSyncDate).toLocaleDateString(i18n.language) : '-',
        CountTriedBy: demand.countTriedBy ?? 0,
        Status: getApprovalStatusLabel(resolveDocumentApprovalStatus(demand as unknown as Record<string, unknown>)),
      })),
    [currentPageRows, getCurrencyLabel, getGrandTotalLabel, getErpIntegrationLabel, getErpDocumentNumber, getApprovalStatusLabel, i18n.language]
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
    const list = filterDocumentsByApprovalStatus(
      await fetchAllPagedData({
        fetchPage: (exportPageNumber, exportPageSize) =>
          demandApi.getList({
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
      rows: list.map((demand: DemandGetDto) => ({
        Id: demand.id,
        OfferNo: demand.offerNo ?? '-',
        RevisionNo: demand.revisionNo ?? '-',
        PotentialCustomerName: demand.potentialCustomerName ?? '-',
        ErpCustomerCode: demand.erpCustomerCode ?? '-',
        RepresentativeName: demand.representativeName ?? '-',
        KoliBaskiDefinitionName: demand.koliBaskiDefinitionName ?? '-',
        OfferDate: demand.offerDate ? new Date(demand.offerDate).toLocaleDateString(i18n.language) : '-',
        ValidUntil: demand.validUntil ? new Date(demand.validUntil).toLocaleDateString(i18n.language) : '-',
        Currency: getCurrencyLabel(demand),
        GrandTotal: getGrandTotalLabel(demand),
        IsERPIntegrated: getErpIntegrationLabel(demand.isERPIntegrated),
        ERPIntegrationNumber: getErpDocumentNumber(demand),
        LastSyncDate: demand.lastSyncDate ? new Date(demand.lastSyncDate).toLocaleDateString(i18n.language) : '-',
        CountTriedBy: demand.countTriedBy ?? 0,
        Status: getApprovalStatusLabel(resolveDocumentApprovalStatus(demand as unknown as Record<string, unknown>)),
      })),
    };
  }, [exportColumns, searchTerm, sortBy, sortDirection, filtersParam, approvalStatusFilter, getCurrencyLabel, getGrandTotalLabel, getErpIntegrationLabel, getErpDocumentNumber, getApprovalStatusLabel, i18n.language]);

  useEffect(() => {
    setPageNumber((current) => current === 1 ? current : 1);
  }, [pageSize, sortBy, sortDirection, approvalStatusFilter, appliedFilterRows, searchTerm]);

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

  const openDetailHint = t('documentList.openDetailHint', {
    ns: 'common',
    defaultValue: 'Çift tıklayarak detaya gidin',
  });

  const renderCell = (demand: DemandGetDto, key: DemandColumnKey): ReactElement | string | number => {
    if (key === 'Id') {
      const resolvedStatus = resolveDocumentApprovalStatus(demand as unknown as Record<string, unknown>);
      return (
        <DocumentListIdCell
          id={demand.id}
          status={resolvedStatus as ApprovalStatus | null}
          cancellationReason={resolveDocumentCancellationReason(demand as unknown as Record<string, unknown>)}
        />
      );
    }
    if (key === 'OfferNo') {
      const offerNo = demand.offerNo || '-';
      if (offerNo === '-') return offerNo;
      return (
        <DocumentListOfferNoCell
          offerNo={offerNo}
          hint={openDetailHint}
          onOpenDetail={() => navigate(`/demands/${demand.id}`)}
        />
      );
    }
    if (key === 'RevisionNo') return demand.revisionNo || '-';
    if (key === 'PotentialCustomerName') return demand.potentialCustomerName || '-';
    if (key === 'ErpCustomerCode') return demand.erpCustomerCode || '-';
    if (key === 'RepresentativeName') return demand.representativeName || '-';
    if (key === 'KoliBaskiDefinitionName') return demand.koliBaskiDefinitionName || '-';
    if (key === 'OfferDate') return formatDate(demand.offerDate);
    if (key === 'ValidUntil') return formatDate(demand.validUntil);
    if (key === 'Currency') return getCurrencyLabel(demand);
    if (key === 'GrandTotal') return getGrandTotalLabel(demand);
    if (key === 'IsERPIntegrated') {
      return (
        <ErpIntegrationPill
          integrated={demand.isERPIntegrated === true}
          label={getErpIntegrationLabel(demand.isERPIntegrated === true)}
        />
      );
    }
    if (key === 'ERPIntegrationNumber') return getErpDocumentNumber(demand);
    if (key === 'LastSyncDate') return formatDate(demand.lastSyncDate);
    if (key === 'CountTriedBy') return demand.countTriedBy ?? 0;
    if (key === 'Status') {
      const resolvedStatus = resolveDocumentApprovalStatus(demand as unknown as Record<string, unknown>);
      return resolvedStatus != null ? (
        <div className="flex justify-center">
          <ApprovalStatusBadge
            status={resolvedStatus as ApprovalStatus}
            cancellationReason={resolveDocumentCancellationReason(demand as unknown as Record<string, unknown>)}
          />
        </div>
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

  const handleOpenErpCleanupDialog = (event: React.MouseEvent, demand: DemandGetDto): void => {
    event.stopPropagation();
    setErpCleanupDemand(demand);
    setErpCleanupReason('');
    setErpCleanupNote('');
  };

  const handleConfirmErpCleanup = async (): Promise<void> => {
    const reason = erpCleanupReason.trim();
    if (!erpCleanupDemand || !reason) {
      return;
    }

    const result = await cleanupErpMutation.mutateAsync({
      demandId: erpCleanupDemand.id,
      data: {
        cleanupReason: reason,
        cleanupNote: erpCleanupNote.trim() || null,
      },
    });

    setErpCleanupDemand(null);
    setErpCleanupReason('');
    setErpCleanupNote('');

    if (result.success && result.data?.id) {
      navigate(`/demands/${result.data.id}`);
    }
  };

  const renderActionsCell = (demand: DemandGetDto): ReactElement => {
    const resolvedStatus = resolveDocumentApprovalStatus(demand as unknown as Record<string, unknown>);

    return (
    <DocumentListRowActions
      detailLabel={t('list.detail', { defaultValue: 'Detay' })}
      mailMenuLabel={t('list.sendMail', { defaultValue: 'E-posta Gönder' })}
      gmailLabel={t('google-integration:mailDialog.openButton')}
      outlookLabel={t('outlook-integration:mailDialog.openButton')}
      reviseLabel={t('list.revise', { defaultValue: 'Revize Et' })}
      erpCleanupLabel={t('list.erpCleanupAction', { defaultValue: 'ERP kaydını sil ve revize kopya oluştur' })}
      onDetail={() => navigate(`/demands/${demand.id}`)}
      onGmail={(event) => handleOpenMailDialog(event, demand)}
      onOutlook={(event) => handleOpenOutlookMailDialog(event, demand)}
      onRevise={(event) => {
        void handleRevision(event, demand.id);
      }}
      isRevisePending={createRevisionMutation.isPending}
      onErpCleanup={(event) => handleOpenErpCleanupDialog(event, demand)}
      isErpCleanupPending={cleanupErpMutation.isPending}
      showRevise={resolvedStatus === 0 || resolvedStatus === 3}
      showErpCleanup={demand.isERPIntegrated === true && Boolean(demand.erpIntegrationNumber)}
    />
    );
  };

  const handleBack = useCallback((): void => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

      <div className="relative z-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <DocumentBackButton
              onBack={handleBack}
              backLabel={t('common.back', { ns: 'common', defaultValue: 'Geri' })}
            />
            <div className="min-w-0 space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white transition-colors">
                {t('list.title')}
              </h1>
              <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
                {t('list.description')}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/demands/create')}
            className="h-12 px-8 bg-[image:var(--crm-brand-gradient)] rounded-2xl text-white text-sm font-black shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.05] hover:shadow-primary/30 active:scale-[0.98] border-0 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
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
                  isLoading: demandQuery.isFetching,
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
      <Dialog
        open={Boolean(erpCleanupDemand)}
        onOpenChange={(open) => {
          if (!open && !cleanupErpMutation.isPending) {
            setErpCleanupDemand(null);
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
                  'Bu işlem Netsis sipariş kaydını siler, mevcut talebi geçmiş ERP numarasıyla işaretler ve CRM içinde yeni bir talep kopyası oluşturur.',
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm font-medium text-amber-800 dark:text-amber-200">
              {t('list.erpCleanupDocumentNumber', {
                defaultValue: 'Silinecek Netsis No: {{value}}',
                value: erpCleanupDemand ? getErpDocumentNumber(erpCleanupDemand) : '-',
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
              onClick={() => setErpCleanupDemand(null)}
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
