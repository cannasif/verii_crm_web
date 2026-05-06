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
import { useDeleteApprovalFlow } from '../hooks/useDeleteApprovalFlow';
import type { ApprovalFlowDto } from '../types/approval-flow-types';
import { Edit2, Trash2, Loader2 } from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';
import { toast } from 'sonner';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';

export interface ColumnDef<T> {
  key: keyof T | 'actions';
  label: string;
  className?: string;
}

type ApprovalFlowColumnKey = keyof ApprovalFlowDto;

export const getColumnsConfig = (t: TFunction): ColumnDef<ApprovalFlowDto>[] => [
  { key: 'id', label: t('approvalFlow.table.id'), className: 'w-[100px]' },
  { key: 'documentType', label: t('approvalFlow.table.documentType'), className: 'min-w-[150px]' },
  { key: 'description', label: t('approvalFlow.table.description'), className: 'min-w-[200px] max-w-[300px]' },
  { key: 'isActive', label: t('approvalFlow.table.isActive'), className: 'w-[120px]' },
  { key: 'createdDate', label: t('approvalFlow.table.createdDate'), className: 'w-[160px]' },
  { key: 'createdByFullUser', label: t('approvalFlow.table.createdBy'), className: 'w-[160px]' },
];

interface ApprovalFlowTableProps {
  onEdit: (approvalFlow: ApprovalFlowDto) => void;
  toolbar?: React.ReactNode;
  columns: DataTableGridColumn<ApprovalFlowColumnKey>[];
  visibleColumnKeys: ApprovalFlowColumnKey[];
  rows: ApprovalFlowDto[];
  rowKey: (row: ApprovalFlowDto) => string | number;
  renderCell: (row: ApprovalFlowDto, key: ApprovalFlowColumnKey, colWidth?: number) => React.ReactNode;
  sortBy: ApprovalFlowColumnKey;
  sortDirection: 'asc' | 'desc';
  onSort: (key: ApprovalFlowColumnKey) => void;
  renderSortIcon: (key: ApprovalFlowColumnKey) => React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  rowClassName?: string | ((row: ApprovalFlowDto) => string | undefined);
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
  onColumnOrderChange?: (newOrder: string[]) => void;
}

export function ApprovalFlowTable({
  onEdit,
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
  onColumnOrderChange,
}: ApprovalFlowTableProps): ReactElement {
  const { t } = useTranslation();
  const { canUpdate, canDelete } = useCrudPermissions('approval.flow-management.view');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedApprovalFlow, setSelectedApprovalFlow] = useState<ApprovalFlowDto | null>(null);

  const deleteApprovalFlow = useDeleteApprovalFlow();

  const handleDeleteClick = (approvalFlow: ApprovalFlowDto): void => {
    if (!canDelete) return;
    setSelectedApprovalFlow(approvalFlow);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedApprovalFlow) {
      try {
        await deleteApprovalFlow.mutateAsync(selectedApprovalFlow.id);
        setDeleteDialogOpen(false);
        setSelectedApprovalFlow(null);
        toast.success(t('approvalFlow.messages.deleteSuccess', { defaultValue: t('common.delete.action') }));
      } catch (error) {
        console.error(error);
        toast.error(t('approvalFlow.messages.deleteError', { defaultValue: 'Silme hatası' }));
      }
    }
  };

  const renderActionsCell = (approvalFlow: ApprovalFlowDto): ReactElement => (
    <div className="flex justify-end gap-2 opacity-100 transition-opacity">
      {canUpdate ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(approvalFlow)}
          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
        >
          <Edit2 size={16} />
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDeleteClick(approvalFlow)}
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
      <DataTableGrid<ApprovalFlowDto, ApprovalFlowColumnKey>
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
        onColumnOrderChange={onColumnOrderChange}
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
                {t('approvalFlow.delete.title')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('approvalFlow.delete.confirm')}
              </DialogDescription>
            </div>
            {selectedApprovalFlow && (
              <div className="w-full bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/5">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {selectedApprovalFlow.documentType === 1
                    ? t('approvalFlow.documentType.demand')
                    : selectedApprovalFlow.documentType === 2
                      ? t('approvalFlow.documentType.quotation')
                      : selectedApprovalFlow.documentType === 3
                        ? t('approvalFlow.documentType.order')
                        : '-'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  {selectedApprovalFlow.description || '-'}
                </div>
              </div>
            )}
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
              disabled={deleteApprovalFlow.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteApprovalFlow.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
