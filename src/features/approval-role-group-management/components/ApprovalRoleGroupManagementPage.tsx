import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ApprovalRoleGroupTable, getColumnsConfig } from './ApprovalRoleGroupTable';
import { ApprovalRoleGroupForm } from './ApprovalRoleGroupForm';
import { useCreateApprovalRoleGroup } from '../hooks/useCreateApprovalRoleGroup';
import { useUpdateApprovalRoleGroup } from '../hooks/useUpdateApprovalRoleGroup';
import { useApprovalRoleGroupList } from '../hooks/useApprovalRoleGroupList';
import type { ApprovalRoleGroupDto } from '../types/approval-role-group-types';
import type { ApprovalRoleGroupFormSchema } from '../types/approval-role-group-types';
import { Plus, Filter } from 'lucide-react';
import { PageToolbar, ColumnPreferencesPopover, AdvancedFilter } from '@/components/shared';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { useQueryClient } from '@tanstack/react-query';
import { APPROVAL_ROLE_GROUP_QUERY_KEYS } from '../utils/query-keys';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { applyApprovalRoleGroupFilters, APPROVAL_ROLE_GROUP_FILTER_COLUMNS } from '../types/approval-role-group-filter.types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function ApprovalRoleGroupManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ApprovalRoleGroupDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const createGroup = useCreateApprovalRoleGroup();
  const updateGroup = useUpdateApprovalRoleGroup();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(
    () => [...tableColumns.map((c) => c.key), 'actions'],
    [tableColumns]
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  const { data, isLoading } = useApprovalRoleGroupList({
    pageNumber: 1,
    pageSize: 10000,
    sortBy: 'Id',
    sortDirection: 'desc',
  });

  useEffect(() => {
    setPageTitle(t('approvalRoleGroup.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences('approval-role-group-management', user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const filteredRoleGroups = useMemo(() => {
    if (!data?.data) return [];
    let result: ApprovalRoleGroupDto[] = [...data.data];
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter((item) =>
        item.name?.toLowerCase().includes(lowerTerm)
      );
    }
    return applyApprovalRoleGroupFilters(result, appliedFilterRows);
  }, [data?.data, searchTerm, appliedFilterRows]);

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: [APPROVAL_ROLE_GROUP_QUERY_KEYS.LIST],
    });
  };

  const handleAdvancedSearch = (): void => {
    setAppliedFilterRows(draftFilterRows);
    setSearchTerm('');
    setShowFilters(false);
  };

  const handleAdvancedClear = (): void => {
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
  };

  const hasFiltersActive = appliedFilterRows.some((r) => r.value.trim() !== '');

  const handleAddClick = (): void => {
    setEditingGroup(null);
    setFormOpen(true);
  };

  const handleEdit = (group: ApprovalRoleGroupDto): void => {
    setEditingGroup(group);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ApprovalRoleGroupFormSchema): Promise<void> => {
    if (editingGroup) {
      await updateGroup.mutateAsync({
        id: editingGroup.id,
        data: { name: data.name },
      });
    } else {
      await createGroup.mutateAsync({ name: data.name });
    }
    setFormOpen(false);
    setEditingGroup(null);
  };

  return (
    <div className="w-full space-y-6 relative">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('approvalRoleGroup.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('approvalRoleGroup.description')}
          </p>
        </div>
        
        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('approvalRoleGroup.addButton')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 transition-all duration-300">
        <PageToolbar
          searchPlaceholder={t('approvalRoleGroup.searchPlaceholder')}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={handleRefresh}
          rightSlot={
            <div className="flex items-center gap-2">
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button
                    variant={hasFiltersActive ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 border-dashed border-slate-300 dark:border-white/20 text-xs sm:text-sm ${
                      hasFiltersActive
                        ? 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30 hover:bg-pink-500/30'
                        : 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    {t('common.filters')}
                    {hasFiltersActive && (
                      <span className="ml-2 h-2 w-2 rounded-full bg-pink-500" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[420px] p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                  <AdvancedFilter
                    columns={APPROVAL_ROLE_GROUP_FILTER_COLUMNS}
                    defaultColumn="name"
                    draftRows={draftFilterRows}
                    onDraftRowsChange={setDraftFilterRows}
                    onSearch={handleAdvancedSearch}
                    onClear={handleAdvancedClear}
                    translationNamespace="approval-role-group-management"
                    embedded
                  />
                </PopoverContent>
              </Popover>
              <ColumnPreferencesPopover
                pageKey="approval-role-group-management"
                userId={user?.id}
                columns={[
                  ...tableColumns.map((c) => ({ key: c.key as string, label: c.label })),
                  { key: 'actions', label: t('approvalRoleGroup.table.actions') },
                ]}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibleColumnsChange={(next) => {
                  setVisibleColumns(next);
                  saveColumnPreferences('approval-role-group-management', user?.id, {
                    order: columnOrder,
                    visibleKeys: next,
                  });
                }}
                onColumnOrderChange={(next) => {
                  setColumnOrder(next);
                  saveColumnPreferences('approval-role-group-management', user?.id, {
                    order: next,
                    visibleKeys: visibleColumns,
                  });
                }}
              />
            </div>
          }
        />
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <ApprovalRoleGroupTable
          roleGroups={filteredRoleGroups}
          isLoading={isLoading}
          onEdit={handleEdit}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
        />
      </div>

      <ApprovalRoleGroupForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        group={editingGroup}
        isLoading={createGroup.isPending || updateGroup.isPending}
      />
    </div>
  );
}
