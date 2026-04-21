import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, X } from 'lucide-react';
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
import { Edit2, Trash2, Loader2 } from 'lucide-react';
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
        <h1 className="text-3xl font-bold tracking-tight">
          {t('powerbi.userGroup.title')}
        </h1>
        {canCreate ? (
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            {t('powerbi.userGroup.add')}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2"
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
          className="max-w-xs"
        />
        <Button variant="outline" size="icon" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('powerbi.userGroup.userName')}</TableHead>
              <TableHead>{t('powerbi.userGroup.groupName')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.userName ?? row.userId}</TableCell>
                  <TableCell>{row.groupName ?? row.groupId}</TableCell>
                  <TableCell className="text-right">
                    {canUpdate ? (
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(row)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserGroupForm
        open={canCreate || canUpdate ? formOpen : false}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={canDelete && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('common.delete.confirmMessage', {
                name: selectedItem?.userName ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
