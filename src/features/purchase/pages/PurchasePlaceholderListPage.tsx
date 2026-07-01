import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { File01Icon } from 'hugeicons-react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { api } from '@/lib/axios';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableGrid, ManagementDataTableChrome, type DataTableGridColumn } from '@/components/shared';
import type { ApiResponse, PagedResponse } from '@/types/api';

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

const visibleColumns: ColumnKey[] = [
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
  sortDirection: 'asc' | 'desc'
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
      filters: [],
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

export function PurchasePlaceholderListPage({ title, description, endpoint, documentNoLabel }: PurchasePlaceholderListPageProps) {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<ColumnKey>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const debouncedSearch = useDebouncedValue(search, 450);

  const query = useQuery({
    queryKey: ['purchase', endpoint, pageNumber, pageSize, debouncedSearch, sortBy, sortDirection],
    queryFn: () => fetchPurchaseRows(endpoint, pageNumber, pageSize, debouncedSearch, resolveApiSort(endpoint, sortBy), sortDirection),
    staleTime: 30_000,
  });

  const rows = query.data?.data ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const totalPages = query.data?.totalPages ?? 1;

  const resolvedColumns = useMemo(
    () => columns.map((column) => (column.key === 'documentNo' ? { ...column, label: documentNoLabel } : column)),
    [documentNoLabel]
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
    <div className="min-h-screen bg-[var(--crm-page-bg)] px-6 py-8 text-[var(--crm-text-primary)]">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] shadow-sm">
              <File01Icon size={24} className="text-[var(--crm-brand-primary)]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{title}</h1>
              <p className="mt-1 text-sm text-[var(--crm-text-muted)]">{description}</p>
            </div>
          </div>
          {endpoint === 'PurchaseRfq' && (
            <Button asChild>
              <Link to="/purchase/rfqs/create">
                <Plus className="mr-2 h-4 w-4" />
                Yeni RFQ
              </Link>
            </Button>
          )}
        </header>

        <ManagementDataTableChrome>
          <DataTableGrid<PurchaseListRow, ColumnKey>
            toolbar={
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="relative min-w-[260px] flex-1 max-w-xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--crm-text-muted)]" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPageNumber(1);
                    }}
                    placeholder="Ara"
                    className="h-10 pl-10"
                  />
                </div>
                <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
                  Yenile
                </Button>
              </div>
            }
            columns={resolvedColumns}
            visibleColumnKeys={visibleColumns}
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
            renderCell={(row, key) => {
              if (key === 'grandTotal') return formatMoney(row.grandTotal);
              if (key === 'documentDate') return formatDate(row.documentDate);
              return String(row[key] ?? '-');
            }}
          />
        </ManagementDataTableChrome>
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
    />
  );
}
