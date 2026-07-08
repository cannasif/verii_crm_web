import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createDocumentReturnNavigationState } from '@/lib/document-return-navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DataTableActionBar,
  DataTableGrid,
  DocumentBackButton,
  ManagementDataTableChrome,
  WaitingApprovalsActionButtons,
  WaitingApprovalsRejectDialog,
  WaitingApprovalsStatusBadge,
  type DataTableGridColumn,
} from '@/components/shared';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { arraysEqual, cn } from '@/lib/utils';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import { demandApi } from '../api/demand-api';
import { useWaitingApprovals } from '../hooks/useWaitingApprovals';
import { useApproveAction } from '../hooks/useApproveAction';
import { useRejectAction } from '../hooks/useRejectAction';
import type { ApprovalActionGetDto } from '../types/demand-types';
import { getApprovalStatusTranslationKey } from '@/features/approval/utils/approval-status-key';

const PAGE_KEY = 'demand-waiting-approvals';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type WaitingApprovalColumnKey =
  | 'QuotationOwnerName'
  | 'QuotationOfferNo'
  | 'QuotationRevisionNo'
  | 'QuotationCustomerName'
  | 'QuotationCustomerCode'
  | 'QuotationGrandTotal'
  | 'ApprovalRequestId'
  | 'ApprovalRequestDescription'
  | 'StepOrder'
  | 'ApprovedByUserFullName'
  | 'ActionDate'
  | 'Status';

type SortDirection = 'asc' | 'desc';

type WaitingApprovalColumnConfig = {
  key: WaitingApprovalColumnKey;
  labelKey: string;
  fallbackLabel: string;
  filterType: FilterColumnConfig['type'];
};

const WAITING_APPROVAL_COLUMN_CONFIG: readonly WaitingApprovalColumnConfig[] = [
  { key: 'QuotationOwnerName', labelKey: 'waitingApprovals.owner', fallbackLabel: 'Talep Sahibi', filterType: 'string' },
  { key: 'QuotationOfferNo', labelKey: 'waitingApprovals.demandNo', fallbackLabel: 'Talep No', filterType: 'string' },
  { key: 'QuotationRevisionNo', labelKey: 'waitingApprovals.revisionNo', fallbackLabel: 'Revize No', filterType: 'string' },
  { key: 'QuotationCustomerName', labelKey: 'waitingApprovals.customer', fallbackLabel: 'Müşteri', filterType: 'string' },
  { key: 'QuotationCustomerCode', labelKey: 'waitingApprovals.customerCode', fallbackLabel: 'Cari Kodu', filterType: 'string' },
  { key: 'QuotationGrandTotal', labelKey: 'waitingApprovals.grandTotal', fallbackLabel: 'Genel Toplam', filterType: 'number' },
  { key: 'ApprovalRequestId', labelKey: 'waitingApprovals.requestId', fallbackLabel: 'Onay No', filterType: 'number' },
  { key: 'ApprovalRequestDescription', labelKey: 'waitingApprovals.description', fallbackLabel: 'Açıklama', filterType: 'string' },
  { key: 'StepOrder', labelKey: 'waitingApprovals.stepOrder', fallbackLabel: 'Adım', filterType: 'number' },
  { key: 'ApprovedByUserFullName', labelKey: 'waitingApprovals.approvedBy', fallbackLabel: 'Onaylayacak Kullanıcı', filterType: 'string' },
  { key: 'ActionDate', labelKey: 'waitingApprovals.actionDate', fallbackLabel: 'İşlem Tarihi', filterType: 'date' },
  { key: 'Status', labelKey: 'waitingApprovals.status', fallbackLabel: 'Durum', filterType: 'number' },
];

function resolveLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  key: string,
  fallback: string,
): string {
  const translated = t(key, { defaultValue: fallback });
  return translated && translated !== key ? translated : fallback;
}

