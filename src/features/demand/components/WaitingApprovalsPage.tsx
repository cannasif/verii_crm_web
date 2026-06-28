import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
import { useWaitingApprovals } from '../hooks/useWaitingApprovals';
import { useApproveAction } from '../hooks/useApproveAction';
import { useRejectAction } from '../hooks/useRejectAction';
import { queryKeys } from '../utils/query-keys';
import type { ApprovalActionGetDto } from '../types/demand-types';
import { getApprovalStatusTranslationKey } from '@/features/approval/utils/approval-status-key';
import { useQueryClient } from '@tanstack/react-query';

const PAGE_KEY = 'demand-waiting-approvals';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type WaitingApprovalColumnKey =
  | 'approvalRequestId'
  | 'approvalRequestDescription'
  | 'stepOrder'
  | 'approvedByUserFullName'
  | 'actionDate'
  | 'status';

const COLUMN_CONFIG: ReadonlyArray<{ key: WaitingApprovalColumnKey; labelKey: string; fallback: string }> = [
  { key: 'approvalRequestId', labelKey: 'waitingApprovals.requestId', fallback: 'Onay No' },
  { key: 'approvalRequestDescription', labelKey: 'waitingApprovals.description', fallback: 'Açıklama' },
  { key: 'stepOrder', labelKey: 'waitingApprovals.stepOrder', fallback: 'Adım' },
  { key: 'approvedByUserFullName', labelKey: 'waitingApprovals.approvedBy', fallback: 'Onaylayacak Kullanıcı' },
  { key: 'actionDate', labelKey: 'waitingApprovals.actionDate', fallback: 'İşlem Tarihi' },
  { key: 'status', labelKey: 'waitingApprovals.status', fallback: 'Durum' },
];

export function WaitingApprovalsPage(): ReactElement {
  const { t, i18n } = useTranslation(['demand', 'common', 'approval']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const { data: approvals = [], isLoading, isFetching, isError } = useWaitingApprovals();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<WaitingApprovalColumnKey>('actionDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalActionGetDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    setPageTitle(t('waitingApprovals.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const approveLabel = t('approval.actions.approve', { ns: 'approval', defaultValue: 'Onayla' });
  const rejectLabel = t('approval.actions.reject', { ns: 'approval', defaultValue: 'Reddet' });

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
    () => COLUMN_CONFIG.map((column) => ({
      key: column.key,
      label: t(column.labelKey, { defaultValue: column.fallback }),
    })),
    [t],
  );
  const defaultColumnKeys = useMemo(() => baseColumns.map((column) => column.key), [baseColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
  }, [defaultColumnKeys, user?.id]);

  const columns = useMemo<DataTableGridColumn<WaitingApprovalColumnKey>[]>(
    () => baseColumns.map((column) => ({ ...column, sortable: true })),
    [baseColumns],
  );
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as WaitingApprovalColumnKey[];

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase(i18n.language);
    if (!term) return approvals;
    return approvals.filter((approval) =>
      [
        approval.approvalRequestId,
        approval.approvalRequestDescription,
        approval.stepOrder,
        approval.approvedByUserFullName,
        approval.statusName,
        getStatusLabel(approval.status, approval.statusName),
      ]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLocaleLowerCase(i18n.language).includes(term)),
    );
  }, [approvals, getStatusLabel, i18n.language, searchTerm]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const aValue = sortBy === 'status' ? getStatusLabel(a.status, a.statusName) : a[sortBy];
      const bValue = sortBy === 'status' ? getStatusLabel(b.status, b.statusName) : b[sortBy];
      const comparison = String(aValue ?? '').localeCompare(String(bValue ?? ''), i18n.language, { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, getStatusLabel, i18n.language, sortBy, sortDirection]);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, sortBy, sortDirection]);

  const totalCount = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPageRows = sortedRows.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);

  const exportColumns = useMemo(
    () => orderedVisibleColumns.map((key) => ({ key, label: baseColumns.find((column) => column.key === key)?.label ?? key })),
    [baseColumns, orderedVisibleColumns],
  );
  const exportRows = useMemo(
    () => sortedRows.map((approval) => ({
      approvalRequestId: approval.approvalRequestId,
      approvalRequestDescription: approval.approvalRequestDescription ?? '-',
      stepOrder: approval.stepOrder,
      approvedByUserFullName: approval.approvedByUserFullName ?? '-',
      actionDate: formatDate(approval.actionDate),
      status: getStatusLabel(approval.status, approval.statusName),
    })),
    [formatDate, getStatusLabel, sortedRows],
  );

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
    navigate(`/demands/${approval.approvalRequestId}`);
  };

  const renderCell = (approval: ApprovalActionGetDto, key: WaitingApprovalColumnKey): ReactElement | string | number => {
    if (key === 'approvalRequestId') return `#${approval.approvalRequestId}`;
    if (key === 'approvalRequestDescription') return approval.approvalRequestDescription || '-';
    if (key === 'stepOrder') return approval.stepOrder;
    if (key === 'approvedByUserFullName') return approval.approvedByUserFullName || '-';
    if (key === 'actionDate') return formatDate(approval.actionDate);
    if (key === 'status') {
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
      className="flex justify-center gap-2"
    />
  );

  const pendingCountLabel = totalCount > 0
    ? `${totalCount} adet bekleyen onay`
    : isLoading
      ? t('loading')
      : t('waitingApprovals.noApprovals');

  return (
    <>
      <div className="relative space-y-6 overflow-hidden">
        <div className="absolute top-0 left-1/4 h-96 w-96 bg-pink-500/10 blur-[120px] pointer-events-none dark:block hidden" />
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
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
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
                  filterColumns={[]}
                  defaultFilterColumn="approvalRequestDescription"
                  draftFilterRows={[]}
                  onDraftFilterRowsChange={() => {}}
                  onApplyFilters={() => {}}
                  onClearFilters={() => {}}
                  translationNamespace="demand"
                  appliedFilterCount={0}
                  searchValue={searchTerm}
                  searchPlaceholder={t('common.search', { ns: 'common' })}
                  onSearchChange={setSearchTerm}
                  refresh={{
                    onRefresh: () => {
                      void queryClient.invalidateQueries({ queryKey: queryKeys.waitingApprovals() });
                    },
                    isLoading: isFetching,
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
                      isLoading={isLoading || isFetching}
                      isError={isError}
                      loadingText={t('loading')}
                      errorText={t('loadError', { defaultValue: 'Veriler yüklenirken hata oluştu.' })}
                      emptyText={t('waitingApprovals.noApprovals')}
                      minTableWidthClassName="min-w-[1000px]"
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
                      hasPreviousPage={pageNumber > 1}
                      hasNextPage={pageNumber < totalPages}
                      onPreviousPage={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                      onNextPage={() => setPageNumber((prev) => Math.min(prev + 1, totalPages))}
                      previousLabel={t('previous')}
                      nextLabel={t('next')}
                      paginationInfoText={t('common.paginationInfo', {
                        ns: 'common',
                        start: startRow,
                        end: endRow,
                        total: totalCount,
                      })}
                      disablePaginationButtons={isFetching}
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
