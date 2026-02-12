import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

interface ApprovalRoleTableProps {
  onEdit: (role: ApprovalRoleDto) => void;
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: PagedFilter[] | Record<string, unknown>;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
}

export function ApprovalRoleTable({
  onEdit,
  pageNumber,
  pageSize,
  sortBy = 'Id',
  sortDirection = 'desc',
  filters = {},
  onPageChange,
  onSortChange,
}: ApprovalRoleTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ApprovalRoleDto | null>(null);

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
    const newDirection =
      sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(column, newDirection);
  };

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

  return (
    <div className="w-full">
      <Table className="border-collapse w-full">
        <TableHeader className="bg-zinc-200 dark:bg-muted/20">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead 
              className={`cursor-pointer select-none py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 hover:text-pink-600 dark:hover:text-pink-500 transition-colors border-b border-r border-zinc-300 dark:border-zinc-700 last:border-r-0`}
              onClick={() => handleSort('Id')}
            >
              <div className="flex items-center gap-1">
                {t('approvalRole.table.id')} <SortIcon column="Id" />
              </div>
            </TableHead>
            <TableHead 
              className={`cursor-pointer select-none py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 hover:text-pink-600 dark:hover:text-pink-500 transition-colors border-b border-r border-zinc-300 dark:border-zinc-700 last:border-r-0`}
              onClick={() => handleSort('ApprovalRoleGroupName')}
            >
              <div className="flex items-center gap-1">
                {t('approvalRole.table.approvalRoleGroupName')} <SortIcon column="ApprovalRoleGroupName" />
              </div>
            </TableHead>
            <TableHead 
              className={`cursor-pointer select-none py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 hover:text-pink-600 dark:hover:text-pink-500 transition-colors border-b border-r border-zinc-300 dark:border-zinc-700`}
              onClick={() => handleSort('Name')}
            >
              <div className="flex items-center gap-1">
                {t('approvalRole.table.name')} <SortIcon column="Name" />
              </div>
            </TableHead>
            <TableHead 
              className={`cursor-pointer select-none py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 hover:text-pink-600 dark:hover:text-pink-500 transition-colors border-b border-r border-zinc-300 dark:border-zinc-700`}
              onClick={() => handleSort('MaxAmount')}
            >
              <div className="flex items-center gap-1">
                {t('approvalRole.table.maxAmount')} <SortIcon column="MaxAmount" />
              </div>
            </TableHead>
            <TableHead className={`py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 border-b border-r border-zinc-300 dark:border-zinc-700`}>
              {t('approvalRole.table.createdDate')}
            </TableHead>
            <TableHead className={`py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 border-b border-r border-zinc-300 dark:border-zinc-700`}>
              {t('approvalRole.table.createdBy')}
            </TableHead>
            <TableHead className={`text-right py-4 px-4 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground/90 border-b border-zinc-300 dark:border-zinc-700`}>
              {t('approvalRole.table.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role: ApprovalRoleDto, index: number) => (
            <TableRow 
              key={role.id || `role-${index}`}
              className={`group cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors duration-200 bg-white dark:bg-transparent`}
            >
              <TableCell className={`font-mono text-xs text-muted-foreground border-b border-r ${borderClass} px-4 py-3`}>
                {role.id}
              </TableCell>
              <TableCell className={`font-semibold text-sm text-foreground/90 border-b border-r ${borderClass} px-4 py-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors`}>
                {role.approvalRoleGroupName || '-'}
              </TableCell>
              <TableCell className={`text-sm text-foreground/80 border-b border-r ${borderClass} px-4 py-3`}>
                {role.name || '-'}
              </TableCell>
              <TableCell className={`text-sm text-foreground/80 border-b border-r ${borderClass} px-4 py-3`}>
                {new Intl.NumberFormat(i18n.language, {
                  style: 'currency',
                  currency: 'TRY',
                }).format(role.maxAmount || 0)}
              </TableCell>
              <TableCell className={`text-sm text-muted-foreground border-b border-r ${borderClass} px-4 py-3`}>
                 {role.createdDate ? new Date(role.createdDate).toLocaleDateString(i18n.language) : '-'}
              </TableCell>
              <TableCell className={`text-sm text-muted-foreground border-b border-r ${borderClass} px-4 py-3`}>
                {role.createdByFullUser || role.createdByFullName || role.createdBy || '-'}
              </TableCell>
              <TableCell className={`text-right border-b ${borderClass} px-4 py-3`}>
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
          
          <div className={`text-xs font-bold bg-white dark:bg-background px-3 py-1.5 rounded-md min-w-[3rem] text-center border ${borderClass}`}>
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
