import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ApprovalRoleTable, getColumnsConfig } from './ApprovalRoleTable';
import { ApprovalRoleForm } from './ApprovalRoleForm';
import { useCreateApprovalRole } from '../hooks/useCreateApprovalRole';
import { useUpdateApprovalRole } from '../hooks/useUpdateApprovalRole';
import type { ApprovalRoleDto } from '../types/approval-role-types';
import type { ApprovalRoleFormSchema } from '../types/approval-role-types';
import { Plus, Filter } from 'lucide-react';
import { PageToolbar, ColumnPreferencesPopover, AdvancedFilter } from '@/components/shared';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { useQueryClient } from '@tanstack/react-query';
import { APPROVAL_ROLE_QUERY_KEYS } from '../utils/query-keys';
import type { PagedFilter } from '@/types/api';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { approvalRoleRowsToBackendFilters, APPROVAL_ROLE_FILTER_COLUMNS } from '../types/approval-role-filter.types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

function buildSearchFilters(searchTerm: string): PagedFilter[] {
  const trimmed = searchTerm.trim();
  if (!trimmed) return [];
  return [
    { column: 'name', operator: 'Contains', value: trimmed },
    { column: 'approvalRoleGroupName', operator: 'Contains', value: trimmed },
  ];
}

export function ApprovalRoleManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ApprovalRoleDto | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState<PagedFilter[]>([]);

  const createRole = useCreateApprovalRole();
  const updateRole = useUpdateApprovalRole();
  const queryClient = useQueryClient();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(
    () => [...tableColumns.map((c) => c.key), 'actions'],
    [tableColumns]
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  const searchFilters = useMemo(() => buildSearchFilters(searchTerm), [searchTerm]);
  const apiFilters = useMemo<PagedFilter[]>(
    () => [...searchFilters, ...appliedAdvancedFilters],
    [searchFilters, appliedAdvancedFilters]
  );
  const filtersParam = useMemo(
    () => (apiFilters.length > 0 ? { filters: apiFilters } : {}),
    [apiFilters]
  );

  useEffect(() => {
    setPageTitle(t('approvalRole.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences('approval-role-management', user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm, appliedAdvancedFilters]);

  const handleAddClick = (): void => {
    setEditingRole(null);
    setFormOpen(true);
  };

  const handleEdit = (role: ApprovalRoleDto): void => {
    setEditingRole(role);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ApprovalRoleFormSchema): Promise<void> => {
    if (editingRole) {
      await updateRole.mutateAsync({
        id: editingRole.id,
        data: { 
          approvalRoleGroupId: data.approvalRoleGroupId, 
          name: data.name,
          maxAmount: data.maxAmount,
        },
      });
    } else {
      await createRole.mutateAsync({ 
        approvalRoleGroupId: data.approvalRoleGroupId, 
        name: data.name,
        maxAmount: data.maxAmount,
      });
    }
    setFormOpen(false);
    setEditingRole(null);
  };

  const handleSortChange = (newSortBy: string, newSortDirection: 'asc' | 'desc'): void => {
    setSortBy(newSortBy);
    setSortDirection(newSortDirection);
    setPageNumber(1);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: [APPROVAL_ROLE_QUERY_KEYS.LIST],
    });
  };

  const handleAdvancedSearch = (): void => {
    setAppliedAdvancedFilters(approvalRoleRowsToBackendFilters(draftFilterRows));
    setSearchTerm('');
    setShowFilters(false);
  };

  const handleAdvancedClear = (): void => {
    setDraftFilterRows([]);
    setAppliedAdvancedFilters([]);
  };

  const hasFiltersActive = appliedAdvancedFilters.length > 0;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('approvalRole.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors">
            {t('approvalRole.description')}
          </p>
        </div>

        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('approvalRole.addButton')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 transition-all duration-300">
        <PageToolbar
          searchPlaceholder={t('approvalRole.searchPlaceholder')}
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
                    columns={APPROVAL_ROLE_FILTER_COLUMNS}
                    defaultColumn="name"
                    draftRows={draftFilterRows}
                    onDraftRowsChange={setDraftFilterRows}
                    onSearch={handleAdvancedSearch}
                    onClear={handleAdvancedClear}
                    translationNamespace="approval-role-management"
                    embedded
                  />
                </PopoverContent>
              </Popover>
              <ColumnPreferencesPopover
                pageKey="approval-role-management"
                userId={user?.id}
                columns={[
                  ...tableColumns.map((c) => ({ key: c.key as string, label: c.label })),
                  { key: 'actions', label: t('approvalRole.table.actions') },
                ]}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibleColumnsChange={(next) => {
                  setVisibleColumns(next);
                  saveColumnPreferences('approval-role-management', user?.id, {
                    order: columnOrder,
                    visibleKeys: next,
                  });
                }}
                onColumnOrderChange={(next) => {
                  setColumnOrder(next);
                  saveColumnPreferences('approval-role-management', user?.id, {
                    order: next,
                    visibleKeys: visibleColumns,
                  });
                }}
              />
            </div>
          }
        />
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0713] shadow-sm">
        <ApprovalRoleTable
          pageNumber={pageNumber}
          pageSize={pageSize}
          sortBy={sortBy}
          sortDirection={sortDirection}
          filters={filtersParam}
          onPageChange={setPageNumber}
          onSortChange={handleSortChange}
          onEdit={handleEdit}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
        />
      </div>

      <ApprovalRoleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        role={editingRole}
        isLoading={createRole.isPending || updateRole.isPending}
      />
    </div>
  );
}
