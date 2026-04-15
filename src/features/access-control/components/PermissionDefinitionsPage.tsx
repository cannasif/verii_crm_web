import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { KeyRound, Loader2, Plus, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
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
const PAGE_KEY = 'permission-definitions';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type PermissionDefinitionColumnKey = keyof PermissionDefinitionDto;

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
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['code', 'name', 'isActive', 'updatedDate']);
  const [columnOrder, setColumnOrder] = useState<string[]>(['code', 'name', 'isActive', 'updatedDate']);

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
  const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items]);

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
    const syncItems = PERMISSION_CODE_CATALOG.map((code) => {
      const meta = getPermissionDisplayMeta(code);
      const name = meta ? t(meta.key, meta.fallback) : code;
      return { code, name, isActive: true };
    });
    await syncMutation.mutateAsync({ items: syncItems });
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
    { key: 'isActive', label: t('permissionDefinitions.table.isActive') },
    { key: 'updatedDate', label: t('permissionDefinitions.table.updatedDate') },
  ];

  const filterColumns = useMemo(() => [], []);
  const exportColumns = baseColumns;
  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      filteredItems.map((item) => ({
        code: item.code,
        name: (() => {
          const meta = getPermissionDisplayMeta(item.code);
          return meta ? t(meta.key, meta.fallback) : item.name;
        })(),
        isActive: item.isActive ? t('common.yes') : t('common.no'),
        updatedDate: item.updatedDate ? new Date(item.updatedDate).toLocaleDateString() : '-',
      })),
    [filteredItems, t]
  );

  const columns: DataTableGridColumn<PermissionDefinitionColumnKey>[] = useMemo(
    () => [
      { key: 'code', label: t('permissionDefinitions.table.code'), cellClassName: 'font-mono text-sm' },
      { key: 'name', label: t('permissionDefinitions.table.name') },
      { key: 'isActive', label: t('permissionDefinitions.table.isActive') },
      { key: 'updatedDate', label: t('permissionDefinitions.table.updatedDate'), cellClassName: 'text-slate-500 text-sm' },
    ],
    [t]
  );

  const renderActionsCell = (item: PermissionDefinitionDto): ReactElement => (
    <div className="flex justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="rounded-xl text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-cyan-900/30 dark:hover:text-cyan-300"
        onClick={() => handleEditClick(item)}
      >
        {t('common.edit')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        onClick={() => handleDeleteClick(item)}
      >
        {t('common.delete.action')}
      </Button>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-linear-to-br from-white via-cyan-50/70 to-pink-50/70 p-5 shadow-sm dark:border-cyan-800/30 dark:from-blue-950/70 dark:via-blue-950/90 dark:to-cyan-950/40 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-white/80 px-3 py-1.5 text-xs font-black text-cyan-700 shadow-sm dark:border-cyan-800/40 dark:bg-blue-950/60 dark:text-cyan-300">
              <Sparkles className="size-4" />
              {t('sidebar.permissionDefinitions')}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white transition-colors">
              {t('permissionDefinitions.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors">
              {t('permissionDefinitions.description')}
            </p>
          </div>
          <div className="flex shrink-0">
            <Button
              onClick={handleAddClick}
              className="h-11 rounded-2xl border-0 bg-linear-to-r from-pink-600 to-orange-600 px-6 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-transform hover:scale-[1.02] hover:text-white"
            >
              <Plus size={18} className="mr-2" />
              {t('permissionDefinitions.add')}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-cyan-800/30 dark:bg-blue-950/50">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-100 p-2.5 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                <KeyRound className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  {t('permissionDefinitions.title')}
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
                  {t('permissionDefinitions.table.isActive')}
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-cyan-800/30 dark:bg-blue-950/50">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-pink-100 p-2.5 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                <RefreshCw className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Route Sync
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{PERMISSION_CODE_CATALOG.length}</p>
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
                  onClick={handleSyncFromRoutes}
                  disabled={isLoading || syncMutation.isPending}
                >
                  <RefreshCw size={16} className={syncMutation.isPending ? 'animate-spin mr-2' : 'mr-2'} />
                  {t('permissionDefinitions.syncFromRoutes')}
                </Button>
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
                      {(() => {
                        const meta = getPermissionDisplayMeta(row.code);
                        return meta ? t(meta.key, meta.fallback) : row.name;
                      })()}
                    </span>
                    {(() => {
                      const meta = getPermissionDisplayMeta(row.code);
                      const displayName = meta ? t(meta.key, meta.fallback) : row.name;
                      const storedName = row.name;
                      if (!meta) return null;
                      if (storedName.trim().toLowerCase() === displayName.trim().toLowerCase()) return null;
                      return (
                        <span className="text-xs text-slate-500 dark:text-slate-400">{storedName}</span>
                      );
                    })()}
                  </div>
                );
              }
              if (key === 'isActive') {
                return (
                  <Badge variant={row.isActive ? 'default' : 'secondary'}>
                    {row.isActive ? t('common.yes') : t('common.no')}
                  </Badge>
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
