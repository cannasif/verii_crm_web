import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, X, UserPlus, Edit2, Trash2, Loader2, FileSearch } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import {
  useUserPowerbiGroupList,
  useCreateUserPowerbiGroup,
  useUpdateUserPowerbiGroup,
  useDeleteUserPowerbiGroup,
} from '../hooks/useUserPowerbiGroup';
import { powerbiQueryKeys } from '../utils/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import type { UserPowerBIGroupGetDto } from '../types/userPowerbiGroup.types';
import type { UserPowerBIGroupFormSchema } from '../types/userPowerbiGroup.types';
import { UserGroupForm } from './UserGroupForm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';

const LIST_PARAMS = { pageNumber: 1, pageSize: 100 };

export function UserGroupList(): ReactElement {
  const { t } = useTranslation();
  const { canCreate, canUpdate, canDelete } = useCrudPermissions('powerbi.user-groups.view');
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserPowerBIGroupGetDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlaceholder, setFilterPlaceholder] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UserPowerBIGroupGetDto | null>(null);

  const { data, isLoading } = useUserPowerbiGroupList(LIST_PARAMS);
  const createMutation = useCreateUserPowerbiGroup();
  const updateMutation = useUpdateUserPowerbiGroup();
  const deleteMutation = useDeleteUserPowerbiGroup();

  const items = useMemo(() => data?.data ?? [], [data]);
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(
      (x) =>
        (x.userName && x.userName.toLowerCase().includes(lower)) ||
        (x.groupName && x.groupName.toLowerCase().includes(lower))
    );
  }, [items, searchTerm]);

  useEffect(() => {
    setPageTitle(t('powerbi.userGroup.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.userGroups.list(LIST_PARAMS) });
  };

  const handleAdd = (): void => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (item: UserPowerBIGroupGetDto): void => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleDeleteClick = (item: UserPowerBIGroupGetDto): void => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedItem) {
      await deleteMutation.mutateAsync(selectedItem.id);
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handleFormSubmit = async (values: UserPowerBIGroupFormSchema): Promise<void> => {
    if (editing) {
      await updateMutation.mutateAsync({
        id: editing.id,
        data: { userId: values.userId, groupId: values.groupId },
      });
    } else {
      await createMutation.mutateAsync({
        userId: values.userId,
        groupId: values.groupId,
      });
    }
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <UserPlus className="h-7 w-7 text-pink-600 dark:text-pink-400 relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
              {t('powerbi.userGroup.title')}
            </h1>

          </div>
        </div>
        {canCreate && (
          <Button
            onClick={handleAdd}
            className="rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] h-11 px-6 gap-2
            opacity-75 grayscale-[0] 
            dark:opacity-100 dark:grayscale-0"
          >
            <Plus className="h-4 w-4" />
            {t('powerbi.userGroup.add')}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 rounded-xl bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 pl-9 focus-visible:ring-pink-500/50"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Input
          placeholder={t('powerbi.filterPlaceholder')}
          value={filterPlaceholder}
          onChange={(e) => setFilterPlaceholder(e.target.value)}
          className="h-10 rounded-xl bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 max-w-xs focus-visible:ring-pink-500/50"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          className="h-10 w-10 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-2 dark:border-white/10 dark:bg-white/[0.03] shadow-sm">
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/5">
          <Table>
            <TableHeader>
              <TableRow className="font-bold text-slate-700 dark:text-white dark:bg-[#231A2C] border-b border-slate-200 dark:border-white/5">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white py-4 border-r border-slate-200 dark:border-white/5">{t('powerbi.userGroup.userName')}</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-r border-slate-200 dark:border-white/5">{t('powerbi.userGroup.groupName')}</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-20 bg-white/50 dark:bg-transparent">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-pink-500" />
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-20 bg-white/50 dark:bg-transparent">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <FileSearch className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-400">{t('common.noData')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((row) => (
                  <TableRow key={row.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-pink-50/30 dark:hover:bg-pink-500/5 transition-colors">
                    <TableCell className="font-bold text-slate-700 dark:text-white py-4 border-r border-slate-200 dark:border-white/5">{row.userName ?? row.userId}</TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-white/5">{row.groupName ?? row.groupId}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(row)}
                            className="h-8 w-8 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-500/10 text-slate-400 hover:text-pink-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(row)}
                            className="h-8 w-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UserGroupForm
        open={canCreate || canUpdate ? formOpen : false}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={canDelete && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[480px] p-0 border-0 shadow-2xl bg-white dark:bg-[#180F22] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden">
          <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
            <X size={20} strokeWidth={2.5} />
          </DialogPrimitive.Close>
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 text-left">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/10 shadow-inner border border-red-200 dark:border-red-500/20">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {t('common.delete.confirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                  {t('common.delete.confirmMessage', { name: selectedItem?.userName ?? '' })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="border-t border-slate-100 dark:border-white/5 px-6 py-4 flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 font-bold px-6 h-11"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(220,38,38,0.5)] disabled:opacity-50 px-8 h-11 gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