export function WaitingApprovalsPage(): ReactElement {
  const { t, i18n } = useTranslation(['demand', 'common', 'approval']);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<WaitingApprovalColumnKey>('ActionDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalActionGetDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    setPageTitle(t('waitingApprovals.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const approveLabel = t('approval.actions.approve', { ns: 'approval', defaultValue: 'Onayla' });
  const rejectLabel = t('approval.actions.reject', { ns: 'approval', defaultValue: 'Reddet' });
  const detailLabel = t('approval.actions.view', { ns: 'approval', defaultValue: 'Görüntüle' });

  const getStatusLabel = useCallback((status: number, statusName?: string | null): string => {
    const statusKey = getApprovalStatusTranslationKey(status);
    if (statusKey) return t(`approval.status.${statusKey}`, { ns: 'approval' });
    return statusName || t('waitingApprovals.waiting');
  }, [t]);

  const formatDate = useCallback((dateString?: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [i18n.language]);

  const baseColumns = useMemo(
    () =>
      WAITING_APPROVAL_COLUMN_CONFIG.map((column) => ({
        key: column.key,
        label: resolveLabel(t, column.labelKey, column.fallbackLabel),
      })),
    [t],
  );

  const columns = useMemo<DataTableGridColumn<WaitingApprovalColumnKey>[]>(
    () =>
      baseColumns.map((column) => ({
        ...column,
        headClassName: column.key === 'QuotationGrandTotal' ? 'text-right' : undefined,
        cellClassName:
          column.key === 'QuotationGrandTotal'
            ? 'text-right font-semibold'
            : column.key === 'QuotationOfferNo'
              ? 'font-medium'
              : undefined,
        sortable: true,
      })),
    [baseColumns],
  );

  const defaultColumnKeys = useMemo(() => baseColumns.map((column) => column.key), [baseColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys, 'QuotationOfferNo', false);
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
  }, [defaultColumnKeys, user?.id]);

  const appliedFilters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as WaitingApprovalColumnKey[];

  const waitingApprovalsQuery = useWaitingApprovals({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy,
    sortDirection,
    filters: appliedFilters.length > 0 ? appliedFilters : undefined,
  });

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, sortBy, sortDirection, appliedFilters]);

  const pagedData = waitingApprovalsQuery.data;
  const currentPageRows = useMemo(() => pagedData?.data ?? [], [pagedData?.data]);
  const totalCount = pagedData?.totalCount ?? 0;
  const totalPages = pagedData?.totalPages ?? 1;
  const hasPreviousPage = pagedData?.hasPreviousPage ?? pageNumber > 1;
  const hasNextPage = pagedData?.hasNextPage ?? false;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);

  const filterColumns = useMemo<FilterColumnConfig[]>(
    () =>
      WAITING_APPROVAL_COLUMN_CONFIG.map((column) => ({
        value: column.key,
        type: column.filterType,
        labelKey: column.labelKey,
      })),
    [],
  );

  const exportColumns = useMemo(
    () => orderedVisibleColumns.map((key) => ({ key, label: baseColumns.find((column) => column.key === key)?.label ?? key })),
    [baseColumns, orderedVisibleColumns],
  );
  const exportRows = useMemo(
    () => currentPageRows.map((approval) => ({
      QuotationOwnerName: approval.quotationOwnerName ?? '-',
      QuotationOfferNo: approval.quotationOfferNo ?? '-',
      QuotationRevisionNo: approval.quotationRevisionNo ?? '-',
      QuotationCustomerName: approval.quotationCustomerName ?? '-',
      QuotationCustomerCode: approval.quotationCustomerCode ?? '-',
      QuotationGrandTotal: approval.quotationGrandTotalDisplay ?? '-',
      ApprovalRequestId: approval.approvalRequestId,
      ApprovalRequestDescription: approval.approvalRequestDescription ?? '-',
      StepOrder: approval.stepOrder,
      ApprovedByUserFullName: approval.approvedByUserFullName ?? '-',
      ActionDate: formatDate(approval.actionDate),
      Status: getStatusLabel(approval.status, approval.statusName),
    })),
    [currentPageRows, formatDate, getStatusLabel],
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list = await fetchAllPagedData({
      fetchPage: (exportPageNumber, exportPageSize) =>
        demandApi.getWaitingApprovals({
          pageNumber: exportPageNumber,
          pageSize: exportPageSize,
          search: searchTerm || undefined,
          sortBy,
          sortDirection,
          filters: appliedFilters.length > 0 ? appliedFilters : undefined,
        }),
    });

    return {
      columns: exportColumns,
      rows: list.map((approval: ApprovalActionGetDto) => ({
        QuotationOwnerName: approval.quotationOwnerName ?? '-',
        QuotationOfferNo: approval.quotationOfferNo ?? '-',
        QuotationRevisionNo: approval.quotationRevisionNo ?? '-',
        QuotationCustomerName: approval.quotationCustomerName ?? '-',
        QuotationCustomerCode: approval.quotationCustomerCode ?? '-',
        QuotationGrandTotal: approval.quotationGrandTotalDisplay ?? '-',
        ApprovalRequestId: approval.approvalRequestId,
        ApprovalRequestDescription: approval.approvalRequestDescription ?? '-',
        StepOrder: approval.stepOrder,
        ApprovedByUserFullName: approval.approvedByUserFullName ?? '-',
        ActionDate: formatDate(approval.actionDate),
        Status: getStatusLabel(approval.status, approval.statusName),
      })),
    };
  }, [appliedFilters, exportColumns, formatDate, getStatusLabel, searchTerm, sortBy, sortDirection]);

  const handleSort = (column: WaitingApprovalColumnKey): void => {
    if (sortBy === column) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: WaitingApprovalColumnKey): ReactElement => {
    if (sortBy !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-foreground" /> : <ArrowDown className="h-3.5 w-3.5 text-foreground" />;
  };

  const navigateToDemand = (approval: ApprovalActionGetDto): void => {
    navigate(`/demands/${approval.entityId || approval.approvalRequestId}`, {
      state: createDocumentReturnNavigationState('/demands/waiting-approvals'),
    });
  };

  const renderCell = (approval: ApprovalActionGetDto, key: WaitingApprovalColumnKey): ReactElement | string | number => {
    if (key === 'QuotationOwnerName') return approval.quotationOwnerName || '-';
    if (key === 'QuotationOfferNo') return approval.quotationOfferNo || '-';
    if (key === 'QuotationRevisionNo') return approval.quotationRevisionNo || '-';
    if (key === 'QuotationCustomerName') return approval.quotationCustomerName || '-';
    if (key === 'QuotationCustomerCode') return approval.quotationCustomerCode || '-';
    if (key === 'QuotationGrandTotal') return approval.quotationGrandTotalDisplay || '-';
    if (key === 'ApprovalRequestId') return `#${approval.approvalRequestId}`;
    if (key === 'ApprovalRequestDescription') return approval.approvalRequestDescription || '-';
    if (key === 'StepOrder') return approval.stepOrder;
    if (key === 'ApprovedByUserFullName') return approval.approvedByUserFullName || '-';
    if (key === 'ActionDate') return formatDate(approval.actionDate);
    if (key === 'Status') {
      return (
        <WaitingApprovalsStatusBadge
          status={approval.status}
          label={getStatusLabel(approval.status, approval.statusName)}
        />
      );
    }
    return '-';
  };

  const renderActionsCell = (approval: ApprovalActionGetDto): ReactElement => (
    <WaitingApprovalsActionButtons
      approveLabel={approveLabel}
      rejectLabel={rejectLabel}
      detailLabel={detailLabel}
      isPending={approveAction.isPending || rejectAction.isPending}
      onApprove={(event) => {
        event.stopPropagation();
        approveAction.mutate({ approvalActionId: approval.id });
      }}
      onReject={(event) => {
        event.stopPropagation();
        setSelectedApproval(approval);
        setRejectReason('');
        setRejectDialogOpen(true);
      }}
      onDetail={(event) => {
        event.stopPropagation();
        navigateToDemand(approval);
      }}
      className="flex justify-center items-center gap-2"
    />
  );

  const pendingCountLabel = totalCount > 0
    ? `${totalCount} adet bekleyen onay`
    : waitingApprovalsQuery.isLoading
      ? t('loading')
      : t('waitingApprovals.noApprovals');

  return (
    <>
      <div className="relative space-y-6 overflow-hidden">
        <div className="absolute top-0 left-1/4 h-96 w-96 bg-primary/5 blur-[120px] pointer-events-none dark:block hidden" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

        <div className="relative z-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <DocumentBackButton
                onBack={() => navigate('/demands')}
                backLabel={t('back')}
              />
              <div className="min-w-0 space-y-1">
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white transition-colors">
                  {t('waitingApprovals.title')}
                </h1>
                <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
                  {t('waitingApprovals.pageSubtitle', {
                    defaultValue: 'İşlem bekleyen onay taleplerinizi buradan görüntüleyebilir ve yönetebilirsiniz.',
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 w-full">
            <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
              <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
                <CardTitle className={cn(MANAGEMENT_LIST_CARD_TITLE_CLASSNAME, 'flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3')}>
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-5 w-5 shrink-0" />
                    {t('waitingApprovals.list')}
                  </span>
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{pendingCountLabel}</span>
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
                      const hiddenCols = currentOrder.filter((key) => !(newVisibleOrder as string[]).includes(key));
                      const finalOrder = [...newVisibleOrder, ...hiddenCols];
                      saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                      return finalOrder;
                    });
                  }}
                  exportFileName="demand-waiting-approvals"
                  exportColumns={exportColumns}
                  exportRows={exportRows}
                  getExportData={getExportData}
                  filterColumns={filterColumns}
                  defaultFilterColumn="QuotationOfferNo"
                  draftFilterRows={draftFilterRows}
                  onDraftFilterRowsChange={setDraftFilterRows}
                  onApplyFilters={() => {
                    setAppliedFilterRows(draftFilterRows);
                    setPageNumber(1);
                  }}
                  onClearFilters={() => {
                    setDraftFilterRows([]);
                    setAppliedFilterRows([]);
                    setSearchTerm('');
                    setPageNumber(1);
                  }}
                  translationNamespace="demand"
                  appliedFilterCount={appliedFilterRows.length}
                  searchValue={searchTerm}
                  searchPlaceholder={t('common.search', { ns: 'common' })}
                  onSearchChange={setSearchTerm}
                  refresh={{
                    onRefresh: () => {
                      void waitingApprovalsQuery.refetch();
                    },
                    isLoading: waitingApprovalsQuery.isFetching,
                    cooldownSeconds: 60,
                    label: t('list.refresh', { defaultValue: 'Yenile' }),
                  }}
                />
              </CardHeader>
              <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
                <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
                  <ManagementDataTableChrome>
                    <DataTableGrid<ApprovalActionGetDto, WaitingApprovalColumnKey>
                      columns={columns}
                      visibleColumnKeys={orderedVisibleColumns}
                      rows={currentPageRows}
                      rowKey={(row) => String(row.id)}
                      renderCell={renderCell}
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      renderSortIcon={renderSortIcon}
                      isLoading={waitingApprovalsQuery.isLoading || waitingApprovalsQuery.isFetching}
                      isError={waitingApprovalsQuery.isError}
                      loadingText={t('loading')}
                      errorText={t('loadError', { defaultValue: 'Veriler yüklenirken hata oluştu.' })}
                      emptyText={t('waitingApprovals.noApprovals')}
                      minTableWidthClassName="min-w-[1500px]"
                      showActionsColumn
                      actionsHeaderLabel={t('actions')}
                      renderActionsCell={renderActionsCell}
                      iconOnlyActions={false}
                      rowClassName="cursor-pointer hover:bg-muted/50 transition-colors"
                      onRowClick={navigateToDemand}
                      onRowDoubleClick={navigateToDemand}
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
                      disablePaginationButtons={waitingApprovalsQuery.isFetching}
                    />
                  </ManagementDataTableChrome>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <WaitingApprovalsRejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title={t('waitingApprovals.rejectTitle', { defaultValue: t('approval.rejectTitle') })}
        description={t('waitingApprovals.rejectDescription', { defaultValue: t('approval.rejectDescription') })}
        reasonLabel={t('waitingApprovals.rejectReasonLabel', { defaultValue: 'Ret Gerekçesi' })}
        reasonPlaceholder={t('waitingApprovals.rejectReasonPlaceholder', {
          defaultValue: t('approval.rejectReasonPlaceholder'),
        })}
        cancelLabel={t('cancel')}
        confirmLabel={rejectLabel}
        loadingLabel={t('loading')}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onConfirm={() => {
          if (!selectedApproval) return;
          rejectAction.mutate({
            approvalActionId: selectedApproval.id,
            rejectReason: rejectReason || null,
          });
          setRejectDialogOpen(false);
          setSelectedApproval(null);
          setRejectReason('');
        }}
        onCancel={() => {
          setRejectDialogOpen(false);
          setSelectedApproval(null);
          setRejectReason('');
        }}
        isPending={rejectAction.isPending}
      />
    </>
  );
}
