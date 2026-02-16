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
import { useApprovalRoleList } from '../hooks/useApprovalRoleList';
import { useDeleteApprovalRole } from '../hooks/useDeleteApprovalRole';
import type { ApprovalRoleDto } from '../types/approval-role-types';
import type { PagedFilter } from '@/types/api';
import { ChevronUp, ChevronDown, ChevronsUpDown, Edit2, Trash2, ShieldCheck } from 'lucide-react';

export interface ColumnDef<T> {
  key: keyof T | 'actions';
  label: string;
  className?: string;
}

interface ApprovalRoleTableProps {
  onEdit: (role: ApprovalRoleDto) => void;
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: PagedFilter[] | Record<string, unknown>;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
  visibleColumns?: string[];
  columnOrder?: string[];
}

const SORT_MAP: Record<string, string> = {
  id: 'Id',
  approvalRoleGroupName: 'ApprovalRoleGroupName',
  name: 'Name',
  maxAmount: 'MaxAmount',
  createdDate: 'CreatedDate',
  createdByFullUser: 'CreatedByFullUser',
};

export const getColumnsConfig = (t: TFunction): ColumnDef<ApprovalRoleDto>[] => [
  { key: 'id', label: t('approvalRole.table.id'), className: 'w-[100px]' },
  { key: 'approvalRoleGroupName', label: t('approvalRole.table.approvalRoleGroupName'), className: 'min-w-[180px]' },
  { key: 'name', label: t('approvalRole.table.name'), className: 'min-w-[160px]' },
  { key: 'maxAmount', label: t('approvalRole.table.maxAmount'), className: 'w-[140px]' },
  { key: 'createdDate', label: t('approvalRole.table.createdDate'), className: 'w-[140px]' },
  { key: 'createdByFullUser', label: t('approvalRole.table.createdBy'), className: 'w-[140px]' },
];

