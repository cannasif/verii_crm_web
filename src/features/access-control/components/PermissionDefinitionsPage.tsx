import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { KeyRound, Loader2, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DataTableActionBar,
  DataTableGrid,
  ManagementDataTableChrome,
  type DataTableGridColumn,
} from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { usePermissionDefinitionsQuery } from '../hooks/usePermissionDefinitionsQuery';
import { useSyncPermissionDefinitionsMutation } from '../hooks/useSyncPermissionDefinitionsMutation';
import { useCreatePermissionDefinitionMutation } from '../hooks/useCreatePermissionDefinitionMutation';
import { useUpdatePermissionDefinitionMutation } from '../hooks/useUpdatePermissionDefinitionMutation';
import { useDeletePermissionDefinitionMutation } from '../hooks/useDeletePermissionDefinitionMutation';
import { useCrudPermissions } from '../hooks/useCrudPermissions';
import { PermissionDefinitionForm } from './PermissionDefinitionForm';
import type { PermissionDefinitionDto } from '../types/access-control.types';
import type { CreatePermissionDefinitionSchema } from '../schemas/permission-definition-schema';
import {
  getPermissionDisplayLabel,
  getPermissionPlatform,
  inferPermissionPlatforms,
  PERMISSION_CODE_CATALOG,
  translatePermissionLabel,
} from '../utils/permission-config';

const EMPTY_PERMISSION_DEFINITIONS: PermissionDefinitionDto[] = [];
const PAGE_KEY = 'permission-definitions';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type PermissionDefinitionColumnKey = keyof PermissionDefinitionDto | 'platform';

