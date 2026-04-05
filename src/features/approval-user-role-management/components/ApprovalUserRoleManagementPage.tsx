import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';

import { APPROVAL_USER_ROLE_QUERY_KEYS } from '../utils/query-keys';
import { ApprovalUserRoleTable, getColumnsConfig } from './ApprovalUserRoleTable';
import { ApprovalUserRoleForm } from './ApprovalUserRoleForm';
import { useApprovalUserRoleList } from '../hooks/useApprovalUserRoleList';
import type { ApprovalUserRoleDto } from '../types/approval-user-role-types';
import type { ApprovalUserRoleFormSchema } from '../types/approval-user-role-types';
import { useCreateApprovalUserRole } from '../hooks/useCreateApprovalUserRole';
import { useUpdateApprovalUserRole } from '../hooks/useUpdateApprovalUserRole';
import { applyApprovalUserRoleFilters, APPROVAL_USER_ROLE_FILTER_COLUMNS } from '../types/approval-user-role-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { approvalUserRoleApi } from '../api/approval-user-role-api';

const EMPTY_USER_ROLES: ApprovalUserRoleDto[] = [];
const PAGE_KEY = 'approval-user-role-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type ApprovalUserRoleColumnKey = keyof ApprovalUserRoleDto;

function resolveLabel(t: (key: string) => string, key: string, fallback: string): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function ApprovalUserRoleManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['approval-user-role-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUserRole, setEditingUserRole] = useState<ApprovalUserRoleDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<ApprovalUserRoleColumnKey>('userFullName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const createUserRole = useCreateApprovalUserRole();
  const updateUserRole = useUpdateApprovalUserRole();
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

  useEffect(() => {
    setPageTitle(t('approvalUserRole.menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data: apiResponse, isLoading } = useApprovalUserRoleList({
    pageNumber: 1,
    pageSize: 10000,
  });

  const userRoles = useMemo<ApprovalUserRoleDto[]>(
    () => apiResponse?.data ?? EMPTY_USER_ROLES,
    [apiResponse?.data]
  );

  const filteredUserRoles = useMemo(() => {
    if (!userRoles.length) return [];
    let result = [...userRoles];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          (r.userFullName && r.userFullName.toLowerCase().includes(lower)) ||
          (r.approvalRoleName && r.approvalRoleName.toLowerCase().includes(lower))
      );
    }
    result = applyApprovalUserRoleFilters(result, appliedFilterRows);
    return result;
  }, [userRoles, searchTerm, appliedFilterRows]);

  const sortedUserRoles = useMemo(() => {
    const result = [...filteredUserRoles];
    result.sort((a, b) => {
      const aVal = a[sortBy] != null ? String(a[sortBy]).toLowerCase() : '';
      const bVal = b[sortBy] != null ? String(b[sortBy]).toLowerCase() : '';
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredUserRoles, sortBy, sortDirection]);

  const totalCount = sortedUserRoles.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const currentPageRows = useMemo(
    () => sortedUserRoles.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [sortedUserRoles, pageNumber, pageSize]
  );

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as ApprovalUserRoleColumnKey[];

  const filterColumns = useMemo(
    () =>
      APPROVAL_USER_ROLE_FILTER_COLUMNS.map((col) => ({
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

  const mapApprovalUserRoleRow = useCallback((r: ApprovalUserRoleDto): Record<string, unknown> => {
    const row: Record<string, unknown> = {};
    orderedVisibleColumns.forEach((key) => {
      const val = r[key];
      if (key === 'createdDate' && val) {
        row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
      } else {
        row[key] = val ?? '';
      }
    });
    return row;
  }, [orderedVisibleColumns, i18n.language]);

  const exportRows = useMemo<Record<string, unknown>[]>(
    () => currentPageRows.map(mapApprovalUserRoleRow),
    [currentPageRows, mapApprovalUserRoleRow]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const response = await approvalUserRoleApi.getList({
      pageNumber: 1,
      pageSize: 10000,
    });
    const list = response?.data ?? [];
    return {
      columns: exportColumns,
      rows: list.map(mapApprovalUserRoleRow),
    };
  }, [exportColumns, mapApprovalUserRoleRow]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

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

  const columns = useMemo<DataTableGridColumn<ApprovalUserRoleColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as ApprovalUserRoleColumnKey,
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
            {t('approvalUserRole.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('approvalUserRole.description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('approvalUserRole.addButton')}
        </Button>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{t('approvalUserRole.table.title', { defaultValue: t('approvalUserRole.menu') })}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="approval-user-roles"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={filterColumns}
            defaultFilterColumn="userFullName"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="approval-user-role-management"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('approvalUserRole.searchPlaceholder')}
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
          <ApprovalUserRoleTable
            onEdit={handleEdit}
            columns={columns}
            visibleColumnKeys={orderedVisibleColumns}
            rows={currentPageRows}
            rowKey={(r) => r.id}
            renderCell={(row, key) => {
              const val = row[key];
              if (val == null && val !== 0) return '-';
              if (key === 'id') return `#${val}`;
              if (key === 'createdDate') return new Date(String(val)).toLocaleDateString(i18n.language);
              if (key === 'createdByFullUser') return row.createdByFullUser || row.createdByFullName || row.createdBy || '-';
              return String(val);
            }}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={(k) => {
              if (sortBy === k) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
              else {
                setSortBy(k);
                setSortDirection('asc');
              }
            }}
            renderSortIcon={(k) => {
              if (sortBy !== k) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
              return sortDirection === 'asc' ? (
                <ArrowUp className="h-3.5 w-3.5 text-foreground" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-foreground" />
              );
            }}
            isLoading={isLoading}
            loadingText={t('approvalUserRole.loading', { defaultValue: t('common.loading') })}
            errorText={t('approvalUserRole.error', { defaultValue: 'Hata oluştu' })}
            emptyText={t('approvalUserRole.noData')}
            minTableWidthClassName="min-w-[800px] lg:min-w-[1000px]"
            showActionsColumn
            actionsHeaderLabel={t('approvalUserRole.table.actions')}
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
