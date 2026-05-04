import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { DataTableActionBar, DataTableGrid, ManagementDataTableChrome, type DataTableGridColumn } from '@/components/shared';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { visibilityPolicyApi } from '../api/visibilityPolicyApi';
import { VisibilityPolicyForm } from './VisibilityPolicyForm';
import type { CreateVisibilityPolicySchema } from '../schemas/visibility-policy-schema';
import type { PagedRequest, VisibilityPolicyDto } from '../types/access-control.types';
import { getVisibilityEntityMeta, getVisibilityScopeMeta } from '../utils/visibility-options';
import { useCrudPermissions } from '../hooks/useCrudPermissions';

const PAGE_KEY = 'visibility-policies';
const EMPTY_ITEMS: VisibilityPolicyDto[] = [];
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type VisibilityPolicyColumnKey = keyof VisibilityPolicyDto | 'scopeLabel' | 'entityLabel';

export function VisibilityPoliciesPage(): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { canCreate, canUpdate, canDelete } = useCrudPermissions('access-control.permission-groups.view');

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VisibilityPolicyDto | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['code', 'name', 'entityLabel', 'scopeLabel', 'isActive']);
  const [columnOrder, setColumnOrder] = useState<string[]>(['code', 'name', 'entityLabel', 'scopeLabel', 'isActive']);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, ['code', 'name', 'entityLabel', 'scopeLabel', 'isActive']);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id]);

  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);

  useEffect(() => {
    setPageTitle(t('visibilityPolicies.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const queryParams = useMemo<PagedRequest>(
    () => ({
      pageNumber,
      pageSize,
      search: searchTerm || undefined,
      sortBy: 'updatedDate',
      sortDirection: 'desc',
    }),
    [pageNumber, pageSize, searchTerm]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['visibility-policies', queryParams],
    queryFn: () => visibilityPolicyApi.getList(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: visibilityPolicyApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['visibility-policies'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<VisibilityPolicyDto> }) => visibilityPolicyApi.update(id, dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['visibility-policies'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: visibilityPolicyApi.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['visibility-policies'] });
    },
  });

  const items = data?.data ?? EMPTY_ITEMS;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const columns: DataTableGridColumn<VisibilityPolicyColumnKey>[] = useMemo(
    () => [
      { key: 'code', label: t('visibilityPolicies.table.code'), cellClassName: 'font-mono text-sm' },
      { key: 'name', label: t('visibilityPolicies.table.name') },
      { key: 'entityLabel', label: t('visibilityPolicies.table.entityType') },
      { key: 'scopeLabel', label: t('visibilityPolicies.table.scopeType') },
      { key: 'isActive', label: t('visibilityPolicies.table.isActive') },
    ],
    [t]
  );

  const exportColumns = [
    { key: 'code', label: t('visibilityPolicies.table.code') },
    { key: 'name', label: t('visibilityPolicies.table.name') },
    { key: 'entityType', label: t('visibilityPolicies.table.entityType') },
    { key: 'scopeType', label: t('visibilityPolicies.table.scopeType') },
    { key: 'includeSelf', label: t('visibilityPolicies.table.includeSelf') },
    { key: 'isActive', label: t('visibilityPolicies.table.isActive') },
  ];

  const exportRows = items.map((item) => ({
    code: item.code,
    name: item.name,
    entityType: t(getVisibilityEntityMeta(item.entityType)?.labelKey ?? 'visibilityPolicies.entity.activity', {
      defaultValue: getVisibilityEntityMeta(item.entityType)?.fallback ?? item.entityType,
    }),
    scopeType: t(getVisibilityScopeMeta(item.scopeType)?.labelKey ?? 'visibilityPolicies.scope.self', {
      defaultValue: getVisibilityScopeMeta(item.scopeType)?.fallback ?? String(item.scopeType),
    }),
    includeSelf: item.includeSelf ? t('common.yes') : t('common.no'),
    isActive: item.isActive ? t('common.yes') : t('common.no'),
  }));

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['visibility-policies'] });
  };

  const handleFormSubmit = async (formData: CreateVisibilityPolicySchema): Promise<void> => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, dto: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setFormOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t('visibilityPolicies.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">{t('visibilityPolicies.description')}</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditingItem(null);
              setFormOpen(true);
            }}
            className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
          >
            <Plus size={18} className="mr-2" />
            {t('visibilityPolicies.add')}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
          <CardContent className="p-5">
            <div className="text-sm text-slate-500">{t('visibilityPolicies.stats.total')}</div>
            <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{totalCount}</div>
          </CardContent>
        </Card>
        <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
          <CardContent className="p-5">
            <div className="text-sm text-slate-500">{t('visibilityPolicies.stats.active')}</div>
            <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{items.filter((item) => item.isActive).length}</div>
          </CardContent>
        </Card>
        <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
          <CardContent className="p-5">
            <div className="text-sm text-slate-500">{t('visibilityPolicies.stats.entities')}</div>
            <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{new Set(items.map((item) => item.entityType)).size}</div>
          </CardContent>
        </Card>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{t('visibilityPolicies.table.title')}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={columns.map((column) => ({ key: column.key as string, label: column.label }))}
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
            exportFileName="visibility-policies"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={async () => ({ columns: exportColumns, rows: exportRows })}
            filterColumns={[]}
            defaultFilterColumn=""
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => undefined}
            onClearFilters={() => undefined}
            translationNamespace="access-control"
            searchValue={searchTerm}
            searchPlaceholder={t('visibilityPolicies.search')}
            onSearchChange={setSearchTerm}
            leftSlot={
              <Button
                variant="outline"
                size="sm"
                className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                onClick={() => handleRefresh()}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {t('common.refresh', { defaultValue: 'Yenile' })}
              </Button>
            }
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <ManagementDataTableChrome>
              <DataTableGrid<VisibilityPolicyDto, VisibilityPolicyColumnKey>
                columns={columns}
                visibleColumnKeys={columnOrder.filter((key) => visibleColumns.includes(key)) as VisibilityPolicyColumnKey[]}
                rows={items}
                rowKey={(row) => row.id}
                renderCell={(row, key) => {
                  if (key === 'entityLabel') {
                    const entity = getVisibilityEntityMeta(row.entityType);
                    return entity ? t(entity.labelKey, { defaultValue: entity.fallback }) : row.entityType;
                  }
                  if (key === 'scopeLabel') {
                    const scope = getVisibilityScopeMeta(row.scopeType);
                    return scope ? t(scope.labelKey, { defaultValue: scope.fallback }) : row.scopeType;
                  }
                  if (key === 'isActive') {
                    return <Badge variant={row.isActive ? 'default' : 'secondary'}>{row.isActive ? t('common.yes') : t('common.no')}</Badge>;
                  }
                  return String(row[key as keyof VisibilityPolicyDto] ?? '-');
                }}
                sortBy={'code'}
                sortDirection={'asc'}
                onSort={() => undefined}
                renderSortIcon={() => null}
                isLoading={isLoading}
                isError={false}
                loadingText={t('common.loading')}
                errorText={t('common.noData')}
                emptyText={t('common.noData')}
                minTableWidthClassName="min-w-[920px]"
                showActionsColumn
                actionsHeaderLabel={t('common.actions')}
                renderActionsCell={(row) => (
                  <div className="flex justify-end gap-2">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-cyan-900/30 dark:hover:text-cyan-300"
                        onClick={() => {
                          setEditingItem(row);
                          setFormOpen(true);
                        }}
                      >
                        {t('common.edit')}
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={() => deleteMutation.mutate(row.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                )}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageNumber(1);
                }}
                pageNumber={pageNumber}
                totalPages={totalPages}
                hasPreviousPage={pageNumber > 1}
                hasNextPage={pageNumber < totalPages}
                onPreviousPage={() => setPageNumber((value) => Math.max(1, value - 1))}
                onNextPage={() => setPageNumber((value) => Math.min(totalPages, value + 1))}
                previousLabel={t('common.previous')}
                nextLabel={t('common.next')}
                paginationInfoText={t('visibilityPolicies.table.showing', {
                  from: totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1,
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
              />
            </ManagementDataTableChrome>
          </div>
        </CardContent>
      </Card>

      <VisibilityPolicyForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingItem(null);
          }
        }}
        item={editingItem}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
