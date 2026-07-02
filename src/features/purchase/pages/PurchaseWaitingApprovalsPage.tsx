import { type ReactElement, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApiResponse, PagedFilter, PagedResponse } from '@/types/api';
import type { ApprovalActionGetDto, ApproveActionDto, RejectActionDto } from '@/features/quotation/types/quotation-types';

type PurchaseApprovalKind = 'supplierQuotation' | 'order';
type WaitingApprovalColumnKey =
  | 'quotationOwnerName'
  | 'quotationOfferNo'
  | 'quotationRevisionNo'
  | 'quotationCustomerName'
  | 'quotationCustomerCode'
  | 'quotationGrandTotal'
  | 'approvalRequestId'
  | 'approvalRequestDescription'
  | 'stepOrder'
  | 'approvedByUserFullName'
  | 'actionDate'
  | 'status';

interface PurchaseWaitingApprovalsPageProps {
  kind: PurchaseApprovalKind;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const KIND_CONFIG: Record<PurchaseApprovalKind, {
  endpoint: string;
  pageKey: string;
  title: string;
  description: string;
  listPath: string;
  detailBasePath: string;
  documentLabel: string;
}> = {
  supplierQuotation: {
    endpoint: '/api/SupplierQuotation',
    pageKey: 'purchase-supplier-quotation-waiting-approvals',
    title: 'Bekleyen Tedarikçi Teklif Onayları',
    description: 'Onay bekleyen satınalma tekliflerini genel grid yapısında görüntüleyin.',
    listPath: '/purchase/supplier-quotations',
    detailBasePath: '/purchase/supplier-quotations',
    documentLabel: 'Teklif No',
  },
  order: {
    endpoint: '/api/PurchaseOrder',
    pageKey: 'purchase-order-waiting-approvals',
    title: 'Bekleyen Satınalma Sipariş Onayları',
    description: 'Onay bekleyen satınalma siparişlerini genel grid yapısında görüntüleyin.',
    listPath: '/purchase/orders',
    detailBasePath: '/purchase/orders',
    documentLabel: 'Sipariş No',
  },
};

const columns: DataTableGridColumn<WaitingApprovalColumnKey>[] = [
  { key: 'quotationOwnerName', label: 'Satınalmacı', sortable: true },
  { key: 'quotationOfferNo', label: 'Belge No', sortable: true },
  { key: 'quotationRevisionNo', label: 'Revizyon No', sortable: true },
  { key: 'quotationCustomerName', label: 'Tedarikçi', sortable: true },
  { key: 'quotationCustomerCode', label: 'Cari Kodu', sortable: true },
  { key: 'quotationGrandTotal', label: 'Toplam', sortable: true, cellClassName: 'text-right font-semibold', headClassName: 'text-right' },
  { key: 'approvalRequestId', label: 'Onay No', sortable: true },
  { key: 'approvalRequestDescription', label: 'Açıklama', sortable: true },
  { key: 'stepOrder', label: 'Adım', sortable: true },
  { key: 'approvedByUserFullName', label: 'Onaylayacak Kullanıcı', sortable: true },
  { key: 'actionDate', label: 'İşlem Tarihi', sortable: true },
  { key: 'status', label: 'Durum', sortable: true },
];

const DEFAULT_COLUMNS: WaitingApprovalColumnKey[] = columns.map((column) => column.key);

async function fetchWaitingApprovals(
  endpoint: string,
  pageNumber: number,
  pageSize: number,
  search: string,
  sortBy: WaitingApprovalColumnKey,
  sortDirection: 'asc' | 'desc',
  filters: PagedFilter[],
): Promise<PagedResponse<ApprovalActionGetDto>> {
  const response = await api.post<ApiResponse<PagedResponse<ApprovalActionGetDto>>>(`${endpoint}/waiting-approvals/query`, {
    pageNumber,
    pageSize,
    search,
    sortBy: toApiSort(sortBy),
    sortDirection,
    filterLogic: 'and',
    filters,
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Bekleyen satınalma onayları yüklenemedi.');
  }

  return response.data;
}

async function approve(endpoint: string, data: ApproveActionDto): Promise<ApiResponse<boolean>> {
  const response = await api.post<ApiResponse<boolean>>(`${endpoint}/approve`, data);
  if (!response.success) throw new Error(response.message || 'Satınalma onayı tamamlanamadı.');
  return response;
}

async function reject(endpoint: string, data: RejectActionDto): Promise<ApiResponse<boolean>> {
  const response = await api.post<ApiResponse<boolean>>(`${endpoint}/reject`, data);
  if (!response.success) throw new Error(response.message || 'Satınalma reddi tamamlanamadı.');
  return response;
}

function toApiSort(key: WaitingApprovalColumnKey): string {
  const map: Record<WaitingApprovalColumnKey, string> = {
    quotationOwnerName: 'QuotationOwnerName',
    quotationOfferNo: 'QuotationOfferNo',
    quotationRevisionNo: 'QuotationRevisionNo',
    quotationCustomerName: 'QuotationCustomerName',
    quotationCustomerCode: 'QuotationCustomerCode',
    quotationGrandTotal: 'QuotationGrandTotal',
    approvalRequestId: 'ApprovalRequestId',
    approvalRequestDescription: 'ApprovalRequestDescription',
    stepOrder: 'StepOrder',
    approvedByUserFullName: 'ApprovedByUserFullName',
    actionDate: 'ActionDate',
    status: 'Status',
  };
  return map[key];
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function statusLabel(status: number, fallback?: string | null): string {
  if (status === 1) return 'Bekliyor';
  if (status === 2) return 'Onaylandı';
  if (status === 3) return 'Reddedildi';
  if (status === 4) return 'Kapandı';
  return fallback || 'Bekliyor';
}

export function PurchaseWaitingApprovalsPage({ kind }: PurchaseWaitingApprovalsPageProps): ReactElement {
  const config = KIND_CONFIG[kind];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [sortBy, setSortBy] = useState<WaitingApprovalColumnKey>('actionDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<WaitingApprovalColumnKey[]>(DEFAULT_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<WaitingApprovalColumnKey[]>(DEFAULT_COLUMNS);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalActionGetDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const filters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);

  const query = useQuery({
    queryKey: ['purchase', kind, 'waiting-approvals', pageNumber, pageSize, search, sortBy, sortDirection, filters],
    queryFn: () => fetchWaitingApprovals(config.endpoint, pageNumber, pageSize, search, sortBy, sortDirection, filters),
    staleTime: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: (data: ApproveActionDto) => approve(config.endpoint, data),
    onSuccess: () => {
      toast.success('Satınalma onayı tamamlandı.');
      void queryClient.invalidateQueries({ queryKey: ['purchase', kind, 'waiting-approvals'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase', kind] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Satınalma onayı tamamlanamadı.'),
  });

  const rejectMutation = useMutation({
    mutationFn: (data: RejectActionDto) => reject(config.endpoint, data),
    onSuccess: () => {
      toast.success('Satınalma kaydı reddedildi.');
      void queryClient.invalidateQueries({ queryKey: ['purchase', kind, 'waiting-approvals'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase', kind] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Satınalma reddi tamamlanamadı.'),
  });

  const rows = query.data?.data ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key));
  const resolvedColumns = useMemo(
    () => columns.map((column) => column.key === 'quotationOfferNo' ? { ...column, label: config.documentLabel } : column),
    [config.documentLabel],
  );
  const filterColumns = useMemo<FilterColumnConfig[]>(
    () => resolvedColumns.map((column) => ({ value: toApiSort(column.key), type: column.key === 'quotationGrandTotal' || column.key === 'approvalRequestId' || column.key === 'stepOrder' || column.key === 'status' ? 'number' : column.key === 'actionDate' ? 'date' : 'string', labelKey: column.label })),
    [resolvedColumns],
  );
  const exportColumns = useMemo(() => resolvedColumns.map((column) => ({ key: column.key, label: column.label })), [resolvedColumns]);
  const exportRows = useMemo(
    () => rows.map((row) => ({
      quotationOwnerName: row.quotationOwnerName ?? '-',
      quotationOfferNo: row.quotationOfferNo ?? '-',
      quotationRevisionNo: row.quotationRevisionNo ?? '-',
      quotationCustomerName: row.quotationCustomerName ?? '-',
      quotationCustomerCode: row.quotationCustomerCode ?? '-',
      quotationGrandTotal: row.quotationGrandTotalDisplay ?? '-',
      approvalRequestId: row.approvalRequestId,
      approvalRequestDescription: row.approvalRequestDescription ?? '-',
      stepOrder: row.stepOrder,
      approvedByUserFullName: row.approvedByUserFullName ?? '-',
      actionDate: formatDate(row.actionDate),
      status: statusLabel(row.status, row.statusName),
    })),
    [rows],
  );

  const handleSort = (key: WaitingApprovalColumnKey): void => {
    if (sortBy === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
    setPageNumber(1);
  };

  return (
    <div className="min-h-screen bg-[var(--crm-page-bg)] px-4 py-6 text-[var(--crm-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[min(1600px,calc(100vw-3rem))] space-y-6">
        <div className="flex min-w-0 items-start gap-3">
          <DocumentBackButton onBack={() => navigate(config.listPath)} backLabel="Geri" />
          <div className="min-w-0 space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">{config.title}</h1>
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-[var(--crm-brand-primary)]" />
              {config.description}
            </p>
          </div>
        </div>

        <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
          <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
            <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
              <Clock className="h-5 w-5" />
              Bekleyen Onay Listesi
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{totalCount} adet bekleyen onay</span>
            </CardTitle>
            <DataTableActionBar
              pageKey={config.pageKey}
              columns={resolvedColumns}
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
              onVisibleColumnsChange={(next) => setVisibleColumns(next as WaitingApprovalColumnKey[])}
              onColumnOrderChange={(next) => setColumnOrder(next as WaitingApprovalColumnKey[])}
              exportFileName={config.pageKey}
              exportColumns={exportColumns}
              exportRows={exportRows}
              filterColumns={filterColumns}
              defaultFilterColumn={filterColumns[0]?.value ?? 'QuotationOfferNo'}
              draftFilterRows={draftFilterRows}
              onDraftFilterRowsChange={setDraftFilterRows}
              onApplyFilters={() => {
                setAppliedFilterRows(draftFilterRows);
                setPageNumber(1);
              }}
              onClearFilters={() => {
                setDraftFilterRows([]);
                setAppliedFilterRows([]);
                setSearchResetKey((current) => current + 1);
                setPageNumber(1);
              }}
              appliedFilterCount={appliedFilterRows.length}
              search={{
                onSearchChange: (value) => {
                  setSearch(value);
                  setPageNumber(1);
                },
                placeholder: 'Ara',
                minLength: 1,
                resetKey: searchResetKey,
              }}
              refresh={{
                onRefresh: () => void query.refetch(),
                isLoading: query.isFetching,
                cooldownSeconds: 10,
                label: 'Yenile',
              }}
            />
          </CardHeader>
          <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
            <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
              <ManagementDataTableChrome>
                <DataTableGrid<ApprovalActionGetDto, WaitingApprovalColumnKey>
                  columns={resolvedColumns}
                  visibleColumnKeys={orderedVisibleColumns}
                  rows={rows}
                  rowKey={(row) => row.id}
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  isLoading={query.isLoading || query.isFetching}
                  isError={query.isError}
                  loadingText="Bekleyen satınalma onayları yükleniyor..."
                  errorText="Bekleyen satınalma onayları yüklenemedi."
                  emptyText="Bekleyen onay bulunamadı."
                  minTableWidthClassName="min-w-[1500px]"
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
                  onPreviousPage={() => setPageNumber((current) => Math.max(1, current - 1))}
                  onNextPage={() => setPageNumber((current) => Math.min(totalPages, current + 1))}
                  previousLabel="Önceki"
                  nextLabel="Sonraki"
                  paginationInfoText={`${startRow}-${endRow} / ${totalCount} kayıt`}
                  disablePaginationButtons={query.isFetching}
                  centerColumnHeaders
                  showActionsColumn
                  actionsHeaderLabel="İşlemler"
                  actionsCellClassName="text-center"
                  renderActionsCell={(row) => (
                    <WaitingApprovalsActionButtons
                      approveLabel="Onayla"
                      rejectLabel="Reddet"
                      isPending={approveMutation.isPending || rejectMutation.isPending}
                      onApprove={(event) => {
                        event.stopPropagation();
                        approveMutation.mutate({ approvalActionId: row.id });
                      }}
                      onReject={(event) => {
                        event.stopPropagation();
                        setSelectedApproval(row);
                        setRejectReason('');
                      }}
                      className="flex justify-center gap-2"
                    />
                  )}
                  onRowClick={(row) => navigate(`${config.detailBasePath}/${row.entityId || row.approvalRequestId}`)}
                  onRowDoubleClick={(row) => navigate(`${config.detailBasePath}/${row.entityId || row.approvalRequestId}`)}
                  renderCell={(row, key) => {
                    if (key === 'quotationGrandTotal') return row.quotationGrandTotalDisplay ?? '-';
                    if (key === 'approvalRequestId') return `#${row.approvalRequestId}`;
                    if (key === 'stepOrder') return row.stepOrder;
                    if (key === 'actionDate') return formatDate(row.actionDate);
                    if (key === 'status') return <WaitingApprovalsStatusBadge status={row.status} label={statusLabel(row.status, row.statusName)} />;
                    return String(row[key] ?? '-');
                  }}
                />
              </ManagementDataTableChrome>
            </div>
          </CardContent>
        </Card>
      </div>
      <WaitingApprovalsRejectDialog
        open={selectedApproval != null}
        onOpenChange={(open) => {
          if (!open) setSelectedApproval(null);
        }}
        title="Satınalma kaydını reddet"
        description="Bu satınalma onay adımı reddedilecek. Gerekçeyi yazmanız takip açısından önemlidir."
        reasonLabel="Red gerekçesi"
        reasonPlaceholder="Red nedenini yazın..."
        cancelLabel="Vazgeç"
        confirmLabel="Reddet"
        loadingLabel="Reddediliyor"
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onConfirm={() => {
          if (!selectedApproval) return;
          rejectMutation.mutate({ approvalActionId: selectedApproval.id, rejectReason: rejectReason || null });
          setSelectedApproval(null);
        }}
        onCancel={() => setSelectedApproval(null)}
        isPending={rejectMutation.isPending}
      />
    </div>
  );
}

export function SupplierQuotationWaitingApprovalsPage(): ReactElement {
  return <PurchaseWaitingApprovalsPage kind="supplierQuotation" />;
}

export function PurchaseOrderWaitingApprovalsPage(): ReactElement {
  return <PurchaseWaitingApprovalsPage kind="order" />;
}