export function ApprovalRoleTable({
  onEdit,
  pageNumber,
  pageSize,
  sortBy = 'Id',
  sortDirection = 'desc',
  filters = {},
  onPageChange,
  onSortChange,
  visibleColumns: visibleColumnsProp,
  columnOrder: columnOrderProp,
}: ApprovalRoleTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ApprovalRoleDto | null>(null);

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

  const { data, isLoading, isFetching } = useApprovalRoleList({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    filters: filters as PagedFilter[] | undefined,
  });

  const deleteRole = useDeleteApprovalRole();

  const handleDeleteClick = (role: ApprovalRoleDto): void => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedRole) {
      await deleteRole.mutateAsync(selectedRole.id);
      setDeleteDialogOpen(false);
      setSelectedRole(null);
    }
  };

  const handleSort = (column: string): void => {
    const backendSortBy = SORT_MAP[column] ?? column;
    const newDirection =
      sortBy === backendSortBy && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(backendSortBy, newDirection);
  };

  const getSortKey = (colKey: string): string => SORT_MAP[colKey] ?? colKey;

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ChevronsUpDown className="ml-2 w-3 h-3 opacity-30" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="ml-2 w-3 h-3 text-pink-600 dark:text-pink-500" /> : 
      <ChevronDown className="ml-2 w-3 h-3 text-pink-600 dark:text-pink-500" />;
  };

  const borderClass = "border-zinc-300 dark:border-zinc-700/80"; 

  if (isLoading || isFetching) {
    return (
      <div className={`flex flex-col items-center justify-center py-24 gap-4 border ${borderClass} rounded-xl bg-white/50 dark:bg-card/50`}>
        <div className="w-10 h-10 border-4 border-muted border-t-pink-500 rounded-full animate-spin" />
        <span className="text-muted-foreground animate-pulse text-sm font-medium">{t('approvalRole.loading')}</span>
      </div>
    );
  }

  const roles = data?.data || [];
  
  if (!data || roles.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-24 text-muted-foreground border ${borderClass} border-dashed rounded-xl bg-white/50 dark:bg-card/50`}>
        <ShieldCheck size={40} className="opacity-40 mb-2" />
        <p className="text-sm font-medium">{t('approvalRole.noData')}</p>
      </div>
    );
  }

  const totalPages = Math.ceil((data.totalCount || 0) / pageSize);

  const headStyle = "cursor-pointer select-none py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 hover:text-pink-600 dark:hover:text-pink-500 transition-colors border-b border-r border-zinc-300 dark:border-zinc-700 last:border-r-0";
  const headStyleStatic = "py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 border-b border-r border-zinc-300 dark:border-zinc-700";
  const cellStyle = `text-sm border-b border-r ${borderClass} px-4 py-3`;

  return (
    <div className="w-full">
      <Table className="border-collapse w-full">
        <TableHeader className="bg-zinc-200 dark:bg-muted/20">
          <TableRow className="hover:bg-transparent border-none">
            {orderedColumns.map((key) => {
              if (key === 'actions') {
                return (
                  <TableHead key="actions" className={`${headStyleStatic} text-right`}>
                    {t('approvalRole.table.actions')}
                  </TableHead>
                );
              }
              const column = tableColumns.find((c) => c.key === key);
              if (!column || !visibleColumns.includes(column.key as string)) return null;
              const isSortable = ['id', 'approvalRoleGroupName', 'name', 'maxAmount'].includes(key);
              return (
                <TableHead
                  key={column.key as string}
                  className={isSortable ? headStyle : headStyleStatic}
                  onClick={isSortable ? () => handleSort(key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {isSortable && <SortIcon column={getSortKey(key)} />}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role: ApprovalRoleDto, index: number) => (
            <TableRow 
              key={role.id || `role-${index}`}
              className={`group cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors duration-200 bg-white dark:bg-transparent`}
            >
              {orderedColumns.map((key) => {
                if (key === 'actions') {
                  return (
                    <TableCell key="actions" className={`${cellStyle} text-right`}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(role)}
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(role)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  );
                }
                if (!visibleColumns.includes(key)) return null;
                if (key === 'id') {
                  return (
                    <TableCell key="id" className={`font-mono text-xs text-muted-foreground ${cellStyle}`}>
                      {role.id}
                    </TableCell>
                  );
                }
                if (key === 'approvalRoleGroupName') {
                  return (
                    <TableCell key="approvalRoleGroupName" className={`font-semibold text-foreground/90 ${cellStyle} group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors`}>
                      {role.approvalRoleGroupName || '-'}
                    </TableCell>
                  );
                }
                if (key === 'name') {
                  return (
                    <TableCell key="name" className={`text-foreground/80 ${cellStyle}`}>
                      {role.name || '-'}
                    </TableCell>
                  );
                }
                if (key === 'maxAmount') {
                  return (
                    <TableCell key="maxAmount" className={`text-foreground/80 ${cellStyle}`}>
                      {new Intl.NumberFormat(i18n.language, {
                        style: 'currency',
                        currency: 'TRY',
                      }).format(role.maxAmount || 0)}
                    </TableCell>
                  );
                }
                if (key === 'createdDate') {
                  return (
                    <TableCell key="createdDate" className={`text-muted-foreground ${cellStyle}`}>
                      {role.createdDate ? new Date(role.createdDate).toLocaleDateString(i18n.language) : '-'}
                    </TableCell>
                  );
                }
                if (key === 'createdByFullUser') {
                  return (
                    <TableCell key="createdByFullUser" className={`text-muted-foreground ${cellStyle}`}>
                      {role.createdByFullUser || role.createdByFullName || role.createdBy || '-'}
                    </TableCell>
                  );
                }
                return null;
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className={`flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-zinc-50/50 dark:bg-muted/20 border-t-0 rounded-b-xl gap-4 border-x border-b ${borderClass}`}>
        <div className="text-xs text-muted-foreground font-medium">
            <span dangerouslySetInnerHTML={{ __html: t('approvalRole.table.totalRecords', { count: data?.totalCount || 0 }).replace('{{count}}', `<span class="font-bold text-foreground">${data?.totalCount || 0}</span>`) }} />
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className={`h-8 px-3 rounded-lg text-xs font-medium bg-white dark:bg-background hover:bg-pink-50 hover:border-pink-500 hover:text-pink-600 transition-all ${borderClass}`}
            onClick={() => onPageChange(pageNumber - 1)}
            disabled={pageNumber <= 1}
          >
            {t('approvalRole.table.previous')}
          </Button>
          
          <div className={`text-xs font-bold bg-white dark:bg-background px-3 py-1.5 rounded-md min-w-10 text-center border ${borderClass}`}>
            {t('approvalRole.table.page', { current: pageNumber, total: totalPages })}
          </div>

          <Button
            variant="outline"
            size="sm"
            className={`h-8 px-3 rounded-lg text-xs font-medium bg-white dark:bg-background hover:bg-pink-50 hover:border-pink-500 hover:text-pink-600 transition-all ${borderClass}`}
            onClick={() => onPageChange(pageNumber + 1)}
            disabled={pageNumber >= totalPages}
          >
            {t('approvalRole.table.next')}
          </Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[425px] border-none shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl">
           <DialogHeader className="space-y-4">
             <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-2">
               <Trash2 className="w-6 h-6 text-red-600 dark:text-red-500" />
             </div>
             <DialogTitle className="text-center text-xl font-bold text-zinc-900 dark:text-zinc-100">
               {t('approvalRole.delete.confirmTitle')}
             </DialogTitle>
             <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400">
               {t('approvalRole.delete.confirmMessage')}
             </DialogDescription>
           </DialogHeader>
           <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
             <Button
               variant="outline"
               onClick={() => setDeleteDialogOpen(false)}
               className="flex-1 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
             >
               {t('approvalRole.delete.cancelButton')}
             </Button>
             <Button
               variant="destructive"
               onClick={handleDeleteConfirm}
               disabled={deleteRole.isPending}
               className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
             >
               {deleteRole.isPending ? t('approvalRole.delete.deleting') : t('approvalRole.delete.confirmButton')}
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
