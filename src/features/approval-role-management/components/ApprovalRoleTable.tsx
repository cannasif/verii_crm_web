import { type ReactElement, useState } from 'react';
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
import { useDeleteApprovalRole } from '../hooks/useDeleteApprovalRole';
import type { ApprovalRoleDto } from '../types/approval-role-types';
import { Edit2, Trash2, Loader2 } from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';
import { toast } from 'sonner';

export interface ColumnDef<T> {
  key: keyof T | 'actions';
  label: string;
  className?: string;
}

const SORT_MAP: Record<string, string> = {
  id: 'Id',
  approvalRoleGroupName: 'ApprovalRoleGroupName',
  name: 'Name',
  maxAmount: 'MaxAmount',
  createdDate: 'CreatedDate',
  createdByFullUser: 'CreatedByFullUser',
};

type ApprovalRoleColumnKey = keyof ApprovalRoleDto;

export const getColumnsConfig = (t: TFunction): ColumnDef<ApprovalRoleDto>[] => [
  { key: 'id', label: t('approvalRole.table.id'), className: 'w-[100px]' },
  { key: 'approvalRoleGroupName', label: t('approvalRole.table.approvalRoleGroupName'), className: 'min-w-[180px]' },
  { key: 'name', label: t('approvalRole.table.name'), className: 'min-w-[160px]' },
  { key: 'maxAmount', label: t('approvalRole.table.maxAmount'), className: 'w-[140px]' },
  { key: 'createdDate', label: t('approvalRole.table.createdDate'), className: 'w-[140px]' },
  { key: 'createdByFullUser', label: t('approvalRole.table.createdBy'), className: 'w-[140px]' },
];

interface ApprovalRoleTableProps {
  onEdit: (role: ApprovalRoleDto) => void;
  toolbar?: React.ReactNode;
  columns: DataTableGridColumn<ApprovalRoleColumnKey>[];
  visibleColumnKeys: ApprovalRoleColumnKey[];
  rows: ApprovalRoleDto[];
  rowKey: (row: ApprovalRoleDto) => string | number;
  renderCell: (row: ApprovalRoleDto, key: ApprovalRoleColumnKey) => React.ReactNode;
  sortBy: ApprovalRoleColumnKey;
  sortDirection: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
  renderSortIcon: (key: ApprovalRoleColumnKey) => React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  rowClassName?: string | ((row: ApprovalRoleDto) => string | undefined);
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

export function ApprovalRoleTable({
  onEdit,
  toolbar,
  columns,
  visibleColumnKeys,
  rows,
  rowKey,
  renderCell,
  sortBy,
  sortDirection,
  onSortChange,
  renderSortIcon,
  isLoading = false,
  loadingText = 'Loading...',
  errorText = 'An error occurred.',
  emptyText = 'No data.',
  minTableWidthClassName = 'min-w-[800px] lg:min-w-[1000px]',
  showActionsColumn = true,
  actionsHeaderLabel = '',
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
  disablePaginationButtons = false,
}: ApprovalRoleTableProps): ReactElement {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ApprovalRoleDto | null>(null);

  const deleteRole = useDeleteApprovalRole();

  const handleDeleteClick = (role: ApprovalRoleDto): void => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedRole) {
      try {
        await deleteRole.mutateAsync(selectedRole.id);
        setDeleteDialogOpen(false);
        setSelectedRole(null);
        toast.success(t('approvalRole.messages.deleteSuccess', { defaultValue: t('approvalRole.delete.confirmButton') }));
      } catch (error) {
        console.error(error);
        toast.error(t('approvalRole.messages.deleteError', { defaultValue: 'Silme hatası' }));
      }
    }
  };

  const handleSort = (key: ApprovalRoleColumnKey): void => {
    const backendSortBy = SORT_MAP[key as string] ?? key;
    const newDirection = sortBy === backendSortBy && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(backendSortBy, newDirection);
  };

  const renderActionsCell = (role: ApprovalRoleDto): ReactElement => (
    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(role)}
        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <Edit2 size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleDeleteClick(role)}
        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  return (
    <>
      <DataTableGrid<ApprovalRoleDto, ApprovalRoleColumnKey>
        toolbar={toolbar}
        columns={columns}
        visibleColumnKeys={visibleColumnKeys}
        rows={rows}
        rowKey={rowKey}
        renderCell={renderCell}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={(k) => handleSort(k as ApprovalRoleColumnKey)}
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
                {t('approvalRole.delete.confirmTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('approvalRole.delete.confirmMessage')}
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
              disabled={deleteRole.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteRole.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
