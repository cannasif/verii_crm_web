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
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteApprovalUserRole } from '../hooks/useDeleteApprovalUserRole';
import type { ApprovalUserRoleDto } from '../types/approval-user-role-types';
import { 
    Edit2, 
    Trash2, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    ChevronLeft, 
    ChevronRight,
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';

export interface ColumnDef<T> {
  key: keyof T | 'actions';
  label: string;
  className?: string;
}

interface ApprovalUserRoleTableProps {
  userRoles: ApprovalUserRoleDto[];
  isLoading: boolean;
  onEdit: (userRole: ApprovalUserRoleDto) => void;
  visibleColumns?: string[];
  columnOrder?: string[];
}

export const getColumnsConfig = (t: TFunction): ColumnDef<ApprovalUserRoleDto>[] => [
  { key: 'id', label: t('approvalUserRole.table.id'), className: 'w-[100px]' },
  { key: 'userFullName', label: t('approvalUserRole.table.userFullName'), className: 'min-w-[200px]' },
  { key: 'approvalRoleName', label: t('approvalUserRole.table.approvalRoleName'), className: 'min-w-[200px]' },
  { key: 'createdDate', label: t('approvalUserRole.table.createdDate'), className: 'w-[160px]' },
  { key: 'createdByFullUser', label: t('approvalUserRole.table.createdBy'), className: 'w-[160px]' },
];

export function ApprovalUserRoleTable({
  userRoles,
  isLoading,
  onEdit,
  visibleColumns: visibleColumnsProp,
  columnOrder: columnOrderProp,
}: ApprovalUserRoleTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserRole, setSelectedUserRole] = useState<ApprovalUserRoleDto | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortConfig, setSortConfig] = useState<{ key: keyof ApprovalUserRoleDto; direction: 'asc' | 'desc' } | null>(null);

  const deleteUserRole = useDeleteApprovalUserRole();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const visibleColumns = useMemo(
    () => visibleColumnsProp ?? [...tableColumns.map((col) => col.key), 'actions'],
    [visibleColumnsProp, tableColumns]
  );
  const columnOrder = useMemo(
    () => columnOrderProp ?? [...tableColumns.map((col) => col.key), 'actions'],
    [columnOrderProp, tableColumns]
  );
  const orderedColumns = useMemo(
    () => columnOrder.filter((k) => tableColumns.some((c) => c.key === k) || k === 'actions'),
    [columnOrder, tableColumns]
  );

  const processedUserRoles = useMemo(() => {
    const result = [...userRoles];

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
  }, [userRoles, sortConfig]);

  const totalPages = Math.ceil(processedUserRoles.length / pageSize);
  const paginatedUserRoles = processedUserRoles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteClick = (userRole: ApprovalUserRoleDto): void => {
    setSelectedUserRole(userRole);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedUserRole) {
      await deleteUserRole.mutateAsync(selectedUserRole.id);
      setDeleteDialogOpen(false);
      setSelectedUserRole(null);
    }
  };

  const handleSort = (column: string): void => {
    const newDirection =
      sortConfig?.key === column && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key: column as keyof ApprovalUserRoleDto, direction: newDirection });
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

  if (userRoles.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('approvalUserRole.noData')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white/50 dark:bg-white/5 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-white/5">
            <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
              {orderedColumns.map((key) => {
                if (key === 'actions') {
                  return (
                    <TableHead key="actions" className={`${headStyle} text-right w-[100px]`}>
                      {t('approvalUserRole.table.actions')}
                    </TableHead>
                  );
                }
                const column = tableColumns.find((c) => c.key === key);
                if (!column || !visibleColumns.includes(column.key)) return null;
                return (
                  <TableHead
                    key={column.key}
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
            {paginatedUserRoles.map((userRole) => (
              <TableRow 
                key={userRole.id}
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
                            onClick={() => onEdit(userRole)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                            title={t('common.edit')}
                          >
                            <Edit2 size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(userRole)}
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
                          #{userRole.id}
                        </span>
                      </TableCell>
                    );
                  }
                  if (key === 'userFullName') {
                    return (
                      <TableCell key="userFullName" className={`${cellStyle} font-medium text-slate-900 dark:text-white`}>
                        {userRole.userFullName || '-'}
                      </TableCell>
                    );
                  }
                  if (key === 'approvalRoleName') {
                    return (
                      <TableCell key="approvalRoleName" className={cellStyle}>
                        {userRole.approvalRoleName || '-'}
                      </TableCell>
                    );
                  }
                  if (key === 'createdDate') {
                    return (
                      <TableCell key="createdDate" className={cellStyle}>
                        {new Date(userRole.createdDate).toLocaleDateString(i18n.language)}
                      </TableCell>
                    );
                  }
                  if (key === 'createdByFullUser') {
                    return (
                      <TableCell key="createdByFullUser" className={cellStyle}>
                        {userRole.createdByFullUser || userRole.createdByFullName || userRole.createdBy || '-'}
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

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
            {t('common.showing')}: <span className="font-medium text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> - <span className="font-medium text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, processedUserRoles.length)}</span> / <span className="font-medium text-slate-900 dark:text-white">{processedUserRoles.length}</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
            >
                <ChevronLeft size={16} />
            </Button>
            
            <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                    .map((page, i, arr) => (
                        <>
                            {i > 0 && arr[i - 1] !== page - 1 && (
                                <span key={`dots-${i}`} className="px-1 text-slate-400">...</span>
                            )}
                            <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className={`h-8 w-8 p-0 ${currentPage === page ? 'bg-pink-600 hover:bg-pink-700 text-white' : ''}`}
                            >
                                {page}
                            </Button>
                        </>
                    ))}
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
            >
                <ChevronRight size={16} />
            </Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[400px] p-0 bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 overflow-hidden rounded-2xl">
          <div className="p-6 flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
               <Alert02Icon size={32} />
            </div>
            
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {t('approvalUserRole.delete.title')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400">
                {t('approvalUserRole.delete.confirmMessage')}
              </DialogDescription>
            </div>

            {selectedUserRole && (
              <div className="w-full bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/5">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {selectedUserRole.userFullName || '-'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  {selectedUserRole.approvalRoleName || '-'}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex gap-3">
             <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1 h-11 rounded-xl border-slate-200 dark:border-white/10"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
