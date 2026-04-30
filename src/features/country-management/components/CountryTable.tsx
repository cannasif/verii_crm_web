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
import { useDeleteCountry } from '../hooks/useDeleteCountry';
import type { CountryDto } from '../types/country-types';
import { Edit2, Trash2, Loader2 } from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';
import { toast } from 'sonner';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';

export interface ColumnDef<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'date' | 'user' | 'id';
  className?: string;
}

type CountryColumnKey = keyof CountryDto;

interface CountryTableProps {
  toolbar?: React.ReactNode;
  columns: DataTableGridColumn<CountryColumnKey>[];
  visibleColumnKeys: CountryColumnKey[];
  rows: CountryDto[];
  rowKey: (row: CountryDto) => string | number;
  renderCell: (row: CountryDto, key: CountryColumnKey) => React.ReactNode;
  sortBy: CountryColumnKey;
  sortDirection: 'asc' | 'desc';
  onSort: (key: CountryColumnKey) => void;
  renderSortIcon: (key: CountryColumnKey) => React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  onEdit: (country: CountryDto) => void;
  rowClassName?: string | ((row: CountryDto) => string | undefined);
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

export const getColumnsConfig = (t: TFunction): ColumnDef<CountryDto>[] => [
  { key: 'id', label: t('table.id'), type: 'id', className: 'w-[60px] md:w-[80px]' },
  { key: 'name', label: t('table.name'), type: 'text', className: 'min-w-[140px] md:min-w-[200px] font-medium' },
  { key: 'code', label: t('table.code'), type: 'text', className: 'w-[100px] md:w-[140px]' },
  { key: 'erpCode', label: t('table.erpCode'), type: 'text', className: 'w-[100px] md:w-[140px]' },
  { key: 'createdDate', label: t('table.createdDate'), type: 'date', className: 'w-[140px] md:w-[160px]' },
  { key: 'createdByFullUser', label: t('table.createdBy'), type: 'user', className: 'w-[140px] md:w-[160px]' },
];

export function CountryTable({
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
}: CountryTableProps): ReactElement {
  const { t } = useTranslation(['country-management', 'common']);
  const { canUpdate, canDelete } = useCrudPermissions();
  const deleteCountry = useDeleteCountry();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryDto | null>(null);

  const handleDeleteClick = (country: CountryDto): void => {
    if (!canDelete) return;
    setSelectedCountry(country);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedCountry) {
      try {
        await deleteCountry.mutateAsync(selectedCountry.id);
        setDeleteDialogOpen(false);
        setSelectedCountry(null);
        toast.success(t('messages.deleteSuccess'));
      } catch (error) {
        console.error(error);
        toast.error(t('messages.deleteError'));
      }
    }
  };

  const renderActionsCell = (country: CountryDto): ReactElement => (
    <div className="flex justify-end gap-2 opacity-100 transition-opacity">
      {canUpdate ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(country)}
          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
        >
          <Edit2 size={16} />
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDeleteClick(country)}
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <Trash2 size={16} />
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <ManagementDataTableChrome>
      <DataTableGrid<CountryDto, CountryColumnKey>
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
        showActionsColumn={Boolean(showActionsColumn && (canUpdate || canDelete))}
        actionsHeaderLabel={actionsHeaderLabel}
        renderActionsCell={renderActionsCell}
        rowClassName={rowClassName}
        onRowDoubleClick={onEdit}
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

      <Dialog open={canDelete && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                {t('delete.confirmMessage', { name: selectedCountry?.name })}
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
              disabled={deleteCountry.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteCountry.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
