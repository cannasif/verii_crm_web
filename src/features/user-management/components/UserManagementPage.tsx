import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, ManagementListPageHeader, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { arraysEqual, cn } from '@/lib/utils';
import {
  getUserActiveStatusBadgeClassName,
  getUserRoleBadgeClassName,
  USER_CONFIRMED_BADGE_CLASSNAME,
} from '../utils/user-table-visuals';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { useManagementShowStats } from '@/lib/use-management-show-stats';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
  ADD_BUTTON_CLASS,
} from '@/lib/management-list-layout';

import { USER_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { UserStats } from './UserStats';
import { UserTable, getColumnsConfig } from './UserTable';
import { UserForm } from './UserForm';
import { useUserList } from '../hooks/useUserList';
import type { UserDto } from '../types/user-types';
import type { UserFormSchema, UserUpdateFormSchema } from '../types/user-types';
import type { CreateUserDto, UpdateUserDto } from '../types/user-types';
import { useCreateUser } from '../hooks/useCreateUser';
import { useUpdateUser as useUpdateUserMutation } from '../hooks/useUpdateUser';
import { userRowsToBackendFilters, USER_FILTER_COLUMNS } from '../types/user-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';

const PAGE_KEY = 'user-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type UserColumnKey = keyof UserDto | 'status';

function resolveLabel(t: (key: string) => string, key: string, fallback: string): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function UserManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['user-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [showStats, setShowStats] = useManagementShowStats(PAGE_KEY, user?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const createUser = useCreateUser();
  const updateUser = useUpdateUserMutation();
  const queryClient = useQueryClient();
  const { canCreate, canUpdate } = useCrudPermissions('users.user-management.view');
  const permissionGroupCrud = useCrudPermissions('access-control.permission-groups.view');
  const assignmentCrud = useCrudPermissions('access-control.user-group-assignments.view');
  const canManagePermissionGroups = permissionGroupCrud.canView && assignmentCrud.canUpdate;

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const baseColumns = useMemo(
    () =>
      tableColumns.map((c) => ({
        key: c.key as string,
        label: c.label,
      })),
    [tableColumns]
  );
  const defaultColumnKeys = useMemo(() => tableColumns.map((c) => c.key as string), [tableColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  const apiFilters = useMemo(
    () => userRowsToBackendFilters(appliedFilterRows),
    [appliedFilterRows]
  );
  const filtersParam = useMemo(
    () => (apiFilters.length > 0 ? apiFilters : undefined),
    [apiFilters]
  );

  useEffect(() => {
    setPageTitle(t('menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
  }, [user?.id, defaultColumnKeys]);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows]);

  const { data: apiResponse, isLoading } = useUserList({
    pageNumber,
    pageSize,
    search: searchTerm.trim() || undefined,
    sortBy,
    sortDirection,
    filters: filtersParam,
  });

  const users = useMemo(() => apiResponse?.data ?? [], [apiResponse?.data]);
  const totalCount = apiResponse?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);

  const REVERSE_SORT_MAP: Record<string, string> = {
    Id: 'id',
    Username: 'username',
    Email: 'email',
    FullName: 'fullName',
    ManagerFullName: 'managerFullName',
    Role: 'role',
    IsActive: 'status',
    CreationTime: 'creationTime',
  };
  const sortByDisplayKey = (REVERSE_SORT_MAP[sortBy] ?? sortBy) as UserColumnKey;

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as UserColumnKey[];

  const filterColumns = useMemo(
    () =>
      USER_FILTER_COLUMNS.map((col) => ({
        value: col.value,
        type: col.type,
        labelKey: col.labelKey,
      })),
    []
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const col = tableColumns.find((c) => c.key === key);
        return { key, label: col?.label ?? key };
      }),
    [tableColumns, orderedVisibleColumns]
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      users.map((u) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          if (key === 'status') {
            row[key] = u.isActive ? t('table.active') : t('table.inactive');
          } else if (key === 'creationTime' && u.creationTime) {
            row[key] = new Date(u.creationTime).toLocaleDateString(i18n.language);
          } else {
            const val = u[key as keyof UserDto];
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    [users, orderedVisibleColumns, i18n.language, t]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list: UserDto[] = users;
    return {
      columns: exportColumns,
      rows: list.map((u) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          if (key === 'status') {
            row[key] = u.isActive ? t('table.active') : t('table.inactive');
          } else if (key === 'creationTime' && u.creationTime) {
            row[key] = new Date(u.creationTime).toLocaleDateString(i18n.language);
          } else {
            const val = u[key as keyof UserDto];
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    };
  }, [exportColumns, orderedVisibleColumns, i18n.language, t, users]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  const handleAddClick = (): void => {
    if (!canCreate) return;
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleEdit = (u: UserDto): void => {
    if (!canUpdate) return;
    setEditingUser(u);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: UserFormSchema | UserUpdateFormSchema): Promise<void> => {
    if (editingUser) {
      if (!canUpdate) return;
      const updateData: UpdateUserDto = {
        email: data.email,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        phoneNumber: data.phoneNumber || undefined,
        roleId: data.roleId && data.roleId > 0 ? data.roleId : undefined,
        managerUserId: data.managerUserId ?? null,
        isActive: data.isActive,
        permissionGroupIds: canManagePermissionGroups ? data.permissionGroupIds : undefined,
      };
      await updateUser.mutateAsync({
        id: editingUser.id,
        data: updateData,
      });
    } else {
      if (!canCreate) return;
      const createFormData = data as UserFormSchema;
      const createData: CreateUserDto = {
        username: createFormData.username!,
        email: createFormData.email!,
        password: createFormData.password || undefined,
        firstName: createFormData.firstName || undefined,
        lastName: createFormData.lastName || undefined,
        phoneNumber: createFormData.phoneNumber || undefined,
        roleId: createFormData.roleId!,
        managerUserId: createFormData.managerUserId ?? null,
        isActive: createFormData.isActive,
        permissionGroupIds: canManagePermissionGroups ? createFormData.permissionGroupIds : undefined,
      };
      await createUser.mutateAsync(createData);
    }
    setFormOpen(false);
    setEditingUser(null);
  };

  const handleSortChange = (newSortBy: string, newSortDirection: 'asc' | 'desc'): void => {
    setSortBy(newSortBy);
    setSortDirection(newSortDirection);
    setPageNumber(1);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [USER_MANAGEMENT_QUERY_KEYS.LIST] });
  };

  const columns = useMemo<DataTableGridColumn<UserColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as UserColumnKey,
        label: c.label,
        headClassName: c.headClassName,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  return (
    <div className="w-full space-y-6 relative">
      <div className="space-y-3">
        <ManagementListPageHeader
          title={t('menu')}
          description={t('description')}
          backLabel={t('common.back', { ns: 'common', defaultValue: 'Geri' })}
          showStats={showStats}
          onToggleStats={() => setShowStats((prev) => !prev)}
          showStatsLabel={t('showStats', { defaultValue: 'İstatistikleri Göster' })}
          hideStatsLabel={t('hideStats', { defaultValue: 'İstatistikleri Gizle' })}
          actions={
            canCreate ? (
              <Button onClick={handleAddClick} className={ADD_BUTTON_CLASS}>
                <Plus size={20} className="mr-2 stroke-[3px]" />
                {t('addButton')}
              </Button>
            ) : null
          }
        />

        {showStats && <UserStats />}
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{t('table.title', { defaultValue: t('menu') })}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="users"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={filterColumns}
            defaultFilterColumn="username"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="user-management"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('searchPlaceholder', { defaultValue: t('common.search') })}
            onSearchChange={setSearchTerm}
            leftSlot={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                  onClick={() => handleRefresh()}
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
            <UserTable
              onEdit={canUpdate ? handleEdit : undefined}
              columns={columns}
              visibleColumnKeys={orderedVisibleColumns}
              rows={users}
              rowKey={(r) => r.id}
              renderCell={(row, key) => {
                if (key === 'status') {
                  return (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs font-medium shadow-none',
                          getUserActiveStatusBadgeClassName(row.isActive)
                        )}
                      >
                        {row.isActive ? t('table.active') : t('table.inactive')}
                      </Badge>
                      {row.isEmailConfirmed && (
                        <Badge
                          variant="outline"
                          className={cn('text-xs font-medium shadow-none', USER_CONFIRMED_BADGE_CLASSNAME)}
                        >
                          {t('table.confirmed')}
                        </Badge>
                      )}
                    </div>
                  );
                }
                const val = row[key as keyof UserDto];
                if (val == null) return '-';
                if (key === 'id') {
                  return (
                    <span className="tabular-nums leading-none">{`#${val}`}</span>
                  );
                }
                if (key === 'role') {
                  return (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-medium shadow-none',
                        getUserRoleBadgeClassName(row.role)
                      )}
                    >
                      {row.role || '-'}
                    </Badge>
                  );
                }
                if (key === 'creationTime') return row.creationTime ? new Date(row.creationTime).toLocaleDateString(i18n.language) : '-';
                return String(val ?? '');
              }}
              sortBy={sortByDisplayKey}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              renderSortIcon={(k) => {
                const backendKey =
                  k === 'status'
                    ? 'IsActive'
                    : k === 'id'
                      ? 'Id'
                      : k === 'username'
                        ? 'Username'
                        : k === 'email'
                          ? 'Email'
                          : k === 'fullName'
                            ? 'FullName'
                            : k === 'managerFullName'
                              ? 'ManagerFullName'
                              : k === 'role'
                                ? 'Role'
                                : k === 'creationTime'
                                  ? 'CreationTime'
                                  : k;
                if (sortBy !== backendKey) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
                return sortDirection === 'asc' ? (
                  <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                );
              }}
              isLoading={isLoading}
              loadingText={t('table.loading')}
              errorText={t('messages.error', { defaultValue: 'Hata oluştu' })}
              emptyText={t('table.noData')}
              minTableWidthClassName="min-w-[900px] lg:min-w-[1100px]"
              showActionsColumn={canUpdate}
              actionsHeaderLabel={t('common.actions')}
              rowClassName="group"
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
              paginationInfoText={t('common.table.showing', {
                from: startRow,
                to: endRow,
                total: totalCount,
              })}
              disablePaginationButtons={false}
              onColumnOrderChange={(newVisibleOrder) => {
                setColumnOrder((currentOrder) => {
                  const hiddenCols = currentOrder.filter(k => !newVisibleOrder.includes(k));
                  const finalOrder = [...newVisibleOrder, ...hiddenCols];
                  saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                  return finalOrder;
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <UserForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        user={editingUser}
        isLoading={createUser.isPending || updateUser.isPending}
        canManagePermissionGroups={canManagePermissionGroups}
      />
    </div>
  );
}
