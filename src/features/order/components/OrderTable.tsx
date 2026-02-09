import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ApprovalStatusBadge } from '@/features/approval/components/ApprovalStatusBadge';
import type { ApprovalStatus } from '@/features/approval/types/approval-types';
import { useOrderList } from '../hooks/useOrderList';
import { useCreateRevisionOfOrder } from '../hooks/useCreateRevisionOfOrder';
import type { OrderGetDto } from '../types/order-types';
import type { PagedFilter } from '@/types/api';
import { formatCurrency } from '../utils/format-currency';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface OrderTableProps {
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: PagedFilter[] | Record<string, unknown>;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
  onRowClick: (orderId: number) => void;
}

export function OrderTable({
  pageNumber,
  pageSize,
  sortBy = 'Id',
  sortDirection = 'desc',
  filters = {},
  onPageChange,
  onSortChange,
  onRowClick,
}: OrderTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const createRevisionMutation = useCreateRevisionOfOrder();

  const { data, isLoading, isFetching } = useOrderList({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    filters: filters as PagedFilter[] | undefined,
  });

  const handleRevision = async (e: React.MouseEvent, orderId: number): Promise<void> => {
    e.stopPropagation();
    try {
      const result = await createRevisionMutation.mutateAsync(orderId);
      if (result.success && result.data?.id) {
        navigate(`/orders/${result.data.id}`);
      }
    } catch {
      void 0;
    }
  };

  const handleSort = (column: string): void => {
    const newDirection = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(column, newDirection);
  };

  const SortIcon = ({ column }: { column: string }): ReactElement => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="ml-2 w-3 h-3 opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-2 w-3 h-3 text-pink-600 dark:text-pink-500" />
    ) : (
      <ChevronDown className="ml-2 w-3 h-3 text-pink-600 dark:text-pink-500" />
    );
  };

  if (isLoading || isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 border border-zinc-300 dark:border-zinc-700/80 rounded-xl bg-white/50 dark:bg-card/50">
        <div className="w-10 h-10 border-4 border-muted border-t-pink-500 rounded-full animate-spin" />
        <span className="text-muted-foreground animate-pulse text-sm font-medium">
          {t('order.loading', 'Yükleniyor...')}
        </span>
      </div>
    );
  }

  const orders = data?.data || [];

  if (!data || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground border border-zinc-300 dark:border-zinc-700/80 border-dashed rounded-xl bg-white/50 dark:bg-card/50">
        <p className="text-sm font-medium">{t('order.noData', 'Veri yok')}</p>
      </div>
    );
  }

  const totalPages = Math.ceil((data.totalCount || 0) / pageSize);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(i18n.language);
  };

  return (
    <>
      <div className="rounded-md border border-zinc-300 dark:border-zinc-700/80 overflow-hidden bg-white/50 dark:bg-card/50">
        <div className="overflow-x-auto">
        <Table className="min-w-[920px] lg:min-w-[1100px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('Id')}
              >
                <div className="flex items-center">
                  {t('order.list.id', 'ID')}
                  <SortIcon column="Id" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('OfferNo')}
              >
                <div className="flex items-center">
                  {t('order.list.offerNo', 'Sipariş No')}
                  <SortIcon column="OfferNo" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('PotentialCustomerName')}
              >
                <div className="flex items-center">
                  {t('order.list.customer', 'Müşteri')}
                  <SortIcon column="PotentialCustomerName" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('RepresentativeName')}
              >
                <div className="flex items-center">
                  {t('order.list.representative', 'Temsilci')}
                  <SortIcon column="RepresentativeName" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('OfferDate')}
              >
                <div className="flex items-center">
                  {t('order.list.offerDate', 'Sipariş Tarihi')}
                  <SortIcon column="OfferDate" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('Currency')}
              >
                <div className="flex items-center">
                  {t('order.list.currency', 'Para Birimi')}
                  <SortIcon column="Currency" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort('GrandTotal')}
              >
                <div className="flex items-center justify-end">
                  {t('order.list.grandTotal', 'Genel Toplam')}
                  <SortIcon column="GrandTotal" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('Status')}
              >
                <div className="flex items-center">
                  {t('order.list.status', 'Durum')}
                  <SortIcon column="Status" />
                </div>
              </TableHead>
              <TableHead className="text-center">
                {t('order.list.actions', 'İşlemler')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order: OrderGetDto) => (
              <TableRow
                key={order.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onRowClick(order.id)}
              >
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.offerNo || '-'}</TableCell>
                <TableCell>{order.potentialCustomerName || '-'}</TableCell>
                <TableCell>{order.representativeName || '-'}</TableCell>
                <TableCell>{formatDate(order.offerDate)}</TableCell>
                <TableCell>{order.currency || '-'}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(order.grandTotal, order.currency || 'TRY')}
                </TableCell>
                <TableCell>
                  {typeof order.status === 'number' && order.status >= 0 && order.status <= 4 ? (
                    <ApprovalStatusBadge status={order.status as ApprovalStatus} />
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {(order.status === 0 || order.status === 1) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleRevision(e, order.id)}
                      disabled={createRevisionMutation.isPending}
                      className="w-full"
                    >
                      {createRevisionMutation.isPending
                        ? t('order.loading', 'Yükleniyor...')
                        : t('order.list.revise', 'Revize et')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {t('order.list.showing', '{{from}}-{{to}} / {{total}} gösteriliyor', {
            from: (pageNumber - 1) * pageSize + 1,
            to: Math.min(pageNumber * pageSize, data.totalCount || 0),
            total: data.totalCount || 0,
          })}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageNumber - 1)}
            disabled={pageNumber <= 1}
          >
            {t('order.previous', 'Önceki')}
          </Button>
          <div className="flex items-center px-4 text-sm">
            {t('order.list.page', 'Sayfa {{current}} / {{total}}', {
              current: pageNumber,
              total: totalPages,
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageNumber + 1)}
            disabled={pageNumber >= totalPages}
          >
            {t('order.next', 'Sonraki')}
          </Button>
        </div>
      </div>
    </>
  );
}
