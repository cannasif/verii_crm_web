import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ApprovalUserRoleTable, getColumnsConfig } from './ApprovalUserRoleTable';
import { ApprovalUserRoleForm } from './ApprovalUserRoleForm';
import { useCreateApprovalUserRole } from '../hooks/useCreateApprovalUserRole';
import { useUpdateApprovalUserRole } from '../hooks/useUpdateApprovalUserRole';
import { useApprovalUserRoleList } from '../hooks/useApprovalUserRoleList';
import type { ApprovalUserRoleDto } from '../types/approval-user-role-types';
import type { ApprovalUserRoleFormSchema } from '../types/approval-user-role-types';
import { Plus, Filter } from 'lucide-react';
import { PageToolbar, ColumnPreferencesPopover, AdvancedFilter } from '@/components/shared';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { useQueryClient } from '@tanstack/react-query';
import { APPROVAL_USER_ROLE_QUERY_KEYS } from '../utils/query-keys';
import { applyApprovalUserRoleFilters, APPROVAL_USER_ROLE_FILTER_COLUMNS } from '../types/approval-user-role-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function ApprovalUserRoleManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingUserRole, setEditingUserRole] = useState<ApprovalUserRoleDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const createUserRole = useCreateApprovalUserRole();
  const updateUserRole = useUpdateApprovalUserRole();
  const queryClient = useQueryClient();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(
    () => [...tableColumns.map((c) => c.key), 'actions'],
    [tableColumns]
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  useEffect(() => {
    const prefs = loadColumnPreferences('approval-user-role-management', user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data, isLoading } = useApprovalUserRoleList({
    pageNumber: 1,
    pageSize: 10000,
  });

  const filteredUserRoles = useMemo(() => {
    const userRoles = data?.data || [];
    let result = [...userRoles];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (role) =>
          (role.userFullName && role.userFullName.toLowerCase().includes(lowerSearch)) ||
          (role.approvalRoleName && role.approvalRoleName.toLowerCase().includes(lowerSearch))
      );
    }

    result = applyApprovalUserRoleFilters(result, appliedFilterRows);
    return result;
  }, [data?.data, searchTerm, appliedFilterRows]);

  useEffect(() => {
    setPageTitle(t('approvalUserRole.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleAddClick = (): void => {
    setEditingUserRole(null);
    setFormOpen(true);
  };

  const handleEdit = (userRole: ApprovalUserRoleDto): void => {
    setEditingUserRole(userRole);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ApprovalUserRoleFormSchema): Promise<void> => {
    if (editingUserRole) {
      await updateUserRole.mutateAsync({
        id: editingUserRole.id,
        data: { userId: data.userId, approvalRoleId: data.approvalRoleId },
      });
    } else {
      await createUserRole.mutateAsync({ userId: data.userId, approvalRoleId: data.approvalRoleId });
    }
    setFormOpen(false);
    setEditingUserRole(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [APPROVAL_USER_ROLE_QUERY_KEYS.LIST] });
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

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('approvalUserRole.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors">
            {t('approvalUserRole.description')}
          </p>
        </div>

        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('approvalUserRole.addButton')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 transition-all duration-300">
        <PageToolbar
          searchPlaceholder={t('approvalUserRole.searchPlaceholder')}
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
                    columns={APPROVAL_USER_ROLE_FILTER_COLUMNS}
                    defaultColumn="userFullName"
                    draftRows={draftFilterRows}
                    onDraftRowsChange={setDraftFilterRows}
                    onSearch={handleAdvancedSearch}
                    onClear={handleAdvancedClear}
                    translationNamespace="approvalUserRole"
                    embedded
                  />
                </PopoverContent>
              </Popover>
              <ColumnPreferencesPopover
                pageKey="approval-user-role-management"
                userId={user?.id}
                columns={[
                  ...tableColumns.map((c) => ({ key: c.key as string, label: c.label })),
                  { key: 'actions', label: t('approvalUserRole.table.actions') },
                ]}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibleColumnsChange={(next) => {
                  setVisibleColumns(next);
                  saveColumnPreferences('approval-user-role-management', user?.id, {
                    order: columnOrder,
                    visibleKeys: next,
                  });
                }}
                onColumnOrderChange={(next) => {
                  setColumnOrder(next);
                  saveColumnPreferences('approval-user-role-management', user?.id, {
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
        <ApprovalUserRoleTable
          userRoles={filteredUserRoles}
          isLoading={isLoading}
          onEdit={handleEdit}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
        />
      </div>

      <ApprovalUserRoleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        userRole={editingUserRole}
        isLoading={createUserRole.isPending || updateUserRole.isPending}
      />
    </div>
  );
}
