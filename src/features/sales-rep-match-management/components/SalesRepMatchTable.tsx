import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert02Icon } from 'hugeicons-react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTableGrid, ManagementDataTableChrome, type DataTableGridColumn } from '@/components/shared';
import { useDeleteSalesRepMatch } from '../hooks/useDeleteSalesRepMatch';
import type { SalesRepMatchGetDto } from '../types/sales-rep-match-types';

type SalesRepMatchColumnKey = keyof SalesRepMatchGetDto;

interface SalesRepMatchTableProps {
  columns: DataTableGridColumn<SalesRepMatchColumnKey>[];
  visibleColumnKeys: SalesRepMatchColumnKey[];
  rows: SalesRepMatchGetDto[];
  rowKey: (row: SalesRepMatchGetDto) => string | number;
  renderCell: (row: SalesRepMatchGetDto, key: SalesRepMatchColumnKey) => React.ReactNode;
  sortBy: SalesRepMatchColumnKey;
  sortDirection: 'asc' | 'desc';
  onSort: (key: SalesRepMatchColumnKey) => void;
  renderSortIcon: (key: SalesRepMatchColumnKey) => React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  emptyText?: string;
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
}

export function SalesRepMatchTable({
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
  emptyText = 'No data.',
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
}: SalesRepMatchTableProps): ReactElement {
  const { t } = useTranslation(['sales-rep-match-management', 'common']);
  const deleteSalesRepMatch = useDeleteSalesRepMatch();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SalesRepMatchGetDto | null>(null);

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!selectedItem) return;
    await deleteSalesRepMatch.mutateAsync(selectedItem.id);
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  return (
    <>
      <ManagementDataTableChrome>
        <DataTableGrid<SalesRepMatchGetDto, SalesRepMatchColumnKey>
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
          errorText={t('error')}
          emptyText={emptyText}
          minTableWidthClassName="min-w-[960px] lg:min-w-[1160px]"
          showActionsColumn
          actionsHeaderLabel={t('common.actions', { ns: 'common' })}
          renderActionsCell={(item) => (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedItem(item);
                  setDeleteDialogOpen(true);
                }}
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          )}
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
          centerColumnHeaders
        />
      </ManagementDataTableChrome>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2">
              <Alert02Icon size={36} className="text-red-600 dark:text-red-500" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('common.delete.confirmTitle', { ns: 'common' })}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('deleteConfirmMessage', {
                  salesRep: selectedItem?.salesRepCode ?? '',
                  user: selectedItem?.userFullName || selectedItem?.username || '',
                })}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 justify-center p-6 bg-slate-50/50 dark:bg-[#1a1025]/50 border-t border-slate-100 dark:border-white/5">
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold">
              {t('common.cancel', { ns: 'common' })}
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm} disabled={deleteSalesRepMatch.isPending} className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold">
              {deleteSalesRepMatch.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete.action', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
