import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Check, Clock, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import {
  DataTableGrid,
  ManagementDataTableChrome,
  type DataTableActionBarProps,
  type DataTableGridColumn,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { quotationApi } from '../api/quotation-api';
import { useWaitingApprovals } from '../hooks/useWaitingApprovals';
import { useApproveAction } from '../hooks/useApproveAction';
import { useRejectAction } from '../hooks/useRejectAction';
import { QUOTATION_QUERY_KEYS } from '../utils/query-keys';
import type { ApprovalActionGetDto } from '../types/quotation-types';

const PAGE_KEY = 'quotation-waiting-approvals';
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
  { key: 'QuotationOwnerName', labelKey: 'quotation.list.representative', fallbackLabel: 'Teklif Sahibi', filterType: 'string' },
  { key: 'QuotationOfferNo', labelKey: 'quotation.list.offerNo', fallbackLabel: 'Teklif No', filterType: 'string' },
  { key: 'QuotationRevisionNo', labelKey: 'quotation.list.revisionNo', fallbackLabel: 'Revize No', filterType: 'string' },
  { key: 'QuotationCustomerName', labelKey: 'quotation.list.customer', fallbackLabel: 'Müşteri', filterType: 'string' },
  { key: 'QuotationCustomerCode', labelKey: 'quotation.list.customerCode', fallbackLabel: 'Cari Kodu', filterType: 'string' },
  { key: 'QuotationGrandTotal', labelKey: 'quotation.list.grandTotal', fallbackLabel: 'Toplam', filterType: 'number' },
  { key: 'ApprovalRequestId', labelKey: 'quotation.waitingApprovals.requestId', fallbackLabel: 'Onay No', filterType: 'number' },
  { key: 'ApprovalRequestDescription', labelKey: 'quotation.waitingApprovals.description', fallbackLabel: 'Açıklama', filterType: 'string' },
  { key: 'StepOrder', labelKey: 'quotation.waitingApprovals.stepOrder', fallbackLabel: 'Adım', filterType: 'number' },
  { key: 'ApprovedByUserFullName', labelKey: 'quotation.waitingApprovals.approvedBy', fallbackLabel: 'Onaylayacak Kullanıcı', filterType: 'string' },
  { key: 'ActionDate', labelKey: 'quotation.waitingApprovals.actionDate', fallbackLabel: 'İşlem Tarihi', filterType: 'date' },
  { key: 'Status', labelKey: 'quotation.waitingApprovals.status', fallbackLabel: 'Durum', filterType: 'number' },
];

function resolveLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key, { defaultValue: fallback });
  return translated && translated !== key ? translated : fallback;
}