function resolveLabel(t: (key: string) => string, key: string, fallback: string): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function PermissionDefinitionsPage(): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PermissionDefinitionDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PermissionDefinitionDto | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['code', 'name', 'platform', 'isActive', 'updatedDate']);
  const [columnOrder, setColumnOrder] = useState<string[]>(['code', 'name', 'platform', 'isActive', 'updatedDate']);

  const { data, isLoading } = usePermissionDefinitionsQuery({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy: 'updatedDate',
    sortDirection: 'desc',
  });

  const createMutation = useCreatePermissionDefinitionMutation();
  const updateMutation = useUpdatePermissionDefinitionMutation();
  const deleteMutation = useDeletePermissionDefinitionMutation();
  const syncMutation = useSyncPermissionDefinitionsMutation();
  const { canCreate, canUpdate, canDelete } = useCrudPermissions('access-control.permission-definitions.view');

  const items = data?.data ?? EMPTY_PERMISSION_DEFINITIONS;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items]);

  useEffect(() => {
    setPageTitle(t('permissionDefinitions.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter((item) => {
      const displayName = getPermissionDisplayLabel(item.code, (key, fallback) =>
        translatePermissionLabel(t, key, fallback)
      );
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
    const syncItems = PERMISSION_CODE_CATALOG.map((code) => {
      const name = getPermissionDisplayLabel(code, (key, fallback) => translatePermissionLabel(t, key, fallback));
      return { code, name, isActive: true, ...inferPermissionPlatforms(code) };
    });
    await syncMutation.mutateAsync({
      items: syncItems,
      updateExistingNames: true,
      updateExistingIsActive: true,
    });
  };

  const handleAddClick = (): void => {
    if (!canCreate) return;
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEditClick = (item: PermissionDefinitionDto): void => {
    if (!canUpdate) return;
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormSubmit = async (formData: CreatePermissionDefinitionSchema): Promise<void> => {
    const dto = {
      ...formData,
      isActive: editingItem?.isActive ?? true,
      description: formData.description ?? undefined,
    };
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, dto });
    } else {
      await createMutation.mutateAsync(dto);
    }
    setFormOpen(false);
    setEditingItem(null);
  };

  const handleDeleteClick = (item: PermissionDefinitionDto): void => {
    if (!canDelete) return;
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
    { key: 'code', label: t('permissionDefinitions.table.code') },
    { key: 'name', label: t('permissionDefinitions.table.name') },
    { key: 'platform', label: t('permissionDefinitions.table.platform') },
    { key: 'isActive', label: t('permissionDefinitions.table.isActive') },
    { key: 'updatedDate', label: t('permissionDefinitions.table.updatedDate') },
  ];

  const filterColumns = useMemo(() => [], []);
  const exportColumns = baseColumns;
  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      filteredItems.map((item) => {
        const platform = getPermissionPlatform(item.code, item.availableOnWeb, item.availableOnMobile);
        return {
          code: item.code,
          name: getPermissionDisplayLabel(item.code, (key, fallback) => translatePermissionLabel(t, key, fallback)),
          platform: translatePermissionLabel(t, `permissionDefinitions.platform.${platform}`, platform),
          isActive: item.isActive ? t('common.yes') : t('common.no'),
          updatedDate: item.updatedDate ? new Date(item.updatedDate).toLocaleDateString() : '-',
        };
      }),
    [filteredItems, t]
  );

  const columns: DataTableGridColumn<PermissionDefinitionColumnKey>[] = useMemo(
    () => [
      { key: 'code', label: t('permissionDefinitions.table.code'), cellClassName: 'font-mono text-sm' },
      { key: 'name', label: t('permissionDefinitions.table.name') },
      { key: 'platform', label: t('permissionDefinitions.table.platform') },
      { key: 'isActive', label: t('permissionDefinitions.table.isActive') },
      { key: 'updatedDate', label: t('permissionDefinitions.table.updatedDate'), cellClassName: 'text-slate-500 text-sm' },
    ],
    [t]
  );

  const renderActionsCell = (item: PermissionDefinitionDto): ReactElement => (
    <div className="flex justify-end gap-2">
      {canUpdate && (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-cyan-900/30 dark:hover:text-cyan-300"
          onClick={() => handleEditClick(item)}
        >
          {t('common.edit')}
        </Button>
      )}
      {canDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          onClick={() => handleDeleteClick(item)}
        >
          {t('common.delete.action')}
        </Button>
      )}
    </div>
  );

  const headerCardStyle = `
    overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 
    bg-white dark:bg-[#180F22] backdrop-blur-md p-6 shadow-xl 
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
              {t('permissionDefinitions.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('permissionDefinitions.description')}
            </p>
          </div>
          {canCreate && (
            <div className="flex shrink-0">
              <Button
                onClick={handleAddClick}
                className="h-12 px-8 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pink-500/25
                opacity-50 grayscale-[0] 
                dark:opacity-100 dark:grayscale-0
                "
              >
                <Plus size={20} className="mr-2" />
                {t('permissionDefinitions.add')}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 relative z-10">
          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-pink-100 p-3 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 border border-pink-100 dark:border-pink-500/20">
                <KeyRound className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t('permissionDefinitions.title')}
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
                  {t('permissionDefinitions.table.isActive')}
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-orange-100 p-3 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20">
                <RefreshCw className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t('permissionDefinitions.syncSummaryTitle', { defaultValue: 'Route Sync' })}
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">{PERMISSION_CODE_CATALOG.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
            {t('permissionDefinitions.table.title', { defaultValue: t('permissionDefinitions.title') })}
          </CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="permission-definitions"
            exportColumns={exportColumns}
            exportRows={exportRows}
            filterColumns={filterColumns}
            defaultFilterColumn="code"
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
                {canUpdate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                    onClick={handleSyncFromRoutes}
                    disabled={isLoading || syncMutation.isPending}
                  >
                    <RefreshCw size={16} className={syncMutation.isPending ? 'animate-spin mr-2' : 'mr-2'} />
                    {t('permissionDefinitions.syncFromRoutes')}
                  </Button>
                )}
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
              <DataTableGrid<PermissionDefinitionDto, PermissionDefinitionColumnKey>
                columns={columns}
                visibleColumnKeys={visibleColumns as PermissionDefinitionColumnKey[]}
                rows={filteredItems}
                rowKey={(r) => r.id}
                renderCell={(row, key) => {
                  if (key === 'code') return <span className="font-mono text-sm">{row.code}</span>;
                  if (key === 'name') {
                    return (
                      <div className="flex flex-col">
                        <span>
                          {getPermissionDisplayLabel(row.code, (key, fallback) =>
                            translatePermissionLabel(t, key, fallback)
                          )}
                        </span>
                        {(() => {
                          const displayName = getPermissionDisplayLabel(row.code, (key, fallback) =>
                            translatePermissionLabel(t, key, fallback)
                          );
                          const storedName = row.name;
                          if (storedName.trim().toLowerCase() === displayName.trim().toLowerCase()) return null;
                          return (
                            <span className="text-xs text-slate-500 dark:text-slate-400">{storedName}</span>
                          );
                        })()}
                      </div>
                    );
                  }
                  if (key === 'platform') {
                    const platform = getPermissionPlatform(row.code, row.availableOnWeb, row.availableOnMobile);
                    const label = translatePermissionLabel(t, `permissionDefinitions.platform.${platform}`, platform);
                    const className =
                      platform === 'both'
                        ? 'bg-linear-to-r from-fuchsia-500/15 to-cyan-500/15 text-fuchsia-700 dark:text-fuchsia-200 border-fuchsia-300/40 dark:border-fuchsia-500/30'
                        : platform === 'mobile'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 border-emerald-300/40 dark:border-emerald-500/30'
                          : 'bg-blue-500/10 text-blue-700 dark:text-blue-200 border-blue-300/40 dark:border-blue-500/30';

                    return (
                      <Badge variant="outline" className={`rounded-full px-3 py-1 font-bold ${className}`}>
                        {label}
                      </Badge>
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
                  if (key === 'updatedDate') {
                    return (
                      <span className="text-slate-500 text-sm">
                        {row.updatedDate ? new Date(row.updatedDate).toLocaleDateString() : '-'}
                      </span>
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
                paginationInfoText={t('permissionDefinitions.table.showing', {
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

      <PermissionDefinitionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        item={editingItem}
        usedCodes={items.map((x) => x.code)}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={canDelete && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="overflow-hidden border-slate-200 bg-white p-0 shadow-2xl dark:border-cyan-800/30 dark:bg-blue-950">
          <DialogHeader className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-cyan-800/30 dark:bg-blue-900/20">
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
              {t('permissionDefinitions.delete.confirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              {t('permissionDefinitions.delete.confirmMessage', {
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
