import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { loadColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';

import { USER_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { UserStats } from './UserStats';
import { UserTable, getColumnsConfig } from './UserTable';
import { UserForm } from './UserForm';
import { useUserList } from '../hooks/useUserList';
import { useUpdateUser } from '../hooks/useUpdateUser';
import type { UserDto } from '../types/user-types';
import type { UserFormSchema, UserUpdateFormSchema } from '../types/user-types';
import type { CreateUserDto, UpdateUserDto } from '../types/user-types';
import { useCreateUser } from '../hooks/useCreateUser';
import { useUpdateUser as useUpdateUserMutation } from '../hooks/useUpdateUser';
import { userRowsToBackendFilters, USER_FILTER_COLUMNS } from '../types/user-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import type { PagedFilter } from '@/types/api';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const createUser = useCreateUser();
  const updateUser = useUpdateUserMutation();
  const updateUserStatus = useUpdateUser();
  const queryClient = useQueryClient();

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

  const searchFilters = useMemo<PagedFilter[]>(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return [];
    return [
      { column: 'username', operator: 'Contains', value: trimmed },
      { column: 'email', operator: 'Contains', value: trimmed },
    ];
  }, [searchTerm]);

  const apiFilters = useMemo<PagedFilter[]>(
    () => [...searchFilters, ...userRowsToBackendFilters(appliedFilterRows)],
    [searchFilters, appliedFilterRows]
  );
  const filtersParam = useMemo(
    () => (apiFilters.length > 0 ? apiFilters : undefined),
    [apiFilters]
  );

  useEffect(() => {
    setPageTitle(t('userManagement.menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows]);

  const { data: apiResponse, isLoading } = useUserList({
    pageNumber,
    pageSize,
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
            row[key] = u.isActive ? t('userManagement.table.active') : t('userManagement.table.inactive');
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
            row[key] = u.isActive ? t('userManagement.table.active') : t('userManagement.table.inactive');
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
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleEdit = (u: UserDto): void => {
    setEditingUser(u);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: UserFormSchema | UserUpdateFormSchema): Promise<void> => {
    if (editingUser) {
      const updateData: UpdateUserDto = {
        email: data.email,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        phoneNumber: data.phoneNumber || undefined,
        roleId: data.roleId && data.roleId > 0 ? data.roleId : undefined,
        isActive: data.isActive,
        permissionGroupIds: data.permissionGroupIds,
      };
      await updateUser.mutateAsync({
        id: editingUser.id,
        data: updateData,
      });
    } else {
      const createFormData = data as UserFormSchema;
      const createData: CreateUserDto = {
        username: createFormData.username!,
        email: createFormData.email!,
        password: createFormData.password || undefined,
        firstName: createFormData.firstName || undefined,
        lastName: createFormData.lastName || undefined,
        phoneNumber: createFormData.phoneNumber || undefined,
        roleId: createFormData.roleId!,
        isActive: createFormData.isActive,
        permissionGroupIds: createFormData.permissionGroupIds,
      };
      await createUser.mutateAsync(createData);
    }
    setFormOpen(false);
    setEditingUser(null);
  };

  const handleStatusChange = async (user: UserDto, checked: boolean): Promise<void> => {
    await updateUserStatus.mutateAsync({
      id: user.id,
      data: { isActive: checked },
    });
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
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('userManagement.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('userManagement.description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('userManagement.addButton')}
        </Button>
      </div>

      <UserStats />

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{t('userManagement.table.title', { defaultValue: t('userManagement.menu') })}</CardTitle>
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
            searchPlaceholder={t('userManagement.searchPlaceholder', { defaultValue: t('common.search') })}
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
            onEdit={handleEdit}
            columns={columns}
            visibleColumnKeys={orderedVisibleColumns}
            rows={users}
            rowKey={(r) => r.id}
            renderCell={(row, key) => {
              if (key === 'status') {
                return (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={row.isActive}
                      onCheckedChange={(checked) => handleStatusChange(row, checked)}
                      disabled={updateUserStatus.isPending}
                    />
                    <span className="text-sm text-muted-foreground">
                      {row.isActive ? t('userManagement.table.active') : t('userManagement.table.inactive')}
                    </span>
                    {row.isEmailConfirmed && (
                      <Badge variant="outline" className="text-xs">
                        {t('userManagement.table.confirmed')}
                      </Badge>
                    )}
                  </div>
                );
              }
              const val = row[key as keyof UserDto];
              if (val == null) return '-';
              if (key === 'id') return `#${val}`;
              if (key === 'role') return <Badge variant="outline">{row.role || '-'}</Badge>;
              if (key === 'creationTime') return row.creationTime ? new Date(row.creationTime).toLocaleDateString(i18n.language) : '-';
              return String(val ?? '');
            }}
            sortBy={sortByDisplayKey}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            renderSortIcon={(k) => {
              const backendKey = k === 'status' ? 'IsActive' : k === 'id' ? 'Id' : k === 'username' ? 'Username' : k === 'email' ? 'Email' : k === 'fullName' ? 'FullName' : k === 'role' ? 'Role' : k === 'creationTime' ? 'CreationTime' : k;
              if (sortBy !== backendKey) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
              return sortDirection === 'asc' ? (
                <ArrowUp className="h-3.5 w-3.5 text-foreground" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-foreground" />
              );
            }}
            isLoading={isLoading}
            loadingText={t('userManagement.table.loading')}
            errorText={t('userManagement.messages.error', { defaultValue: 'Hata oluştu' })}
            emptyText={t('userManagement.table.noData')}
            minTableWidthClassName="min-w-[900px] lg:min-w-[1100px]"
            showActionsColumn
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
      />
    </div>
  );
}
