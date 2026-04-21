import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { KeyRound, Loader2, Plus, RefreshCw, Settings, ShieldCheck, Sparkles, Users2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DataTableActionBar,
  DataTableGrid,
  ManagementDataTableChrome,
  type DataTableGridColumn,
} from '@/components/shared';
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
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { usePermissionGroupsQuery } from '../hooks/usePermissionGroupsQuery';
import { useCreatePermissionGroupMutation } from '../hooks/useCreatePermissionGroupMutation';
import { useUpdatePermissionGroupMutation } from '../hooks/useUpdatePermissionGroupMutation';
import { useDeletePermissionGroupMutation } from '../hooks/useDeletePermissionGroupMutation';
import { useCrudPermissions } from '../hooks/useCrudPermissions';
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
    search: searchTerm || undefined,
    sortBy: 'updatedDate',
    sortDirection: 'desc',
  });

  const createMutation = useCreatePermissionGroupMutation();
  const updateMutation = useUpdatePermissionGroupMutation();
  const deleteMutation = useDeletePermissionGroupMutation();
  const { canCreate, canUpdate, canDelete } = useCrudPermissions('access-control.permission-groups.view');

  const items = data?.data ?? EMPTY_ITEMS;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items]);
  const systemAdminCount = useMemo(() => items.filter((item) => item.isSystemAdmin).length, [items]);

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
    if (!canCreate) return;
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEditClick = (item: PermissionGroupDto): void => {
    if (!canUpdate) return;
    if (item.isSystemAdmin) return;
    setEditingItem(item);
    setFormOpen(true);
  };

  const handlePermissionsClick = (item: PermissionGroupDto): void => {
    if (!canUpdate) return;
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
    if (!canDelete) return;
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
      {canUpdate && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-cyan-900/30 dark:hover:text-cyan-300"
            onClick={() => handlePermissionsClick(item)}
            title={item.isSystemAdmin ? t('permissionGroups.systemAdminLocked', 'System Admin grubu değiştirilemez') : t('permissionGroups.managePermissions')}
            disabled={item.isSystemAdmin}
          >
            <Settings size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-cyan-900/30 dark:hover:text-cyan-300"
            onClick={() => handleEditClick(item)}
            disabled={item.isSystemAdmin}
            title={item.isSystemAdmin ? t('permissionGroups.systemAdminLocked', 'System Admin grubu değiştirilemez') : undefined}
          >
            {t('common.edit')}
          </Button>
        </>
      )}
      {canDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
          onClick={() => handleDeleteClick(item)}
          disabled={item.isSystemAdmin}
          title={item.isSystemAdmin ? t('permissionGroups.systemAdminLocked', 'System Admin grubu değiştirilemez') : undefined}
        >
          {t('common.delete.action')}
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-linear-to-br from-white via-cyan-50/70 to-pink-50/70 p-5 shadow-sm dark:border-cyan-800/30 dark:from-blue-950/70 dark:via-blue-950/90 dark:to-cyan-950/40 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-white/80 px-3 py-1.5 text-xs font-black text-cyan-700 shadow-sm dark:border-cyan-800/40 dark:bg-blue-950/60 dark:text-cyan-300">
              <Sparkles className="size-4" />
              {t('sidebar.permissionGroups')}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white transition-colors">
              {t('permissionGroups.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors">
              {t('permissionGroups.description')}
            </p>
          </div>
          {canCreate && (
            <div className="flex shrink-0">
              <Button
                onClick={handleAddClick}
                className="h-11 rounded-2xl border-0 bg-linear-to-r from-pink-600 to-orange-600 px-6 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-transform hover:scale-[1.02] hover:text-white"
              >
                <Plus size={18} className="mr-2" />
                {t('permissionGroups.add')}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-cyan-800/30 dark:bg-blue-950/50">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-100 p-2.5 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                <Users2 className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  {t('permissionGroups.title')}
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{totalCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-cyan-800/30 dark:bg-blue-950/50">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  {t('permissionGroups.table.isActive')}
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-cyan-800/30 dark:bg-blue-950/50">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-pink-100 p-2.5 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                <KeyRound className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  {t('permissionGroups.table.isSystemAdmin')}
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{systemAdminCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
            {t('permissionGroups.table.title', { defaultValue: t('permissionGroups.title') })}
          </CardTitle>
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
            searchValue={searchTerm}
            searchPlaceholder={t('common.search')}
            onSearchChange={setSearchTerm}
            leftSlot={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
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
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
          <ManagementDataTableChrome>
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
            errorText={t('common.error')}
            emptyText={t('common.noData')}
            minTableWidthClassName="min-w-[700px]"
            showActionsColumn={canUpdate || canDelete}
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
            centerColumnHeaders
          />
          </ManagementDataTableChrome>
          </div>
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

      <Dialog open={canDelete && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="overflow-hidden border-slate-200 bg-white p-0 shadow-2xl dark:border-cyan-800/30 dark:bg-blue-950">
          <DialogHeader className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-cyan-800/30 dark:bg-blue-900/20">
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">{t('permissionGroups.delete.confirmTitle')}</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              {t('permissionGroups.delete.confirmMessage', {
                name: itemToDelete?.name ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-cyan-800/30 dark:bg-blue-900/20">
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
