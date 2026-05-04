import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { KeyRound, Loader2, Plus, RefreshCw, Settings, ShieldCheck, Users2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DataTableActionBar,
  DataTableGrid,
  ManagementDataTableChrome,
  type DataTableGridColumn,
} from '@/components/shared';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
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
import { useMyPermissionsQuery } from '../hooks/useMyPermissionsQuery';
import { PermissionGroupForm } from './PermissionGroupForm';
import { GroupPermissionsPanel } from './GroupPermissionsPanel';
import type { PermissionGroupDto } from '../types/access-control.types';
import type { CreatePermissionGroupSchema } from '../schemas/permission-group-schema';
import { ensurePermissionDefinitionsSynced } from '../utils/permission-definition-sync';

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

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, ['name', 'isSystemAdmin', 'isActive', 'permissionCount']);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id]);

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
  const { data: permissions } = useMyPermissionsQuery();
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

  const ensurePermissionCatalogReady = async (): Promise<void> => {
    await ensurePermissionDefinitionsSynced({
      userId: user?.id ?? null,
      permissions,
    });
    await queryClient.invalidateQueries({ queryKey: ['permissions', 'definitions'] });
  };

  const handleRefresh = async (): Promise<void> => {
    await ensurePermissionCatalogReady();
    await queryClient.invalidateQueries({ queryKey: ['permissions', 'groups'] });
  };

  const handleAddClick = async (): Promise<void> => {
    if (!canCreate) return;
    await ensurePermissionCatalogReady();
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEditClick = (item: PermissionGroupDto): void => {
    if (!canUpdate) return;
    if (item.isSystemAdmin) return;
    setEditingItem(item);
    setFormOpen(true);
  };

  const handlePermissionsClick = async (item: PermissionGroupDto): Promise<void> => {
    if (!canUpdate) return;
    if (item.isSystemAdmin) return;
    await ensurePermissionCatalogReady();
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

  const headerCardStyle = `
    overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 
    bg-white/80 dark:bg-[#180F22] backdrop-blur-md p-6 shadow-xl 
    transition-all duration-300 relative
  `;

  const statCardStyle = `
    rounded-2xl border border-slate-200 dark:border-white/10 
    bg-white/90 dark:bg-[#1E1627] p-5 shadow-sm 
    transition-all duration-300 hover:shadow-md group
  `;

  return (
    <div className="w-full space-y-6">
      <div className={headerCardStyle}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 dark:bg-pink-500/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 dark:bg-orange-500/10 blur-[80px] rounded-full -ml-20 -mb-20 pointer-events-none" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10">
          <div className="min-w-0">

            <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('permissionGroups.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('permissionGroups.description')}
            </p>
          </div>
          {canCreate && (
            <div className="flex shrink-0">
              <Button
                onClick={handleAddClick}
                className="h-12 px-8 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pink-500/25 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
              >
                <Plus size={20} className="mr-2" />
                {t('permissionGroups.add')}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 relative z-10">
          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-pink-100 p-3 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 border border-pink-100 dark:border-pink-500/20">
                <Users2 className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t('permissionGroups.title')}
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">{totalCount}</p>
              </div>
            </div>
          </div>
          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t('permissionGroups.table.isActive')}
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-orange-100 p-3 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20">
                <KeyRound className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t('permissionGroups.table.isSystemAdmin')}
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">{systemAdminCount}</p>
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
            onColumnOrderChange={(newVisibleOrder) => {
              setColumnOrder((currentOrder) => {
                const hiddenCols = currentOrder.filter((k) => !(newVisibleOrder as string[]).includes(k));
                const finalOrder = [...newVisibleOrder, ...hiddenCols];
                saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                return finalOrder;
              });
            }}
            exportFileName="permission-groups"
            exportColumns={exportColumns}
            exportRows={exportRows}
            filterColumns={filterColumns}
            defaultFilterColumn="name"
            draftFilterRows={[]}
            onDraftFilterRowsChange={() => { }}
            onApplyFilters={() => { }}
            onClearFilters={() => { }}
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
                visibleColumnKeys={columnOrder.filter((key) => visibleColumns.includes(key)) as PermissionGroupColumnKey[]}
                rows={filteredItems}
                rowKey={(r) => r.id}
                renderCell={(row, key) => {
                  if (key === 'name') return <span className="font-medium">{row.name}</span>;
                  if (key === 'isSystemAdmin') {
                    return row.isSystemAdmin ? (
                      <div className="inline-flex items-center justify-center px-2 py-1 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-black text-[12px] capitalize opacity-70 shadow-sm transition-all dark:opacity-100 dark:bg-white dark:from-white dark:to-white dark:text-black">
                        {t('common.yes')}
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center px-2 py-1 rounded-xl bg-slate-100 text-slate-500 font-bold text-[12px] capitalize tracking-wider dark:bg-slate-800 dark:text-slate-400">
                        {t('common.no')}
                      </div>
                    );
                  }
                  if (key === 'isActive') {
                    return row.isActive ? (
                      <div className="inline-flex items-center justify-center px-2 py-1 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-black text-[12px] capitalize opacity-70 shadow-sm transition-all dark:opacity-100 dark:bg-white dark:from-white dark:to-white dark:text-black">
                        {t('common.yes')}
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center px-2 py-1 rounded-xl bg-slate-100 text-slate-500 font-bold text-[12px] capitalize tracking-wider dark:bg-slate-800 dark:text-slate-400">
                        {t('common.no')}
                      </div>
                    );
                  }
                  if (key === 'permissionCount') {
                    return (
                      <Badge variant="secondary" className="font-bold">
                        {row.permissionDefinitionIds?.length ?? row.permissionCodes?.length ?? 0}
                      </Badge>
                    );
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
                onColumnOrderChange={(newVisibleOrder) => {
                  setColumnOrder((currentOrder) => {
                    const hiddenCols = currentOrder.filter((k) => !(newVisibleOrder as string[]).includes(k));
                    const finalOrder = [...newVisibleOrder, ...hiddenCols];
                    saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                    return finalOrder;
                  });
                }}
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
