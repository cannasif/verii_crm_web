import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from 'lucide-react';

import { isToolbarTabsCompactMode } from '@/hooks/useToolbarCompactMode';
import { DataTableActionBar, ManagementListPageHeader, type DataTableGridColumn, DescriptionCell } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { arraysEqual, cn } from '@/lib/utils';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  ADD_BUTTON_CLASS,
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
import { getApprovalDocumentTypeLabel } from '../utils/approval-document-types';

const EMPTY_APPROVAL_FLOWS: ApprovalFlowDto[] = [];
const PAGE_KEY = 'approval-flow-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type ApprovalFlowColumnKey = keyof ApprovalFlowDto;


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
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
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
    if (activeFilter === 'active') {
      result = result.filter((flow) => flow.isActive);
    } else if (activeFilter === 'inactive') {
      result = result.filter((flow) => !flow.isActive);
    }
    return applyApprovalFlowFilters(result, appliedFilterRows);
  }, [approvalFlows, activeFilter, appliedFilterRows]);

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
        row[key] = getApprovalDocumentTypeLabel(t, f.documentType);
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
          description: data.description ?? undefined,
          isActive: data.isActive,
        },
      });
    } else {
      await createApprovalFlow.mutateAsync({
        documentType: data.documentType,
        description: data.description ?? undefined,
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
        headClassName: c.headClassName,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  return (
    <div className="w-full space-y-6 relative">
      <ManagementListPageHeader
        title={t('approvalFlow.menu')}
        description={t('approvalFlow.description')}
        backLabel={t('common.back', { ns: 'common', defaultValue: 'Geri' })}
        actions={
          <Button onClick={handleAddClick} className={ADD_BUTTON_CLASS}>
            <Plus size={20} className="mr-2 stroke-[3px]" />
            {t('approvalFlow.addButton')}
          </Button>
        }
      />

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
            compactSearchOnMobile={true}
            refresh={{
              isLoading,
              onRefresh: () => void handleRefresh(),
            }}
            leftSlot={({ compactLevel, isMobile }) => {
              const isCompactTabs = isMobile || isToolbarTabsCompactMode(compactLevel);

              return (
                <div
                  className={cn(
                    'flex items-center overflow-x-auto rounded-xl bg-slate-100/50 dark:bg-white/5',
                    isCompactTabs ? 'gap-px p-px' : 'gap-1 p-1'
                  )}
                >
                  {(['all', 'active', 'inactive'] as const).map((filter) => (
                    <Button
                      key={filter}
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        'font-bold uppercase whitespace-nowrap transition-colors',
                        isCompactTabs
                          ? 'h-7 w-auto min-w-0 rounded-md !px-1 text-xs tracking-wide'
                          : 'h-8 shrink-0 rounded-lg px-4 text-xs tracking-wider',
                        activeFilter === filter
                          ? 'border border-primary/20 bg-accent text-primary dark:border-primary/25 dark:bg-primary/10'
                          : 'text-slate-500 hover:bg-accent/40 hover:text-primary dark:text-slate-400 dark:hover:bg-primary/10 dark:hover:text-primary'
                      )}
                    >
                      {filter === 'all'
                        ? t('common.all')
                        : filter === 'active'
                          ? t('approvalFlow.active')
                          : t('approvalFlow.inactive')}
                    </Button>
                  ))}
                </div>
              );
            }}
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
              renderCell={(row, key, colWidth) => {
                const val = row[key];
                if (key === 'documentType') return getApprovalDocumentTypeLabel(t, row.documentType);
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
                if (key === 'description') {
                  const content = String(val ?? '');
                  return <DescriptionCell content={content} colWidth={colWidth} />;
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
