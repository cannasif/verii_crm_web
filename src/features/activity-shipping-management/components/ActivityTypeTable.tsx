import { type ReactElement, useState, useMemo } from 'react';
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
import { useDeleteActivityType } from '../hooks/useDeleteActivityType';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';
import type { ActivityTypeDto } from '../types/activity-type-types';
import { Edit2, Trash2, FileText, Calendar, User, ListTodo } from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';
import { toast } from 'sonner';

export interface ColumnDef<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'date' | 'user' | 'description';
  className?: string;
}

type ActivityTypeColumnKey = keyof ActivityTypeDto;

interface ActivityTypeTableProps {
  toolbar?: React.ReactNode;
  columns: DataTableGridColumn<ActivityTypeColumnKey>[];
  visibleColumnKeys: ActivityTypeColumnKey[];
  rows: ActivityTypeDto[];
  rowKey: (row: ActivityTypeDto) => string | number;
  sortBy: ActivityTypeColumnKey;
  sortDirection: 'asc' | 'desc';
  onSort: (key: ActivityTypeColumnKey) => void;
  renderSortIcon: (key: ActivityTypeColumnKey) => React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  onEdit: (activityType: ActivityTypeDto) => void;
  rowClassName?: string | ((row: ActivityTypeDto) => string | undefined);
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

export const getColumnsConfig = (t: TFunction): ColumnDef<ActivityTypeDto>[] => [
  { key: 'id', label: t('table.id'), type: 'text', className: 'font-medium w-[80px]' },
  { key: 'name', label: t('table.name'), type: 'text', className: 'font-semibold text-slate-900 dark:text-white min-w-[200px]' },
  { key: 'description', label: t('table.description'), type: 'description', className: 'min-w-[250px]' },
  { key: 'createdDate', label: t('table.createdDate'), type: 'date', className: 'whitespace-nowrap' },
  { key: 'createdByFullUser', label: t('table.createdBy'), type: 'user', className: 'whitespace-nowrap' },
];

function renderCellContent(
  item: ActivityTypeDto,
  column: ColumnDef<ActivityTypeDto>,
  i18n: { language: string }
): React.ReactNode {
  const value = item[column.key];
  if (!value && value !== 0) return '-';

  switch (column.type) {
    case 'description':
      return (
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-slate-400 shrink-0" />
          <span className="truncate max-w-[300px]" title={String(value)}>
            {String(value)}
          </span>
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
    case 'text':
    default:
      if (column.key === 'name') {
        return (
          <div className="flex items-center gap-2">
            <ListTodo size={14} className="text-slate-400" />
            {String(value)}
          </div>
        );
      }
      return String(value);
  }
}

export function ActivityTypeTable({
  toolbar,
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
}: ActivityTypeTableProps): ReactElement {
  const { t, i18n } = useTranslation(['activity-shipping-management', 'common']);
  const { canUpdate, canDelete } = useCrudPermissions();
  const deleteActivityType = useDeleteActivityType();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedActivityType, setSelectedActivityType] = useState<ActivityTypeDto | null>(null);

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);

  const handleDeleteClick = (activityType: ActivityTypeDto): void => {
    if (!canDelete) return;
    setSelectedActivityType(activityType);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedActivityType) {
      try {
        await deleteActivityType.mutateAsync(selectedActivityType.id);
        setDeleteDialogOpen(false);
        setSelectedActivityType(null);
        toast.success(t('messages.deleteSuccess'));
      } catch {
        toast.error(t('messages.deleteError'));
      }
    }
  };

  const cellRenderer = (row: ActivityTypeDto, key: ActivityTypeColumnKey): React.ReactNode => {
    const col = tableColumns.find((c) => c.key === key);
    if (col) return renderCellContent(row, col, i18n);
    const val = row[key];
    if (val == null && val !== 0) return '-';
    return String(val);
  };

  const renderActionsCell = (activityType: ActivityTypeDto): ReactElement => (
    <div className="flex justify-end gap-2 opacity-100 transition-opacity">
      {canUpdate && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(activityType)}
          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
        >
          <Edit2 size={16} />
        </Button>
      )}
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDeleteClick(activityType)}
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <Trash2 size={16} />
        </Button>
      )}
    </div>
  );

  return (
    <>
      <ManagementDataTableChrome>
      <DataTableGrid<ActivityTypeDto, ActivityTypeColumnKey>
        toolbar={toolbar}
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
                {t('deleteConfirm.confirmTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('deleteConfirm.confirmMessage', {
                  name: selectedActivityType?.name || '',
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
              disabled={deleteActivityType.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteActivityType.isPending ? <span className="animate-pulse">{t('activityType.loading')}</span> : null}
              {t('deleteButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
