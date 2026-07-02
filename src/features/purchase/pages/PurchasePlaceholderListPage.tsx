import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Eye, Plus } from 'lucide-react';
import { api } from '@/lib/axios';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTableActionBar, DataTableGrid, ManagementDataTableChrome, ManagementListPageHeader, type DataTableGridColumn } from '@/components/shared';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { rowsToBackendFilters } from '@/lib/advanced-filter-types';
import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  ADD_BUTTON_CLASS,
} from '@/lib/management-list-layout';
import type { ApiResponse, PagedFilter, PagedResponse } from '@/types/api';

type PurchaseEndpoint = 'PurchaseRequest' | 'PurchaseRfq' | 'SupplierQuotation' | 'PurchaseOrder';
type ColumnKey =
  | 'id'
  | 'documentNo'
  | 'status'
  | 'supplier'
  | 'buyer'
  | 'currency'
  | 'grandTotal'
  | 'requestCount'
  | 'documentDate'
  | 'description';

interface PurchaseListRow {
  id: number;
  documentNo: string;
  status: string | number;
  supplier?: string | null;
  buyer?: string | null;
  currency?: string | null;
  grandTotal?: number | null;
  requestCount: number;
  documentDate?: string | null;
  description?: string | null;
}

interface PurchasePlaceholderListPageProps {
  title: string;
  description: string;
  endpoint: PurchaseEndpoint;
  documentNoLabel: string;
  createPath: string;
  createLabel: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const columns: DataTableGridColumn<ColumnKey>[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'documentNo', label: 'Belge No', sortable: true },
  { key: 'status', label: 'Durum', sortable: true },
  { key: 'supplier', label: 'Tedarikçi', sortable: true },
  { key: 'buyer', label: 'Satınalmacı', sortable: true },
  { key: 'currency', label: 'Para Birimi', sortable: true },
  { key: 'grandTotal', label: 'Toplam', sortable: true },
  { key: 'requestCount', label: 'Bağlı Talep', sortable: false },
  { key: 'documentDate', label: 'Tarih', sortable: true },
  { key: 'description', label: 'Açıklama', sortable: true },
];

const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  'id',
  'documentNo',
  'status',
  'supplier',
  'buyer',
  'currency',
  'grandTotal',
  'requestCount',
  'documentDate',
  'description',
];

async function fetchPurchaseRows(
  endpoint: PurchaseEndpoint,
  pageNumber: number,
  pageSize: number,
  search: string,
  sortBy: string,
  sortDirection: 'asc' | 'desc',
  filters: PagedFilter[]
): Promise<PagedResponse<PurchaseListRow>> {
  const response = await api.post<ApiResponse<PagedResponse<Record<string, unknown>> & { items?: Record<string, unknown>[] }>>(
    `/api/${endpoint}/query`,
    {
      pageNumber,
      pageSize,
      search,
      sortBy,
      sortDirection,
      filterLogic: 'and',
      filters,
    }
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Satınalma listesi yüklenemedi');
  }

  const rawData = response.data as PagedResponse<Record<string, unknown>> & { items?: Record<string, unknown>[] };
  const items = rawData.data ?? rawData.items ?? [];
  const mappedRows = items.map((item) => mapPurchaseRow(endpoint, item));
  const totalCount = rawData.totalCount ?? mappedRows.length;
  const resolvedPageSize = rawData.pageSize ?? pageSize;

  return {
    data: mappedRows,
    totalCount,
    pageNumber: rawData.pageNumber ?? pageNumber,
    pageSize: resolvedPageSize,
    totalPages: rawData.totalPages ?? Math.max(1, Math.ceil(totalCount / resolvedPageSize)),
    hasPreviousPage: rawData.hasPreviousPage ?? pageNumber > 1,
    hasNextPage: rawData.hasNextPage ?? pageNumber * resolvedPageSize < totalCount,
  };
}

function mapPurchaseRow(endpoint: PurchaseEndpoint, item: Record<string, unknown>): PurchaseListRow {
  const requestIds = Array.isArray(item.purchaseRequestIds) ? item.purchaseRequestIds : [];
  const suppliers = Array.isArray(item.suppliers) ? item.suppliers : [];
  const documentNo =
    endpoint === 'PurchaseRequest'
      ? pickText(item.requestNo, item.revisionNo)
      : endpoint === 'PurchaseRfq'
        ? pickText(item.rfqNo, item.revisionNo)
      : endpoint === 'SupplierQuotation'
        ? pickText(item.quotationNo, item.revisionNo)
        : pickText(item.orderNo, item.revisionNo);
  const documentDate =
    endpoint === 'PurchaseRequest'
      ? pickText(item.requestDate)
      : endpoint === 'PurchaseRfq'
        ? pickText(item.rfqDate)
      : endpoint === 'SupplierQuotation'
        ? pickText(item.quotationDate)
        : pickText(item.orderDate);

  return {
    id: Number(item.id ?? 0),
    documentNo,
    status: (item.status as string | number | undefined) ?? '-',
    supplier: endpoint === 'PurchaseRfq' ? `${suppliers.length} tedarikçi` : pickText(item.supplierNameSnapshot, item.supplierErpCode),
    buyer: pickText(item.buyerUserName, item.requesterUserName),
    currency: pickText(item.currencyCode),
    grandTotal: typeof item.grandTotal === 'number' ? item.grandTotal : null,
    requestCount: endpoint === 'PurchaseRequest' ? 1 : requestIds.length,
    documentDate,
    description: pickText(item.description),
  };
}

