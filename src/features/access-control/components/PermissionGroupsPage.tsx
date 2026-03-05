import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, RefreshCw, Settings } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, DataTableGrid, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePermissionGroupsQuery } from '../hooks/usePermissionGroupsQuery';
import { useCreatePermissionGroupMutation } from '../hooks/useCreatePermissionGroupMutation';
import { useUpdatePermissionGroupMutation } from '../hooks/useUpdatePermissionGroupMutation';
import { useDeletePermissionGroupMutation } from '../hooks/useDeletePermissionGroupMutation';
import { PermissionGroupForm } from './PermissionGroupForm';
import { GroupPermissionsPanel } from './GroupPermissionsPanel';
import type { PermissionGroupDto } from '../types/access-control.types';
import type { CreatePermissionGroupSchema } from '../schemas/permission-group-schema';

const EMPTY_ITEMS: PermissionGroupDto[] = [];
const PAGE_KEY = 'permission-groups';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type PermissionGroupColumnKey = keyof PermissionGroupDto | 'permissionCount';

function resolveLabel(t: (key: string) => string, key: string, fallback: string): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function PermissionGroupsPage(): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PermissionGroupDto | null>(null);
  const [permissionsPanelOpen, setPermissionsPanelOpen] = useState(false);
  const [permissionsPanelGroupId, setPermissionsPanelGroupId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PermissionGroupDto | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'isSystemAdmin', 'isActive', 'permissionCount']);
  const [columnOrder, setColumnOrder] = useState<string[]>(['name', 'isSystemAdmin', 'isActive', 'permissionCount']);

  const { data, isLoading } = usePermissionGroupsQuery({
    pageNumber,
    pageSize,
    sortBy: 'updatedDate',
    sortDirection: 'desc',
  });

  const createMutation = useCreatePermissionGroupMutation();
  const updateMutation = useUpdatePermissionGroupMutation();
  const deleteMutation = useDeletePermissionGroupMutation();

  const items = data?.data ?? EMPTY_ITEMS;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        (item.description && item.description.toLowerCase().includes(lower))
    );
  }, [items, searchTerm]);

  useEffect(() => {
    setPageTitle(t('permissionGroups.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['permissions', 'groups'] });
  };

  const handleAddClick = (): void => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEditClick = (item: PermissionGroupDto): void => {
    if (item.isSystemAdmin) return;
    setEditingItem(item);
    setFormOpen(true);
  };

  const handlePermissionsClick = (item: PermissionGroupDto): void => {
    if (item.isSystemAdmin) return;
    setPermissionsPanelGroupId(item.id);
    setPermissionsPanelOpen(true);
  };

  const handleFormSubmit = async (formData: CreatePermissionGroupSchema): Promise<void> => {
    if (editingItem?.isSystemAdmin) return;
    if (editingItem) {
      const updateDto = {
        name: formData.name,
        description: formData.description ?? undefined,
        isSystemAdmin: editingItem.isSystemAdmin,
        isActive: formData.isActive,
      };
      await updateMutation.mutateAsync({ id: editingItem.id, dto: updateDto });
    } else {
      const createDto = { ...formData, isSystemAdmin: false, description: formData.description ?? undefined };
      await createMutation.mutateAsync(createDto);
    }
    setFormOpen(false);
    setEditingItem(null);
  };

  const handleDeleteClick = (item: PermissionGroupDto): void => {
    if (item.isSystemAdmin) return;
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

  const baseColumns = [
    { key: 'name', label: t('permissionGroups.table.name') },
    { key: 'isSystemAdmin', label: t('permissionGroups.table.isSystemAdmin') },
    { key: 'isActive', label: t('permissionGroups.table.isActive') },
    { key: 'permissionCount', label: t('permissionGroups.table.permissionCount') },
  ];

  const filterColumns = useMemo(() => [], []);
  const exportColumns = baseColumns;
  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      filteredItems.map((item) => ({
        name: item.name,
        isSystemAdmin: item.isSystemAdmin ? t('common.yes') : t('common.no'),
        isActive: item.isActive ? t('common.yes') : t('common.no'),
        permissionCount: item.permissionDefinitionIds?.length ?? item.permissionCodes?.length ?? 0,
      })),
    [filteredItems, t]
  );

  const columns: DataTableGridColumn<PermissionGroupColumnKey>[] = useMemo(
    () => [
      { key: 'name', label: t('permissionGroups.table.name'), cellClassName: 'font-medium' },
      { key: 'isSystemAdmin', label: t('permissionGroups.table.isSystemAdmin') },
      { key: 'isActive', label: t('permissionGroups.table.isActive') },
      { key: 'permissionCount', label: t('permissionGroups.table.permissionCount') },
    ],
    [t]
  );

  const renderActionsCell = (item: PermissionGroupDto): ReactElement => (
    <div className="flex justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handlePermissionsClick(item)}
        title={item.isSystemAdmin ? t('permissionGroups.systemAdminLocked', 'System Admin grubu değiştirilemez') : t('permissionGroups.managePermissions')}
        disabled={item.isSystemAdmin}
      >
        <Settings size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleEditClick(item)}
        disabled={item.isSystemAdmin}
        title={item.isSystemAdmin ? t('permissionGroups.systemAdminLocked', 'System Admin grubu değiştirilemez') : undefined}
      >
        {t('common.edit')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600"
        onClick={() => handleDeleteClick(item)}
        disabled={item.isSystemAdmin}
        title={item.isSystemAdmin ? t('permissionGroups.systemAdminLocked', 'System Admin grubu değiştirilemez') : undefined}
      >
        {t('common.delete.action')}
      </Button>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('permissionGroups.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('permissionGroups.description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('permissionGroups.add')}
        </Button>
      </div>

      <Card className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm">
        <CardHeader className="space-y-4">
          <CardTitle>{t('permissionGroups.table.title', { defaultValue: t('permissionGroups.title') })}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="permission-groups"
            exportColumns={exportColumns}
            exportRows={exportRows}
            filterColumns={filterColumns}
            defaultFilterColumn="name"
            draftFilterRows={[]}
            onDraftFilterRowsChange={() => {}}
            onApplyFilters={() => {}}
            onClearFilters={() => {}}
            translationNamespace="access-control"
            appliedFilterCount={0}
            leftSlot={
              <>
                <Input
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-[200px]"
                />
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {resolveLabel(t, 'common.refresh', 'Yenile')}
                </Button>
              </>
            }
          />
        </CardHeader>
        <CardContent>
          <DataTableGrid<PermissionGroupDto, PermissionGroupColumnKey>
            columns={columns}
            visibleColumnKeys={visibleColumns as PermissionGroupColumnKey[]}
            rows={filteredItems}
            rowKey={(r) => r.id}
            renderCell={(row, key) => {
              if (key === 'name') return <span className="font-medium">{row.name}</span>;
              if (key === 'isSystemAdmin') {
                return (
                  <Badge variant={row.isSystemAdmin ? 'default' : 'secondary'}>
                    {row.isSystemAdmin ? t('common.yes') : t('common.no')}
                  </Badge>
                );
              }
              if (key === 'isActive') {
                return (
                  <Badge variant={row.isActive ? 'default' : 'secondary'}>
                    {row.isActive ? t('common.yes') : t('common.no')}
                  </Badge>
                );
              }
              if (key === 'permissionCount') {
                return row.permissionDefinitionIds?.length ?? row.permissionCodes?.length ?? 0;
              }
              return '-';
            }}
            isLoading={isLoading}
            isError={false}
            loadingText={t('common.loading')}
            errorText={t('common.error', { defaultValue: 'An error occurred' })}
            emptyText={t('common.noData')}
            minTableWidthClassName="min-w-[700px]"
            showActionsColumn
            actionsHeaderLabel={t('common.actions')}
            renderActionsCell={renderActionsCell}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPageNumber(1);
            }}
            pageNumber={pageNumber}
            totalPages={totalPages}
            hasPreviousPage={pageNumber > 1}
            hasNextPage={pageNumber < totalPages}
            onPreviousPage={() => setPageNumber((p) => Math.max(1, p - 1))}
            onNextPage={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
            previousLabel={t('common.previous')}
            nextLabel={t('common.next')}
            paginationInfoText={t('permissionGroups.table.showing', {
              from: (pageNumber - 1) * pageSize + 1,
              to: Math.min(pageNumber * pageSize, totalCount),
              total: totalCount,
            })}
          />
        </CardContent>
      </Card>

      <PermissionGroupForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        item={editingItem}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <GroupPermissionsPanel groupId={permissionsPanelGroupId} open={permissionsPanelOpen} onOpenChange={setPermissionsPanelOpen} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('permissionGroups.delete.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('permissionGroups.delete.confirmMessage', {
                name: itemToDelete?.name ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? t('common.processing') : t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
