import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DataTableGrid, type DataTableGridColumn } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { useCreateRevisionOfOrder } from '../hooks/useCreateRevisionOfOrder';
import type { OrderGetDto } from '../types/order-types';
import { Mail } from 'lucide-react';
import { GoogleCustomerMailDialog } from '@/features/google-integration/components/GoogleCustomerMailDialog';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type OrderColumnKey =
  | 'Id'
  | 'OfferNo'
  | 'PotentialCustomerName'
  | 'RepresentativeName'
  | 'OfferDate'
  | 'Currency'
  | 'GrandTotal'
  | 'Status';

interface OrderTableProps {
  columns: DataTableGridColumn<OrderColumnKey>[];
  visibleColumnKeys: OrderColumnKey[];
  rows: OrderGetDto[];
  rowKey: (row: OrderGetDto) => string | number;
  renderCell: (row: OrderGetDto, columnKey: OrderColumnKey) => React.ReactNode;
  sortBy: OrderColumnKey;
  sortDirection: 'asc' | 'desc';
  onSort: (columnKey: OrderColumnKey) => void;
  renderSortIcon: (columnKey: OrderColumnKey) => React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  rowClassName?: string | ((row: OrderGetDto) => string | undefined);
  onRowClick?: (row: OrderGetDto) => void;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPageSizeChange: (size: number) => void;
  pageNumber: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  previousLabel: string;
  nextLabel: string;
  paginationInfoText: string;
  disablePaginationButtons?: boolean;
}

export function OrderTable({
  columns,
  visibleColumnKeys,
  rows,
  rowKey,
  renderCell,
  sortBy,
  sortDirection,
  onSort,
  renderSortIcon,
  isLoading = false,
  isError = false,
  loadingText = 'Loading...',
  errorText = 'An error occurred.',
  emptyText = 'No data.',
  minTableWidthClassName = 'min-w-[920px] lg:min-w-[1100px]',
  showActionsColumn = true,
  actionsHeaderLabel = '',
  rowClassName,
  onRowClick,
  pageSize,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onPageSizeChange,
  pageNumber,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  previousLabel,
  nextLabel,
  paginationInfoText,
  disablePaginationButtons = false,
}: OrderTableProps): ReactElement {
  const { t } = useTranslation(['order', 'google-integration']);
  const navigate = useNavigate();
  const createRevisionMutation = useCreateRevisionOfOrder();
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderGetDto | null>(null);

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

  const handleOpenMailDialog = (event: React.MouseEvent, order: OrderGetDto): void => {
    event.stopPropagation();
    setSelectedOrder(order);
    setMailDialogOpen(true);
  };

  const renderActionsCell = (order: OrderGetDto): ReactElement => (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => handleOpenMailDialog(e, order)}
      >
        <Mail className="h-4 w-4 mr-1" />
        {t('google-integration:mailDialog.openButton')}
      </Button>
      {(order.status === 0 || order.status === 1) && (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => handleRevision(e, order.id)}
          disabled={createRevisionMutation.isPending}
        >
          {createRevisionMutation.isPending ? t('order.loading') : t('order.list.revise')}
        </Button>
      )}
    </div>
  );

  return (
    <>
      <DataTableGrid<OrderGetDto, OrderColumnKey>
        columns={columns}
        visibleColumnKeys={visibleColumnKeys}
        rows={rows}
        rowKey={rowKey}
        renderCell={renderCell}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={onSort}
        renderSortIcon={renderSortIcon}
        isLoading={isLoading}
        isError={isError}
        loadingText={loadingText}
        errorText={errorText}
        emptyText={emptyText}
        minTableWidthClassName={minTableWidthClassName}
        showActionsColumn={showActionsColumn}
        actionsHeaderLabel={actionsHeaderLabel}
        renderActionsCell={renderActionsCell}
        rowClassName={rowClassName}
        onRowClick={onRowClick}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        onPageSizeChange={onPageSizeChange}
        pageNumber={pageNumber}
        totalPages={totalPages}
        hasPreviousPage={hasPreviousPage}
        hasNextPage={hasNextPage}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
        previousLabel={previousLabel}
        nextLabel={nextLabel}
        paginationInfoText={paginationInfoText}
        disablePaginationButtons={disablePaginationButtons}
      />
      <GoogleCustomerMailDialog
        open={mailDialogOpen}
        onOpenChange={setMailDialogOpen}
        moduleKey="order"
        recordId={selectedOrder?.id ?? 0}
        customerId={selectedOrder?.potentialCustomerId}
        contactId={selectedOrder?.contactId}
        customerName={selectedOrder?.potentialCustomerName}
      />
    </>
  );
}
