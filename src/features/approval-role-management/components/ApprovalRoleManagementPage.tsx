import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { APPROVAL_ROLE_QUERY_KEYS } from '../utils/query-keys';
import { ApprovalRoleTable, getColumnsConfig } from './ApprovalRoleTable';
import { ApprovalRoleForm } from './ApprovalRoleForm';
import { useApprovalRoleList } from '../hooks/useApprovalRoleList';
import type { ApprovalRoleDto } from '../types/approval-role-types';
import type { ApprovalRoleFormSchema } from '../types/approval-role-types';
import { useCreateApprovalRole } from '../hooks/useCreateApprovalRole';
import { useUpdateApprovalRole } from '../hooks/useUpdateApprovalRole';
import { approvalRoleRowsToBackendFilters, APPROVAL_ROLE_FILTER_COLUMNS } from '../types/approval-role-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import type { PagedFilter } from '@/types/api';

const SORT_MAP: Record<string, string> = {
  id: 'Id',
  approvalRoleGroupName: 'ApprovalRoleGroupName',
  name: 'Name',
  maxAmount: 'MaxAmount',
  createdDate: 'CreatedDate',
  createdByFullUser: 'CreatedByFullUser',
};

const REVERSE_SORT_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SORT_MAP).map(([k, v]) => [v, k])
);

const PAGE_KEY = 'approval-role-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type ApprovalRoleColumnKey = keyof ApprovalRoleDto;

function resolveLabel(t: (key: string) => string, key: string, fallback: string): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function ApprovalRoleManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['approval-role-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ApprovalRoleDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const createRole = useCreateApprovalRole();
  const updateRole = useUpdateApprovalRole();
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
  const defaultColumnKeys = useMemo(() => [...tableColumns.map((c) => c.key as string), 'actions'], [tableColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  const searchFilters = useMemo<PagedFilter[]>(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return [];
    return [
      { column: 'name', operator: 'Contains', value: trimmed },
      { column: 'approvalRoleGroupName', operator: 'Contains', value: trimmed },
    ];
  }, [searchTerm]);

  const apiFilters = useMemo<PagedFilter[]>(
    () => [...searchFilters, ...approvalRoleRowsToBackendFilters(appliedFilterRows)],
    [searchFilters, appliedFilterRows]
  );

  useEffect(() => {
    setPageTitle(t('approvalRole.menu'));
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

  const { data: apiResponse, isLoading, isFetching } = useApprovalRoleList({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    filters: apiFilters.length > 0 ? apiFilters : undefined,
  });

  const roles = apiResponse?.data ?? [];
  const totalCount = apiResponse?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);

  const orderedVisibleColumns = columnOrder
    .filter((k) => visibleColumns.includes(k) && k !== 'actions')
    .filter((k): k is ApprovalRoleColumnKey => k !== 'actions');
  const sortByDisplayKey = (REVERSE_SORT_MAP[sortBy] ?? sortBy) as ApprovalRoleColumnKey;

  const filterColumns = useMemo(
    () =>
      APPROVAL_ROLE_FILTER_COLUMNS.map((col) => ({
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
      roles.map((r) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          const val = r[key];
          if (key === 'createdDate' && val) {
            row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
          } else if (key === 'maxAmount' && val != null) {
            row[key] = new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'TRY' }).format(Number(val));
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    [roles, orderedVisibleColumns, i18n.language]
  );

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

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
    await queryClient.invalidateQueries({ queryKey: [APPROVAL_ROLE_QUERY_KEYS.LIST] });
  };

  const columns = useMemo<DataTableGridColumn<ApprovalRoleColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as ApprovalRoleColumnKey,
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
            {t('approvalRole.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('approvalRole.description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('approvalRole.addButton')}
        </Button>
      </div>

      <Card className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm">
        <CardHeader className="space-y-4">
          <CardTitle>{t('approvalRole.table.title', { defaultValue: t('approvalRole.menu') })}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="approval-roles"
            exportColumns={exportColumns}
            exportRows={exportRows}
            filterColumns={filterColumns}
            defaultFilterColumn="name"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="approval-role-management"
            appliedFilterCount={appliedFilterCount}
            leftSlot={
              <>
                <Input
                  placeholder={t('approvalRole.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-[200px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefresh()}
                  disabled={isLoading || isFetching}
                >
                  {isLoading || isFetching ? (
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
          <ApprovalRoleTable
            onEdit={handleEdit}
            columns={columns}
            visibleColumnKeys={orderedVisibleColumns}
            rows={roles}
            rowKey={(r) => r.id}
            renderCell={(row, key) => {
              const val = row[key];
              if (val == null && val !== 0) return '-';
              if (key === 'id') return `#${val}`;
              if (key === 'approvalRoleGroupName') return row.approvalRoleGroupName || '-';
              if (key === 'name') return row.name || '-';
              if (key === 'maxAmount')
                return new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'TRY' }).format(row.maxAmount ?? 0);
              if (key === 'createdDate') return new Date(String(val)).toLocaleDateString(i18n.language);
              if (key === 'createdByFullUser') return row.createdByFullUser || row.createdByFullName || row.createdBy || '-';
              return String(val);
            }}
            sortBy={sortByDisplayKey}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            renderSortIcon={(k) => {
              const backendKey = SORT_MAP[k as string] ?? k;
              if (sortBy !== backendKey) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
              return sortDirection === 'asc' ? (
                <ArrowUp className="h-3.5 w-3.5 text-foreground" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-foreground" />
              );
            }}
            isLoading={isLoading || isFetching}
            loadingText={t('approvalRole.loading')}
            errorText={t('approvalRole.messages.error', { defaultValue: 'Hata oluştu' })}
            emptyText={t('approvalRole.noData')}
            minTableWidthClassName="min-w-[800px] lg:min-w-[1000px]"
            showActionsColumn
            actionsHeaderLabel={t('approvalRole.table.actions')}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPageNumber(1);
            }}
            rowClassName="group"
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
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
        </CardContent>
      </Card>

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
