import { type ReactElement, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteApprovalRoleGroup } from '../hooks/useDeleteApprovalRoleGroup';
import type { ApprovalRoleGroupDto } from '../types/approval-role-group-types';
import { Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';

export interface ColumnDef<T> {
  key: keyof T | 'actions';
  label: string;
  className?: string;
}

interface ApprovalRoleGroupTableProps {
  roleGroups: ApprovalRoleGroupDto[];
  isLoading: boolean;
  onEdit: (roleGroup: ApprovalRoleGroupDto) => void;
  visibleColumns?: string[];
  columnOrder?: string[];
}

export const getColumnsConfig = (t: TFunction): ColumnDef<ApprovalRoleGroupDto>[] => [
  { key: 'id', label: t('approvalRoleGroup.table.id'), className: 'w-[100px]' },
  { key: 'name', label: t('approvalRoleGroup.table.name'), className: 'min-w-[200px]' },
  { key: 'createdDate', label: t('approvalRoleGroup.table.createdDate'), className: 'w-[160px]' },
  { key: 'createdByFullUser', label: t('approvalRoleGroup.table.createdBy'), className: 'w-[160px]' },
];

export function ApprovalRoleGroupTable({
  roleGroups,
  isLoading,
  onEdit,
  visibleColumns: visibleColumnsProp,
  columnOrder: columnOrderProp,
}: ApprovalRoleGroupTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRoleGroup, setSelectedRoleGroup] = useState<ApprovalRoleGroupDto | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortConfig, setSortConfig] = useState<{ key: keyof ApprovalRoleGroupDto; direction: 'asc' | 'desc' } | null>(null);

  const deleteRoleGroup = useDeleteApprovalRoleGroup();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const visibleColumns = useMemo(
    () => visibleColumnsProp ?? [...tableColumns.map((c) => c.key), 'actions'],
    [visibleColumnsProp, tableColumns]
  );
  const columnOrder = useMemo(
    () => columnOrderProp ?? [...tableColumns.map((c) => c.key), 'actions'],
    [columnOrderProp, tableColumns]
  );
  const orderedColumns = useMemo(
    () => columnOrder.filter((k) => tableColumns.some((c) => c.key === k) || k === 'actions'),
    [columnOrder, tableColumns]
  );

  const processedRoleGroups = useMemo(() => {
    const result = [...roleGroups];

    if (sortConfig) {
      result.sort((a, b) => {
        const aRaw = a[sortConfig.key];
        const bRaw = b[sortConfig.key];
        const aValue = aRaw != null ? String(aRaw).toLowerCase() : '';
        const bValue = bRaw != null ? String(bRaw).toLowerCase() : '';

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [roleGroups, sortConfig]);

  const totalPages = Math.ceil(processedRoleGroups.length / pageSize);
  const paginatedRoleGroups = processedRoleGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteClick = (roleGroup: ApprovalRoleGroupDto): void => {
    setSelectedRoleGroup(roleGroup);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedRoleGroup) {
      await deleteRoleGroup.mutateAsync(selectedRoleGroup.id);
      setDeleteDialogOpen(false);
      setSelectedRoleGroup(null);
    }
  };

  const handleSort = (column: string): void => {
    const newDirection =
      sortConfig?.key === column && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key: column as keyof ApprovalRoleGroupDto, direction: newDirection });
  };

  const SortIcon = ({ column }: { column: string }): ReactElement => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown size={14} className="ml-2 inline-block text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={14} className="ml-2 inline-block text-pink-600 dark:text-pink-400" />
    ) : (
      <ArrowDown size={14} className="ml-2 inline-block text-pink-600 dark:text-pink-400" />
    );
  };

  const headStyle = "cursor-pointer select-none text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors py-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap";
  const cellStyle = "text-slate-600 dark:text-slate-400 text-sm py-4 border-b border-slate-100 dark:border-white/5 align-middle";

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
           <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-current text-pink-500" />
           <div className="text-sm text-muted-foreground animate-pulse">
             {t('common.loading')}
           </div>
        </div>
      </div>
    );
  }

  if (roleGroups.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('approvalRoleGroup.noData')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white/50 dark:bg-transparent">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-white/5">
            <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
              {orderedColumns.map((key) => {
                if (key === 'actions') {
                  return (
                    <TableHead key="actions" className={`${headStyle} text-right w-[100px]`}>
                      {t('approvalRoleGroup.table.actions')}
                    </TableHead>
                  );
                }
                const column = tableColumns.find((c) => c.key === key);
                if (!column || !visibleColumns.includes(column.key as string)) return null;
                return (
                  <TableHead
                    key={column.key as string}
                    className={`${headStyle} ${column.className}`}
                    onClick={() => handleSort(column.key as string)}
                  >
                    <div className="flex items-center gap-1 group">
                      {column.label}
                      <SortIcon column={column.key as string} />
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRoleGroups.map((roleGroup) => (
              <TableRow 
                key={roleGroup.id}
                className="border-b border-slate-100 dark:border-white/5 transition-colors duration-200 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 group"
              >
                {orderedColumns.map((key) => {
                  if (key === 'actions') {
                    return (
                      <TableCell key="actions" className={`${cellStyle} text-right`}>
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(roleGroup)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                            title={t('common.edit')}
                          >
                            <Edit2 size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(roleGroup)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </TableCell>
                    );
                  }
                  if (!visibleColumns.includes(key)) return null;
                  if (key === 'id') {
                    return (
                      <TableCell key="id" className={cellStyle}>
                        <span className="font-mono text-xs bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                          #{roleGroup.id}
                        </span>
                      </TableCell>
                    );
                  }
                  if (key === 'name') {
                    return (
                      <TableCell key="name" className={`${cellStyle} font-medium text-slate-900 dark:text-white`}>
                        {roleGroup.name || '-'}
                      </TableCell>
                    );
                  }
                  if (key === 'createdDate') {
                    return (
                      <TableCell key="createdDate" className={cellStyle}>
                        {new Date(roleGroup.createdDate).toLocaleDateString(i18n.language)}
                      </TableCell>
                    );
                  }
                  if (key === 'createdByFullUser') {
                    return (
                      <TableCell key="createdByFullUser" className={cellStyle}>
                        {roleGroup.createdByFullUser || roleGroup.createdByFullName || roleGroup.createdBy || '-'}
                      </TableCell>
                    );
                  }
                  return null;
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t('common.table.showing', {
            from: (currentPage - 1) * pageSize + 1,
            to: Math.min(currentPage * pageSize, processedRoleGroups.length),
            total: processedRoleGroups.length,
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage <= 1} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('common.previous')}</Button>
          <div className="flex items-center px-4 text-sm font-medium text-slate-700 dark:text-slate-200">{t('common.table.page', { current: currentPage, total: totalPages || 1 })}</div>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('common.next')}</Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
               <Alert02Icon size={36} className="text-red-600 dark:text-red-500" />
            </div>
            
            <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('approvalRoleGroup.delete.title')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('approvalRoleGroup.delete.confirmMessage', {
                    name: selectedRoleGroup?.name || '',
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
              disabled={deleteRoleGroup.isPending}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteRoleGroup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete')}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}
