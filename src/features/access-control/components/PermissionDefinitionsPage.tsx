import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Plus, Search, RefreshCw, X } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { usePermissionDefinitionsQuery } from '../hooks/usePermissionDefinitionsQuery';
import { useSyncPermissionDefinitionsMutation } from '../hooks/useSyncPermissionDefinitionsMutation';
import { useCreatePermissionDefinitionMutation } from '../hooks/useCreatePermissionDefinitionMutation';
import { useUpdatePermissionDefinitionMutation } from '../hooks/useUpdatePermissionDefinitionMutation';
import { useDeletePermissionDefinitionMutation } from '../hooks/useDeletePermissionDefinitionMutation';
import { PermissionDefinitionForm } from './PermissionDefinitionForm';
import type { PermissionDefinitionDto } from '../types/access-control.types';
import type { CreatePermissionDefinitionSchema } from '../schemas/permission-definition-schema';
import { getPermissionDisplayMeta, PERMISSION_CODE_CATALOG } from '../utils/permission-config';
const EMPTY_PERMISSION_DEFINITIONS: PermissionDefinitionDto[] = [];


export function PermissionDefinitionsPage(): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PermissionDefinitionDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 20;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PermissionDefinitionDto | null>(null);

  const { data, isLoading } = usePermissionDefinitionsQuery({
    pageNumber,
    pageSize,
    sortBy: 'updatedDate',
    sortDirection: 'desc',
  });

  const createMutation = useCreatePermissionDefinitionMutation();
  const updateMutation = useUpdatePermissionDefinitionMutation();
  const deleteMutation = useDeletePermissionDefinitionMutation();

  const syncMutation = useSyncPermissionDefinitionsMutation();

  const items = data?.data ?? EMPTY_PERMISSION_DEFINITIONS;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  useEffect(() => {
    setPageTitle(t('permissionDefinitions.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter((item) => {
      const meta = getPermissionDisplayMeta(item.code);
      const displayName = meta ? t(meta.key, meta.fallback) : item.name;
      return (
        item.code.toLowerCase().includes(lower) ||
        item.name.toLowerCase().includes(lower) ||
        displayName.toLowerCase().includes(lower) ||
        (item.description && item.description.toLowerCase().includes(lower))
      );
    });
  }, [items, searchTerm, t]);

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['permissions', 'definitions'] });
  };


  const handleSyncFromRoutes = async (): Promise<void> => {
    const items = PERMISSION_CODE_CATALOG.map((code) => {
      const meta = getPermissionDisplayMeta(code);
      const name = meta ? t(meta.key, meta.fallback) : code;
      return { code, name, isActive: true };
    });

    await syncMutation.mutateAsync({ items });
  };

  const handleAddClick = (): void => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEditClick = (item: PermissionDefinitionDto): void => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormSubmit = async (formData: CreatePermissionDefinitionSchema): Promise<void> => {
    const dto = { ...formData, description: formData.description ?? undefined };
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, dto });
    } else {
      await createMutation.mutateAsync(dto);
    }
    setFormOpen(false);
    setEditingItem(null);
  };

  const handleDeleteClick = (item: PermissionDefinitionDto): void => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (itemToDelete) {
      await deleteMutation.mutateAsync(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      <Breadcrumb items={[{ label: t('sidebar.accessControl') }, { label: t('sidebar.permissionDefinitions'), isActive: true }]} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('permissionDefinitions.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors">
            {t('permissionDefinitions.description')}
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus size={18} className="mr-2" />
          {t('permissionDefinitions.add')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full"
            >
              <X size={14} className="text-slate-400" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handleSyncFromRoutes}
          disabled={isLoading || syncMutation.isPending}
        >
          <RefreshCw size={18} className={syncMutation.isPending ? 'animate-spin mr-2' : 'mr-2'} />
          {t('permissionDefinitions.syncFromRoutes')}
        </Button>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </Button>
      </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#0b0713] shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 min-h-[300px]">
            <div className="animate-pulse text-slate-500">{t('common.loading')}</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center py-20 min-h-[300px]">
            <p className="text-slate-500 dark:text-slate-400">{t('common.noData')}</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('permissionDefinitions.table.code')}</TableHead>
                  <TableHead>{t('permissionDefinitions.table.name')}</TableHead>
                  <TableHead>{t('permissionDefinitions.table.isActive')}</TableHead>
                  <TableHead>{t('permissionDefinitions.table.updatedDate')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.code}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>
                          {(() => {
                            const meta = getPermissionDisplayMeta(item.code);
                            return meta ? t(meta.key, meta.fallback) : item.name;
                          })()}
                        </span>
                        {(() => {
                          const meta = getPermissionDisplayMeta(item.code);
                          const displayName = meta ? t(meta.key, meta.fallback) : item.name;
                          const storedName = item.name;
                          if (!meta) return null;
                          if (storedName.trim().toLowerCase() === displayName.trim().toLowerCase()) return null;
                          return (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {storedName}
                            </span>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.isActive ? t('common.yes') : t('common.no')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {item.updatedDate ? new Date(item.updatedDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(item)}>
                        {t('common.edit')}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteClick(item)}>
                        {t('common.delete')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-sm text-slate-500">
                  {t('permissionDefinitions.table.showing', {
                    from: (pageNumber - 1) * pageSize + 1,
                    to: Math.min(pageNumber * pageSize, totalCount),
                    total: totalCount,
                  })}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
                    {t('common.previous')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))} disabled={pageNumber >= totalPages}>
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <PermissionDefinitionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        item={editingItem}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('permissionDefinitions.delete.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('permissionDefinitions.delete.confirmMessage', {
                name: itemToDelete?.name ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? t('common.processing') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