function pickText(...values: unknown[]): string {
  const found = values.find((value) => typeof value === 'string' && value.trim().length > 0);
  return typeof found === 'string' ? found : '-';
}

function formatDate(value?: string | null): string {
  if (!value || value === '-') return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('tr-TR').format(date);
}

function formatMoney(value?: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function PurchasePlaceholderListPage({ title, description, endpoint, documentNoLabel, createPath, createLabel }: PurchasePlaceholderListPageProps) {
  const pageKey = `purchase-${endpoint.toLowerCase()}-list`;
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<ColumnKey>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_VISIBLE_COLUMNS);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [searchResetKey, setSearchResetKey] = useState(0);
  const debouncedSearch = useDebouncedValue(search, 450);
  const backendFilters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);

  const query = useQuery({
    queryKey: ['purchase', endpoint, pageNumber, pageSize, debouncedSearch, sortBy, sortDirection, backendFilters],
    queryFn: () => fetchPurchaseRows(endpoint, pageNumber, pageSize, debouncedSearch, resolveApiSort(endpoint, sortBy), sortDirection, backendFilters),
    staleTime: 30_000,
  });

  const rows = query.data?.data ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const totalPages = query.data?.totalPages ?? 1;

  const resolvedColumns = useMemo(
    () => columns.map((column) => (column.key === 'documentNo' ? { ...column, label: documentNoLabel } : column)),
    [documentNoLabel]
  );
  const orderedVisibleColumns = useMemo(
    () => columnOrder.filter((key) => visibleColumns.includes(key)),
    [columnOrder, visibleColumns]
  );
  const filterColumns = useMemo<FilterColumnConfig[]>(
    () => [
      { value: resolveApiSort(endpoint, 'documentNo'), type: 'string', labelKey: documentNoLabel },
      { value: 'Status', type: 'string', labelKey: 'Durum' },
      { value: 'SupplierNameSnapshot', type: 'string', labelKey: 'Tedarikçi' },
      { value: 'BuyerUserId', type: 'number', labelKey: 'Satınalmacı' },
      { value: 'CurrencyCode', type: 'string', labelKey: 'Para Birimi' },
      { value: 'GrandTotal', type: 'number', labelKey: 'Toplam' },
      { value: resolveApiSort(endpoint, 'documentDate'), type: 'date', labelKey: 'Tarih' },
      { value: 'Description', type: 'string', labelKey: 'Açıklama' },
    ],
    [documentNoLabel, endpoint]
  );
  const exportRows = useMemo(
    () =>
      rows.map((row) =>
        resolvedColumns.reduce<Record<string, unknown>>((acc, column) => {
          acc[column.label] = column.key === 'grandTotal'
            ? formatMoney(row.grandTotal)
            : column.key === 'documentDate'
              ? formatDate(row.documentDate)
              : row[column.key] ?? '-';
          return acc;
        }, {})
      ),
    [resolvedColumns, rows]
  );
  const exportColumns = useMemo(
    () => resolvedColumns.map((column) => ({ key: column.label, label: column.label })),
    [resolvedColumns]
  );

  const handleSort = (key: ColumnKey): void => {
    if (sortBy === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
    setPageNumber(1);
  };

  return (
    <div className="min-h-screen bg-[var(--crm-page-bg)] px-4 py-6 text-[var(--crm-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[min(1600px,calc(100vw-3rem))] space-y-6">
        <ManagementListPageHeader
          title={title}
          description={description}
          backLabel="Geri"
          actions={
            <Button asChild className={ADD_BUTTON_CLASS}>
              <Link to={createPath}>
                <Plus className="mr-2 h-4 w-4" />
                {createLabel}
              </Link>
            </Button>
          }
        />

        <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
          <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
            <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{title}</CardTitle>
            <DataTableActionBar
              pageKey={pageKey}
              columns={resolvedColumns}
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
              onVisibleColumnsChange={(next) => setVisibleColumns(next as ColumnKey[])}
              onColumnOrderChange={(next) => setColumnOrder(next as ColumnKey[])}
              exportFileName={pageKey}
              exportColumns={exportColumns}
              exportRows={exportRows}
              filterColumns={filterColumns}
              defaultFilterColumn={filterColumns[0]?.value ?? 'Id'}
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
                onRefresh: () => {
                  void query.refetch();
                },
                isLoading: query.isFetching,
                cooldownSeconds: 10,
                label: 'Yenile',
              }}
            />
          </CardHeader>
          <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
            <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
              <ManagementDataTableChrome>
                <DataTableGrid<PurchaseListRow, ColumnKey>
                  columns={resolvedColumns}
                  visibleColumnKeys={orderedVisibleColumns}
                  rows={rows}
                  rowKey={(row) => row.id}
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  isLoading={query.isLoading || query.isFetching}
                  isError={query.isError}
                  loadingText="Satınalma verileri yükleniyor..."
                  errorText="Satınalma listesi yüklenemedi."
                  emptyText="Kayıt bulunamadı."
                  minTableWidthClassName="min-w-[1200px]"
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
                  paginationInfoText={`${rows.length ? (pageNumber - 1) * pageSize + 1 : 0}-${Math.min(pageNumber * pageSize, totalCount)} / ${totalCount} kayıt`}
                  disablePaginationButtons={query.isFetching}
                  centerColumnHeaders
                  showActionsColumn={endpoint === 'PurchaseRfq'}
                  actionsHeaderLabel="İşlemler"
                  actionsCellClassName="text-center"
                  renderActionsCell={(row) =>
                    endpoint === 'PurchaseRfq' ? (
                      <Button asChild variant="ghost" size="icon" className="h-9 w-9">
                        <Link to={`/purchase/rfqs/${row.id}`} aria-label="RFQ detayını aç">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null
                  }
                  onColumnOrderChange={(next) => setColumnOrder(next as ColumnKey[])}
                  renderCell={(row, key) => {
                    if (key === 'grandTotal') return formatMoney(row.grandTotal);
                    if (key === 'documentDate') return formatDate(row.documentDate);
                    return String(row[key] ?? '-');
                  }}
                />
              </ManagementDataTableChrome>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function resolveApiSort(endpoint: PurchaseEndpoint, key: ColumnKey): string {
  if (key === 'id') return 'Id';
  if (key === 'documentNo') {
    if (endpoint === 'PurchaseRequest') return 'RequestNo';
    if (endpoint === 'PurchaseRfq') return 'RfqNo';
    if (endpoint === 'SupplierQuotation') return 'QuotationNo';
    return 'OrderNo';
  }
  if (key === 'documentDate') {
    if (endpoint === 'PurchaseRequest') return 'RequestDate';
    if (endpoint === 'PurchaseRfq') return 'RfqDate';
    if (endpoint === 'SupplierQuotation') return 'QuotationDate';
    return 'OrderDate';
  }
  if (key === 'supplier') return 'SupplierNameSnapshot';
  if (key === 'buyer') return 'BuyerUserId';
  if (key === 'currency') return 'CurrencyCode';
  if (key === 'grandTotal') return 'GrandTotal';
  if (key === 'description') return 'Description';
  return 'Status';
}

export function PurchaseRequestListPage() {
  return (
    <PurchasePlaceholderListPage
      title="Satınalma Talep Listesi"
      description="Satınalma talepleri satış taleplerinden bağımsız tabloda izlenir."
      endpoint="PurchaseRequest"
      documentNoLabel="Talep No"
      createPath="/purchase/requests/create"
      createLabel="Yeni Talep"
    />
  );
}

export function PurchaseRfqListPage() {
  return (
    <PurchasePlaceholderListPage
      title="Tedarikçi Teklif İstekleri"
      description="Satınalma taleplerinden bir veya birkaç tedarikçiye RFQ/e-posta gönderim süreci izlenir."
      endpoint="PurchaseRfq"
      documentNoLabel="RFQ No"
      createPath="/purchase/rfqs/create"
      createLabel="Yeni RFQ"
    />
  );
}

export function SupplierQuotationListPage() {
  return (
    <PurchasePlaceholderListPage
      title="Tedarikçi Teklif Listesi"
      description="Bir talep için birden fazla tedarikçi teklifi veya bir teklif içinde birden fazla talep izlenebilir."
      endpoint="SupplierQuotation"
      documentNoLabel="Teklif No"
      createPath="/purchase/supplier-quotations/create"
      createLabel="Yeni Tedarikçi Teklifi"
    />
  );
}

export function PurchaseOrderListPage() {
  return (
    <PurchasePlaceholderListPage
      title="Satınalma Sipariş Listesi"
      description="Satınalma siparişleri ERP gönderimi ve WMS mal kabul durum referansı ile izlenir."
      endpoint="PurchaseOrder"
      documentNoLabel="Sipariş No"
      createPath="/purchase/orders/create"
      createLabel="Yeni Sipariş"
    />
  );
}
