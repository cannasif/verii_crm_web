import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';

import { APPROVAL_FLOW_QUERY_KEYS } from '../utils/query-keys';
import { ApprovalFlowTable, getColumnsConfig } from './ApprovalFlowTable';
import { ApprovalFlowForm } from './ApprovalFlowForm';
import { useApprovalFlowList } from '../hooks/useApprovalFlowList';
import type { ApprovalFlowDto } from '../types/approval-flow-types';
import type { ApprovalFlowFormSchema } from '../types/approval-flow-types';
import { useCreateApprovalFlow } from '../hooks/useCreateApprovalFlow';
import { useUpdateApprovalFlow } from '../hooks/useUpdateApprovalFlow';
import { applyApprovalFlowFilters, APPROVAL_FLOW_FILTER_COLUMNS } from '../types/approval-flow-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';

const EMPTY_APPROVAL_FLOWS: ApprovalFlowDto[] = [];
const PAGE_KEY = 'approval-flow-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type ApprovalFlowColumnKey = keyof ApprovalFlowDto;

function resolveLabel(t: (key: string) => string, key: string, fallback: string): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

function getDocumentTypeLabel(t: (key: string) => string, type: number): string {
  switch (type) {
    case 1:
      return t('approvalFlow.documentType.demand');
    case 2:
      return t('approvalFlow.documentType.quotation');
    case 3:
      return t('approvalFlow.documentType.order');
    default:
      return '-';
  }
}

