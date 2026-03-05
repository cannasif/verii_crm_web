import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
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
      <Button variant="ghost" size="sm" onClick={() => handleEditClick(item)}>
        {t('common.edit')}
      </Button>
      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteClick(item)}>
        {t('common.delete.action')}
      </Button>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('permissionDefinitions.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('permissionDefinitions.description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('permissionDefinitions.add')}
        </Button>
      </div>

      <Card className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm">
        <CardHeader className="space-y-4">
          <CardTitle>{t('permissionDefinitions.table.title', { defaultValue: t('permissionDefinitions.title') })}</CardTitle>
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
            leftSlot={
              <>
                <Input
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-[200px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncFromRoutes}
                  disabled={isLoading || syncMutation.isPending}
                >
                  <RefreshCw size={16} className={syncMutation.isPending ? 'animate-spin mr-2' : 'mr-2'} />
                  {t('permissionDefinitions.syncFromRoutes')}
                </Button>
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
            paginationInfoText={t('permissionDefinitions.table.showing', {
              from: (pageNumber - 1) * pageSize + 1,
              to: Math.min(pageNumber * pageSize, totalCount),
              total: totalCount,
            })}
          />
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
              {deleteMutation.isPending ? t('common.processing') : t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
