import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTableGrid, type DataTableGridColumn } from '@/components/shared';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
} from '@/lib/management-list-layout';
import { useUIStore } from '@/stores/ui-store';
import { useErpDocumentCleanupLogs } from '../hooks/useErpDocumentCleanupLogs';
import type { ErpCleanupDocumentType, ErpCleanupOperationStatus, ErpDocumentCleanupLog } from '../types/erp-document-cleanup-log-types';

type CleanupLogColumnKey =
  | 'createdDate'
  | 'documentType'
  | 'sourceDocumentNumber'
  | 'erpDocumentNumber'
  | 'newDocumentNumber'
  | 'overallStatus'
  | 'erpDeleteStatus'
  | 'requestedByUserFullName'
  | 'cleanupReason';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const EMPTY_ROWS: ErpDocumentCleanupLog[] = [];

function getDocumentTypeLabel(type: ErpCleanupDocumentType): string {
  switch (type) {
    case 1:
      return 'Talep';
    case 2:
      return 'Teklif';
    case 3:
      return 'Sipariş';
    default:
      return '-';
  }
}

function getStatusLabel(status: ErpCleanupOperationStatus): string {
  switch (status) {
    case 0:
      return 'Başlamadı';
    case 1:
      return 'Bekliyor';
    case 2:
      return 'Başarılı';
    case 3:
      return 'Hatalı';
    default:
      return '-';
  }
}

function getStatusVariant(status: ErpCleanupOperationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 2) return 'default';
  if (status === 3) return 'destructive';
  if (status === 1) return 'secondary';
  return 'outline';
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function ErpDocumentCleanupLogPage(): ReactElement {
  const { t } = useTranslation(['common']);
  const { setPageTitle } = useUIStore();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  useEffect(() => {
    setPageTitle(t('sidebar.erpDocumentCleanupLogs', { defaultValue: 'ERP Kayıt Temizleme Logları' }));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const request = useMemo(
    () => ({
      pageNumber,
      pageSize,
      search: appliedSearch,
      sortBy: 'createdDate',
      sortDirection: 'desc' as const,
    }),
    [appliedSearch, pageNumber, pageSize]
  );

  const logsQuery = useErpDocumentCleanupLogs(request);
  const rows = logsQuery.data?.data ?? EMPTY_ROWS;
  const totalPages = logsQuery.data?.totalPages ?? 1;
  const totalCount = logsQuery.data?.totalCount ?? 0;

  const columns = useMemo<DataTableGridColumn<CleanupLogColumnKey>[]>(
    () => [
      { key: 'createdDate', label: 'Tarih', sortable: false, cellClassName: 'whitespace-nowrap' },
      { key: 'documentType', label: 'Belge Tipi', sortable: false },
      { key: 'sourceDocumentNumber', label: 'Eski Belge No', sortable: false },
      { key: 'erpDocumentNumber', label: 'ERP No', sortable: false },
      { key: 'newDocumentNumber', label: 'Yeni Belge No', sortable: false },
      { key: 'overallStatus', label: 'Durum', sortable: false },
      { key: 'erpDeleteStatus', label: 'ERP Silme', sortable: false },
      { key: 'requestedByUserFullName', label: 'İşlemi Yapan', sortable: false },
      { key: 'cleanupReason', label: 'Silme Nedeni', sortable: false, cellClassName: 'min-w-[240px]' },
    ],
    []
  );

  const renderCell = (row: ErpDocumentCleanupLog, key: CleanupLogColumnKey): React.ReactNode => {
    switch (key) {
      case 'createdDate':
        return formatDate(row.createdDate);
      case 'documentType':
        return <Badge variant="outline">{getDocumentTypeLabel(row.documentType)}</Badge>;
      case 'overallStatus':
        return <Badge variant={getStatusVariant(row.overallStatus)}>{getStatusLabel(row.overallStatus)}</Badge>;
      case 'erpDeleteStatus':
        return <Badge variant={getStatusVariant(row.erpDeleteStatus)}>{getStatusLabel(row.erpDeleteStatus)}</Badge>;
      case 'sourceDocumentNumber':
        return row.sourceDocumentNumber || row.sourceDocumentId;
      case 'newDocumentNumber':
        return row.newDocumentNumber || row.newDocumentId || '-';
      case 'erpDocumentNumber':
        return row.erpDocumentNumber || '-';
      case 'requestedByUserFullName':
        return row.requestedByUserFullName || row.requestedByUserId;
      case 'cleanupReason':
        return row.cleanupReason || '-';
      default:
        return '-';
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 pt-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('sidebar.erpDocumentCleanupLogs', { defaultValue: 'ERP Kayıt Temizleme Logları' })}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Talep, teklif ve siparişlerde ERP kaydı temizleme/kopyalama operasyonlarının izlenebilir kayıtları.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => logsQuery.refetch()}
          disabled={logsQuery.isFetching}
          className="h-11 rounded-xl font-bold"
        >
          <RotateCw className="mr-2 size-4" />
          Yenile
        </Button>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>Log Listesi</CardTitle>
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setPageNumber(1);
                    setAppliedSearch(search.trim());
                  }
                }}
                placeholder="Belge no, ERP no veya neden ara..."
                className="h-11 rounded-xl pl-9"
              />
            </div>
            <Button
              onClick={() => {
                setPageNumber(1);
                setAppliedSearch(search.trim());
              }}
              className="h-11 rounded-xl font-bold"
            >
              Ara
            </Button>
          </div>

          <DataTableGrid<ErpDocumentCleanupLog, CleanupLogColumnKey>
            columns={columns}
            visibleColumnKeys={columns.map((column) => column.key)}
            rows={rows}
            rowKey={(row) => row.id}
            renderCell={renderCell}
            isLoading={logsQuery.isLoading}
            isError={logsQuery.isError}
            loadingText="ERP kayıt temizleme logları yükleniyor..."
            errorText={logsQuery.error instanceof Error ? logsQuery.error.message : 'Loglar yüklenemedi.'}
            emptyText="Henüz ERP kayıt temizleme logu yok."
            minTableWidthClassName="min-w-[1180px]"
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
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
            paginationInfoText={`Sayfa ${pageNumber} / ${totalPages} • Toplam ${totalCount}`}
            disablePaginationButtons={logsQuery.isFetching}
          />
        </CardContent>
      </Card>
    </div>
  );
}