export function ApprovalFlowManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['approval-flow-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingApprovalFlow, setEditingApprovalFlow] = useState<ApprovalFlowDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<ApprovalFlowColumnKey>('documentType');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const createApprovalFlow = useCreateApprovalFlow();
  const updateApprovalFlow = useUpdateApprovalFlow();
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
    setPageTitle(t('approvalFlow.menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data: apiResponse, isLoading } = useApprovalFlowList({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy,
    sortDirection,
  });

  const approvalFlows = useMemo<ApprovalFlowDto[]>(
    () => apiResponse?.data ?? EMPTY_APPROVAL_FLOWS,
    [apiResponse?.data]
  );

  const filteredApprovalFlows = useMemo(() => {
    let result: ApprovalFlowDto[] = [...approvalFlows];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (flow) =>
          (flow.description && flow.description.toLowerCase().includes(lowerSearch)) ||
          String(flow.id).includes(lowerSearch)
      );
    }
    if (activeFilter === 'active') {
      result = result.filter((flow) => flow.isActive);
    } else if (activeFilter === 'inactive') {
      result = result.filter((flow) => !flow.isActive);
    }
    return applyApprovalFlowFilters(result, appliedFilterRows);
  }, [approvalFlows, searchTerm, activeFilter, appliedFilterRows]);

  const sortedApprovalFlows = useMemo(() => {
    const result = [...filteredApprovalFlows];
    result.sort((a, b) => {
      const aVal = a[sortBy] != null ? String(a[sortBy]).toLowerCase() : '';
      const bVal = b[sortBy] != null ? String(b[sortBy]).toLowerCase() : '';
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredApprovalFlows, sortBy, sortDirection]);

  const totalCount = apiResponse?.totalCount ?? sortedApprovalFlows.length;
  const totalPages = apiResponse?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(startRow + sortedApprovalFlows.length - 1, totalCount);
  const currentPageRows = sortedApprovalFlows;

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as ApprovalFlowColumnKey[];

  const filterColumns = useMemo(
    () =>
      APPROVAL_FLOW_FILTER_COLUMNS.map((col) => ({
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

  const mapApprovalFlowRow = useCallback((f: ApprovalFlowDto): Record<string, unknown> => {
    const row: Record<string, unknown> = {};
    orderedVisibleColumns.forEach((key) => {
      const val = f[key];
      if (key === 'createdDate' && val) {
        row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
      } else if (key === 'documentType') {
        row[key] = getDocumentTypeLabel(t, f.documentType);
      } else if (key === 'isActive') {
        row[key] = f.isActive ? t('approvalFlow.active') : t('approvalFlow.inactive');
      } else {
        row[key] = val ?? '';
      }
    });
    return row;
  }, [orderedVisibleColumns, i18n.language, t]);

  const exportRows = useMemo<Record<string, unknown>[]>(
    () => currentPageRows.map(mapApprovalFlowRow),
    [currentPageRows, mapApprovalFlowRow]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list = sortedApprovalFlows;
    return {
      columns: exportColumns,
      rows: list.map(mapApprovalFlowRow),
    };
  }, [exportColumns, mapApprovalFlowRow, sortedApprovalFlows]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection, activeFilter]);

  const handleAddClick = (): void => {
    setEditingApprovalFlow(null);
    setFormOpen(true);
  };

  const handleEdit = (approvalFlow: ApprovalFlowDto): void => {
    setEditingApprovalFlow(approvalFlow);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ApprovalFlowFormSchema): Promise<void> => {
    if (editingApprovalFlow) {
      await updateApprovalFlow.mutateAsync({
        id: editingApprovalFlow.id,
        data: {
          documentType: data.documentType,
          description: data.description || undefined,
          isActive: data.isActive,
        },
      });
    } else {
      await createApprovalFlow.mutateAsync({
        documentType: data.documentType,
        description: data.description || undefined,
        isActive: data.isActive,
      });
    }
    setFormOpen(false);
    setEditingApprovalFlow(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [APPROVAL_FLOW_QUERY_KEYS.LIST] });
  };

  const columns = useMemo<DataTableGridColumn<ApprovalFlowColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as ApprovalFlowColumnKey,
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
            {t('approvalFlow.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('approvalFlow.description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="h-11 bg-linear-to-r from-pink-600 to-orange-600 px-8 font-bold text-white shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] rounded-xl opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
        >
          <Plus size={18} className="mr-2" />
          {t('approvalFlow.addButton')}
        </Button>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{t('approvalFlow.table.title', { defaultValue: t('approvalFlow.menu') })}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="approval-flows"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={filterColumns}
            defaultFilterColumn="documentType"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="approval-flow-management"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('common.search')}
            onSearchChange={setSearchTerm}
            leftSlot={
              <>
                <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-white/5 p-1 rounded-xl overflow-x-auto">
                  {(['all', 'active', 'inactive'] as const).map((filter) => (
                    <Button
                      key={filter}
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveFilter(filter)}
                      className={`rounded-lg px-4 h-8 text-xs font-bold uppercase tracking-wider shrink-0 ${activeFilter === filter
                        ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                      {filter === 'all'
                        ? t('common.all')
                        : filter === 'active'
                          ? t('approvalFlow.active')
                          : t('approvalFlow.inactive')}
                    </Button>
                  ))}
                </div>
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
            <ApprovalFlowTable
              onEdit={handleEdit}
              columns={columns}
              visibleColumnKeys={orderedVisibleColumns}
              rows={currentPageRows}
              rowKey={(r) => r.id}
              renderCell={(row, key) => {
                const val = row[key];
                if (key === 'documentType') return getDocumentTypeLabel(t, row.documentType);
                if (key === 'isActive') {
                  return (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400'
                        }`}
                    >
                      {row.isActive ? t('approvalFlow.active') : t('approvalFlow.inactive')}
                    </span>
                  );
                }
                if (val == null && val !== 0) return '-';
                if (key === 'id') return `#${val}`;
                if (key === 'createdDate') return new Date(String(val)).toLocaleDateString(i18n.language);
                if (key === 'createdByFullUser') return row.createdByFullUser || '-';
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
              loadingText={t('common.loading')}
              errorText={t('approvalFlow.error', { defaultValue: 'Hata oluştu' })}
              emptyText={t('approvalFlow.noData')}
              minTableWidthClassName="min-w-[800px] lg:min-w-[1000px]"
              showActionsColumn
              actionsHeaderLabel={t('approvalFlow.table.actions')}
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

      <ApprovalFlowForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        approvalFlow={editingApprovalFlow}
        isLoading={createApprovalFlow.isPending || updateApprovalFlow.isPending}
      />
    </div>
  );
}
