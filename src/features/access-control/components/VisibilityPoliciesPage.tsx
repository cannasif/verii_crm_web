import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit2, Eye, Layers, Loader2, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
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
import { AccessControlBooleanBadge } from './AccessControlBooleanBadge';
import { VisibilityEntityCell } from './VisibilityEntityCell';
import type { CreateVisibilityPolicySchema } from '../schemas/visibility-policy-schema';
import type { PagedRequest, VisibilityPolicyDto } from '../types/access-control.types';
import { getVisibilityEntityMeta, getVisibilityScopeMeta } from '../utils/visibility-options';
import { getVisibilityScopeBadgeClassName } from '../utils/visibility-entity-visuals';
import {
  ACCESS_CONTROL_HEADER_CARD_CLASSNAME,
  ACCESS_CONTROL_STAT_CARD_CLASSNAME,
} from '../utils/access-control-layout';
import { arraysEqual, cn } from '@/lib/utils';
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
  const { canCreate, canUpdate, canDelete } = useCrudPermissions('access-control.visibility-policies.view');

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VisibilityPolicyDto | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['code', 'name', 'entityLabel', 'scopeLabel', 'isActive']);
  const [columnOrder, setColumnOrder] = useState<string[]>(['code', 'name', 'entityLabel', 'scopeLabel', 'isActive']);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, ['code', 'name', 'entityLabel', 'scopeLabel', 'isActive']);
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
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

  const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items]);
  const entityTypeCount = useMemo(() => new Set(items.map((item) => item.entityType)).size, [items]);

  const columns: DataTableGridColumn<VisibilityPolicyColumnKey>[] = useMemo(
    () => [
      { key: 'code', label: t('visibilityPolicies.table.code'), cellClassName: 'font-mono text-sm' },
      { key: 'name', label: t('visibilityPolicies.table.name') },
      { key: 'entityLabel', label: t('visibilityPolicies.table.entityType') },
      { key: 'scopeLabel', label: t('visibilityPolicies.table.scopeType'), cellClassName: 'text-center' },
      { key: 'isActive', label: t('visibilityPolicies.table.isActive'), cellClassName: 'text-center' },
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
      <div className={ACCESS_CONTROL_HEADER_CARD_CLASSNAME}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/5 blur-[80px] dark:bg-rose-500/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-500/5 blur-[80px] dark:bg-amber-500/10" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              {t('visibilityPolicies.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('visibilityPolicies.description')}
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={() => {
                setEditingItem(null);
                setFormOpen(true);
              }}
              className="h-12 shrink-0 border-0 bg-[image:var(--crm-brand-gradient)] border-0 px-8 text-white shadow-lg shadow-rose-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={20} className="mr-2" />
              {t('visibilityPolicies.add')}
            </Button>
          )}
        </div>

        <div className="relative z-10 mt-8 grid gap-4 sm:grid-cols-3">
          <div className={ACCESS_CONTROL_STAT_CARD_CLASSNAME}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-rose-100 bg-rose-100 p-3 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                <Eye className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t('visibilityPolicies.stats.total')}
                </p>
                <p className="mt-1 text-2xl font-black leading-none text-slate-900 dark:text-white">{totalCount}</p>
              </div>
            </div>
          </div>
          <div className={ACCESS_CONTROL_STAT_CARD_CLASSNAME}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-100 p-3 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t('visibilityPolicies.stats.active')}
                </p>
                <p className="mt-1 text-2xl font-black leading-none text-slate-900 dark:text-white">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className={ACCESS_CONTROL_STAT_CARD_CLASSNAME}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-amber-100 bg-amber-100 p-3 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                <Layers className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t('visibilityPolicies.stats.entities')}
                </p>
                <p className="mt-1 text-2xl font-black leading-none text-slate-900 dark:text-white">{entityTypeCount}</p>
              </div>
            </div>
          </div>
        </div>
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
                centerColumnHeaders
                columns={columns}
                visibleColumnKeys={columnOrder.filter((key) => visibleColumns.includes(key)) as VisibilityPolicyColumnKey[]}
                rows={items}
                rowKey={(row) => row.id}
                renderCell={(row, key) => {
                  if (key === 'entityLabel') {
                    const entity = getVisibilityEntityMeta(row.entityType);
                    const label = entity
                      ? t(entity.labelKey, { defaultValue: entity.fallback })
                      : row.entityType;
                    return <VisibilityEntityCell entityType={row.entityType} label={label} />;
                  }
                  if (key === 'scopeLabel') {
                    const scope = getVisibilityScopeMeta(row.scopeType);
                    const label = scope
                      ? t(scope.labelKey, { defaultValue: scope.fallback })
                      : String(row.scopeType);
                    return (
                      <div className="flex justify-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                            getVisibilityScopeBadgeClassName(row.scopeType)
                          )}
                        >
                          {label}
                        </Badge>
                      </div>
                    );
                  }
                  if (key === 'isActive') {
                    return (
                      <AccessControlBooleanBadge
                        value={row.isActive}
                        yesLabel={t('common.yes')}
                        noLabel={t('common.no')}
                      />
                    );
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
                        className="rounded-xl text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 font-semibold"
                        onClick={() => {
                          setEditingItem(row);
                          setFormOpen(true);
                        }}
                      >
                        <Edit2 size={16} className="mr-2" />
                        {t('common.edit')}
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 font-semibold"
                        onClick={() => deleteMutation.mutate(row.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={16} className="mr-2" />
                        {t('common.delete.action')}
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
