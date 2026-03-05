import { type ReactElement, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { DataTableGrid, type DataTableGridColumn } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteCustomerType } from '../hooks/useDeleteCustomerType';
import type { CustomerTypeDto } from '../types/customer-type-types';
import { Edit2, Trash2, Tag, FileText, Calendar, User } from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';
import { toast } from 'sonner';

export interface ColumnDef<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'date' | 'user' | 'badge' | 'description';
  className?: string;
}

type CustomerTypeColumnKey = keyof CustomerTypeDto;

interface CustomerTypeTableProps {
  columns: DataTableGridColumn<CustomerTypeColumnKey>[];
  visibleColumnKeys: CustomerTypeColumnKey[];
  rows: CustomerTypeDto[];
  rowKey: (row: CustomerTypeDto) => string | number;
  sortBy: CustomerTypeColumnKey;
  sortDirection: 'asc' | 'desc';
  onSort: (key: CustomerTypeColumnKey) => void;
  renderSortIcon: (key: CustomerTypeColumnKey) => React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  onEdit: (customerType: CustomerTypeDto) => void;
  rowClassName?: string | ((row: CustomerTypeDto) => string | undefined);
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

export const getColumnsConfig = (t: TFunction): ColumnDef<CustomerTypeDto>[] => [
  { key: 'id', label: t('customerTypeManagement.table.id'), type: 'text', className: 'font-medium w-[50px] md:w-[70px]' },
  { key: 'name', label: t('customerTypeManagement.table.name'), type: 'badge', className: 'font-semibold text-slate-900 dark:text-white min-w-[140px] md:min-w-[180px]' },
  { key: 'description', label: t('customerTypeManagement.table.description'), type: 'description', className: 'min-w-[180px] md:min-w-[220px]' },
  { key: 'createdDate', label: t('customerTypeManagement.table.createdDate'), type: 'date', className: 'whitespace-nowrap' },
  { key: 'createdByFullUser', label: t('customerTypeManagement.table.createdBy'), type: 'user', className: 'whitespace-nowrap' },
];

function renderCellContent(
  item: CustomerTypeDto,
  column: ColumnDef<CustomerTypeDto>,
  i18n: { language: string }
): React.ReactNode {
  const value = item[column.key];
  if (!value && value !== 0) return '-';

  switch (column.type) {
    case 'badge':
      return (
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-pink-500" />
          {String(value)}
        </div>
      );
    case 'description':
      return (
        <div className="flex items-start gap-2">
          <FileText size={14} className="text-slate-400 mt-0.5 shrink-0" />
          {String(value)}
        </div>
      );
    case 'date':
      return (
        <div className="flex items-center gap-2 text-xs">
          <Calendar size={14} className="text-pink-500/50" />
          {new Date(String(value)).toLocaleDateString(i18n.language)}
        </div>
      );
    case 'user':
      return (
        <div className="flex items-center gap-2 text-xs">
          <User size={14} className="text-indigo-500/50" />
          {String(value)}
        </div>
      );
    default:
      return String(value);
  }
}

export function CustomerTypeTable({
  columns,
  visibleColumnKeys,
  rows,
  rowKey,
  sortBy,
  sortDirection,
  onSort,
  renderSortIcon,
  disablePaginationButtons = false,
  isLoading = false,
  loadingText = 'Loading...',
  errorText = 'An error occurred.',
  emptyText = 'No data.',
  minTableWidthClassName = 'min-w-[600px] lg:min-w-[800px]',
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
}: CustomerTypeTableProps): ReactElement {
  const { t, i18n } = useTranslation(['customer-type-management', 'common']);
  const deleteCustomerType = useDeleteCustomerType();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomerType, setSelectedCustomerType] = useState<CustomerTypeDto | null>(null);

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);

  const handleDeleteClick = (customerType: CustomerTypeDto): void => {
    setSelectedCustomerType(customerType);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedCustomerType) {
      try {
        await deleteCustomerType.mutateAsync(selectedCustomerType.id);
        setDeleteDialogOpen(false);
        setSelectedCustomerType(null);
        toast.success(t('customerTypeManagement.messages.deleteSuccess', { defaultValue: t('customerTypeManagement.delete.success') }));
      } catch {
        toast.error(t('customerTypeManagement.messages.deleteError', { defaultValue: t('customerTypeManagement.delete.error') }));
      }
    }
  };

  const cellRenderer = (row: CustomerTypeDto, key: CustomerTypeColumnKey): React.ReactNode => {
    const col = tableColumns.find((c) => c.key === key);
    if (col) return renderCellContent(row, col, i18n);
    const val = row[key];
    if (val == null && val !== 0) return '-';
    return String(val);
  };

  const renderActionsCell = (customerType: CustomerTypeDto): ReactElement => (
    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(customerType)}
        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <Edit2 size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleDeleteClick(customerType)}
        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  return (
    <>
      <DataTableGrid<CustomerTypeDto, CustomerTypeColumnKey>
        columns={columns}
        visibleColumnKeys={visibleColumnKeys}
        rows={rows}
        rowKey={rowKey}
        renderCell={cellRenderer}
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
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
              <Alert02Icon size={36} className="text-red-600 dark:text-red-500" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('customerTypeManagement.delete.confirmTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('customerTypeManagement.delete.confirmMessage', {
                  name: selectedCustomerType?.name || '',
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
              disabled={deleteCustomerType.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteCustomerType.isPending ? <span className="animate-pulse">{t('customerTypeManagement.loading')}</span> : null}
              {t('customerTypeManagement.delete.action', { defaultValue: t('customerTypeManagement.delete.confirmButton') })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
