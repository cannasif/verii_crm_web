import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { DataTableGrid, ManagementDataTableChrome, type DataTableGridColumn } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeletePaymentType } from '../hooks/useDeletePaymentType';
import type { PaymentTypeDto } from '../types/payment-type-types';
import { Edit2, Trash2, Loader2 } from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';
import { toast } from 'sonner';

export interface ColumnDef<T> {
  key: keyof T | 'status';
  label: string;
  type: 'text' | 'date' | 'status' | 'code' | 'id';
  className?: string;
}

type PaymentTypeColumnKey = keyof PaymentTypeDto | 'status';

interface PaymentTypeTableProps {
  toolbar?: React.ReactNode;
  columns: DataTableGridColumn<PaymentTypeColumnKey>[];
  visibleColumnKeys: PaymentTypeColumnKey[];
  rows: PaymentTypeDto[];
  rowKey: (row: PaymentTypeDto) => string | number;
  renderCell: (row: PaymentTypeDto, key: PaymentTypeColumnKey) => React.ReactNode;
  sortBy: PaymentTypeColumnKey;
  sortDirection: 'asc' | 'desc';
  onSort: (key: PaymentTypeColumnKey) => void;
  renderSortIcon: (key: PaymentTypeColumnKey) => React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  onEdit: (paymentType: PaymentTypeDto) => void;
  rowClassName?: string | ((row: PaymentTypeDto) => string | undefined);
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

export const getColumnsConfig = (t: TFunction): ColumnDef<PaymentTypeDto>[] => [
  { key: 'id', label: t('table.id'), type: 'id', className: 'w-[100px]' },
  { key: 'name', label: t('table.name'), type: 'text', className: 'min-w-[200px] font-medium' },
  { key: 'description', label: t('table.description'), type: 'text', className: 'min-w-[200px]' },
  { key: 'createdDate', label: t('createdDate'), type: 'date', className: 'w-[160px]' },
  { key: 'updatedDate', label: t('updatedDate'), type: 'date', className: 'w-[160px]' },
  { key: 'isDeleted', label: t('table.status'), type: 'status', className: 'w-[120px]' },
];

export function PaymentTypeTable({
  toolbar,
  columns,
  visibleColumnKeys,
  rows,
  rowKey,
  renderCell,
  sortBy,
  sortDirection,
  onSort,
  renderSortIcon,
  disablePaginationButtons = false,
  isLoading = false,
  loadingText = 'Loading...',
  errorText = 'An error occurred.',
  emptyText = 'No data.',
  minTableWidthClassName = 'min-w-[800px] lg:min-w-[1000px]',
  showActionsColumn = true,
  actionsHeaderLabel = '',
  onEdit,
  rowClassName,
  pageSize,
  pageSizeOptions,
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
}: PaymentTypeTableProps): ReactElement {
  const { t } = useTranslation(['payment-type-management', 'common']);
  const deletePaymentType = useDeletePaymentType();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentTypeDto | null>(null);

  const handleDeleteClick = (paymentType: PaymentTypeDto): void => {
    setSelectedPaymentType(paymentType);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedPaymentType) {
      try {
        await deletePaymentType.mutateAsync(selectedPaymentType.id);
        setDeleteDialogOpen(false);
        setSelectedPaymentType(null);
        toast.success(t('delete.success'));
      } catch {
        toast.error(t('delete.error'));
      }
    }
  };

  const renderActionsCell = (paymentType: PaymentTypeDto): ReactElement => (
    <div className="flex justify-end gap-2 opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(paymentType)}
        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <Edit2 size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleDeleteClick(paymentType)}
        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  return (
    <>
      <ManagementDataTableChrome>
      <DataTableGrid<PaymentTypeDto, PaymentTypeColumnKey>
        toolbar={toolbar}
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
        isError={false}
        loadingText={loadingText}
        errorText={errorText}
        emptyText={emptyText}
        minTableWidthClassName={minTableWidthClassName}
        showActionsColumn={showActionsColumn}
        actionsHeaderLabel={actionsHeaderLabel}
        renderActionsCell={renderActionsCell}
        rowClassName={rowClassName}
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
        centerColumnHeaders
      />
      </ManagementDataTableChrome>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
              <Alert02Icon size={36} className="text-red-600 dark:text-red-500" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('delete.confirmTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('delete.confirmMessage', {
                  name: selectedPaymentType?.name || '',
                })}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 justify-center p-6 bg-slate-50/50 dark:bg-[#1a1025]/50 border-t border-slate-100 dark:border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletePaymentType.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deletePaymentType.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