export function WaitingApprovalsPage(): ReactElement {
  const { t, i18n } = useTranslation(['quotation', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<WaitingApprovalColumnKey>('ActionDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalActionGetDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    setPageTitle(t('waitingApprovals.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const baseColumns = useMemo(
    () =>
      WAITING_APPROVAL_COLUMN_CONFIG.map((col) => ({
        key: col.key,
        label: resolveLabel(t, col.labelKey, col.fallbackLabel),
      })),
    [t]
  );

  const columns = useMemo<DataTableGridColumn<WaitingApprovalColumnKey>[]>(
    () =>
      baseColumns.map((col) => ({
        ...col,
        headClassName: col.key === 'QuotationGrandTotal' ? 'text-right' : undefined,
        cellClassName:
          col.key === 'QuotationGrandTotal'
            ? 'text-right font-semibold'
            : col.key === 'QuotationOfferNo'
              ? 'font-medium'
              : undefined,
        sortable: true,
      })),
    [baseColumns]
  );

  const defaultColumnKeys = useMemo(() => baseColumns.map((col) => col.key), [baseColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys, 'QuotationOfferNo');
    setColumnOrder(prefs.order);
    setVisibleColumns(prefs.visibleKeys);
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
      WAITING_APPROVAL_COLUMN_CONFIG.map((col) => ({
        value: col.key,
        type: col.filterType,
        labelKey: col.labelKey,
      })),
    []
  );

  const formatDate = useCallback(
    (dateString?: string | null): string => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [i18n.language]
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const column = baseColumns.find((item) => item.key === key);
        return { key, label: column?.label ?? key };
      }),
    [baseColumns, orderedVisibleColumns]
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      currentPageRows.map((approval) => ({
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
        Status: approval.statusName ?? t('waitingApprovals.waiting'),
      })),
    [currentPageRows, formatDate, t]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list = await fetchAllPagedData({
      fetchPage: (exportPageNumber, exportPageSize) =>
        quotationApi.getWaitingApprovals({
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
        Status: approval.statusName ?? t('waitingApprovals.waiting'),
      })),
    };
  }, [appliedFilters, exportColumns, formatDate, searchTerm, sortBy, sortDirection, t]);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, sortBy, sortDirection, appliedFilters, searchTerm]);

  const onSort = (column: WaitingApprovalColumnKey): void => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: WaitingApprovalColumnKey): ReactElement => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }

    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
    );
  };

  const getQuotationTargetId = (approval: ApprovalActionGetDto): number => approval.entityId || approval.approvalRequestId;

  const renderCell = (approval: ApprovalActionGetDto, key: WaitingApprovalColumnKey): ReactElement | string | number => {
    if (key === 'QuotationOwnerName') return approval.quotationOwnerName || '-';
    if (key === 'QuotationOfferNo') return approval.quotationOfferNo || '-';
    if (key === 'QuotationRevisionNo') return approval.quotationRevisionNo || '-';
    if (key === 'QuotationCustomerName') return approval.quotationCustomerName || '-';
    if (key === 'QuotationCustomerCode') return approval.quotationCustomerCode || '-';
    if (key === 'QuotationGrandTotal') return approval.quotationGrandTotalDisplay || '-';
    if (key === 'ApprovalRequestId') return `#${approval.approvalRequestId}`;
    if (key === 'ApprovalRequestDescription') return approval.approvalRequestDescription || '-';
    if (key === 'StepOrder') return <Badge variant="outline">{approval.stepOrder}</Badge>;
    if (key === 'ApprovedByUserFullName') return approval.approvedByUserFullName || '-';
    if (key === 'ActionDate') return formatDate(approval.actionDate);
    if (key === 'Status') {
      return (
        <Badge variant={approval.status === 1 ? 'default' : 'secondary'}>
          {approval.statusName || t('waitingApprovals.waiting')}
        </Badge>
      );
    }

    return '-';
  };

  const handleApprove = (approval: ApprovalActionGetDto): void => {
    approveAction.mutate({ approvalActionId: approval.id });
  };

  const handleRejectClick = (approval: ApprovalActionGetDto): void => {
    setSelectedApproval(approval);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = (): void => {
    if (!selectedApproval) return;

    rejectAction.mutate({
      approvalActionId: selectedApproval.id,
      rejectReason: rejectReason || null,
    });
    setRejectDialogOpen(false);
    setSelectedApproval(null);
    setRejectReason('');
  };

  const renderActionsCell = (approval: ApprovalActionGetDto): ReactElement => (
    <div className="flex justify-end gap-2">
      <Button
        variant="default"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          handleApprove(approval);
        }}
        disabled={approveAction.isPending || rejectAction.isPending}
        className="gap-1"
      >
        <Check className="h-4 w-4" />
        {t('approval.approve')}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          handleRejectClick(approval);
        }}
        disabled={approveAction.isPending || rejectAction.isPending}
        className="gap-1"
      >
        <X className="h-4 w-4" />
        {t('approval.reject')}
      </Button>
    </div>
  );

  const handleGridRefresh = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [QUOTATION_QUERY_KEYS.WAITING_APPROVALS] });
  }, [queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/quotations')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('back')}
        </Button>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={cn(MANAGEMENT_LIST_CARD_TITLE_CLASSNAME, 'flex items-center gap-2')}>
            <Clock className="h-5 w-5" />
            {t('waitingApprovals.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
          <ManagementDataTableChrome>
          <DataTableGrid<ApprovalActionGetDto, WaitingApprovalColumnKey>
            actionBar={{
              pageKey: PAGE_KEY,
              userId: user?.id,
              columns: baseColumns,
              visibleColumns,
              columnOrder,
              onVisibleColumnsChange: setVisibleColumns,
              onColumnOrderChange: setColumnOrder,
              exportFileName: 'quotation-waiting-approvals',
              exportColumns,
              exportRows,
              getExportData,
              filterColumns,
              defaultFilterColumn: 'QuotationOfferNo',
              draftFilterRows,
              onDraftFilterRowsChange: setDraftFilterRows,
              onApplyFilters: () => setAppliedFilterRows(draftFilterRows),
              onClearFilters: () => {
                setDraftFilterRows([]);
                setAppliedFilterRows([]);
                setSearchResetKey((prev) => prev + 1);
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
                isLoading: waitingApprovalsQuery.isFetching,
                cooldownSeconds: 60,
                label: t('list.refresh', { defaultValue: 'Yenile' }),
              },
            } satisfies DataTableActionBarProps}
            columns={columns}
            visibleColumnKeys={orderedVisibleColumns}
            rows={currentPageRows}
            rowKey={(row) => String(row.id)}
            renderCell={renderCell}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={onSort}
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
            onRowClick={(approval) => navigate(`/quotations/${getQuotationTargetId(approval)}`)}
            onRowDoubleClick={(approval) => navigate(`/quotations/${getQuotationTargetId(approval)}`)}
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
            centerColumnHeaders
          />
          </ManagementDataTableChrome>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('approval.rejectTitle')}</DialogTitle>
            <DialogDescription>{t('approval.rejectDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder={t('approval.rejectReasonPlaceholder')}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              maxLength={500}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setSelectedApproval(null);
                setRejectReason('');
              }}
              disabled={rejectAction.isPending}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectAction.isPending}
            >
              {rejectAction.isPending ? t('loading') : t('approval.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
