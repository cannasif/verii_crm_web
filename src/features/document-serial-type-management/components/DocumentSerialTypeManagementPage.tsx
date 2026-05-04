import { type ReactElement, type ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import {
  DataTableGrid,
  ManagementDataTableChrome,
  type DataTableActionBarProps,
  type DataTableGridColumn,
} from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';

import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import { DOCUMENT_SERIAL_TYPE_QUERY_KEYS } from '../utils/query-keys';
import {
  getDocumentSerialTypeColumns,
  type DocumentSerialTypeColumnKey,
} from './document-serial-type-columns';
import { DocumentSerialTypeForm } from './DocumentSerialTypeForm';
import type { DocumentSerialTypeDto, DocumentSerialTypeFormSchema } from '../types/document-serial-type-types';
import { useDocumentSerialTypeList } from '../hooks/useDocumentSerialTypeList';
import { useCreateDocumentSerialType } from '../hooks/useCreateDocumentSerialType';
import { useUpdateDocumentSerialType } from '../hooks/useUpdateDocumentSerialType';
import { useDeleteDocumentSerialType } from '../hooks/useDeleteDocumentSerialType';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import {
  documentSerialTypeRowsToBackendFilters,
  DOCUMENT_SERIAL_TYPE_FILTER_COLUMNS,
} from '../types/document-serial-type-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import type { PagedFilter } from '@/types/api';
import { documentSerialTypeApi } from '../api/document-serial-type-api';
import { Alert02Icon } from 'hugeicons-react';
import { ArrowDown, ArrowUp, ArrowUpDown, Edit2, Loader2, Plus, Trash2 } from 'lucide-react';

const PAGE_KEY = 'document-serial-type-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const SORT_MAP: Record<string, string> = {
  id: 'Id',
  ruleTypeLabel: 'RuleType',
  customerTypeName: 'CustomerTypeName',
  salesRepFullName: 'SalesRepFullName',
  serialPrefix: 'SerialPrefix',
  serialLength: 'SerialLength',
  createdDate: 'CreatedDate',
};

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function DocumentSerialTypeManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['document-serial-type-management', 'pricing-rule', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingDocumentSerialType, setEditingDocumentSerialType] = useState<DocumentSerialTypeDto | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocumentSerialType, setSelectedDocumentSerialType] = useState<DocumentSerialTypeDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<DocumentSerialTypeColumnKey>('serialPrefix');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState<PagedFilter[]>([]);

  const queryClient = useQueryClient();
  const createDocumentSerialType = useCreateDocumentSerialType();
  const updateDocumentSerialType = useUpdateDocumentSerialType();
  const deleteDocumentSerialType = useDeleteDocumentSerialType();

  const tableColumns = useMemo(() => getDocumentSerialTypeColumns(t), [t]);
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
    setPageTitle(t('menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const filtersParam = useMemo(
    () => (appliedAdvancedFilters.length > 0 ? { filters: appliedAdvancedFilters } : {}),
    [appliedAdvancedFilters]
  );

  const apiSortBy = SORT_MAP[sortBy] ?? sortBy;

  const { data: apiResponse, isLoading, isFetching } = useDocumentSerialTypeList({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy: apiSortBy,
    sortDirection,
    ...filtersParam,
  });

  const documentSerialTypes = useMemo<DocumentSerialTypeDto[]>(
    () => apiResponse?.data ?? [],
    [apiResponse?.data]
  );

  const totalCount = apiResponse?.totalCount ?? 0;
  const totalPages = apiResponse?.totalPages ?? 1;
  const hasPreviousPage = apiResponse?.hasPreviousPage ?? false;
  const hasNextPage = apiResponse?.hasNextPage ?? false;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as DocumentSerialTypeColumnKey[];

  const filterColumns = useMemo(
    () =>
      DOCUMENT_SERIAL_TYPE_FILTER_COLUMNS.map((col) => ({
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

  const getRuleTypeLabel = useCallback((ruleType: PricingRuleType): string => {
    const labels: Record<PricingRuleType, string> = {
      [PricingRuleType.Demand]: t('pricingRule.ruleType.demand', { ns: 'pricing-rule' }),
      [PricingRuleType.Quotation]: t('pricingRule.ruleType.quotation', { ns: 'pricing-rule' }),
      [PricingRuleType.Order]: t('pricingRule.ruleType.order', { ns: 'pricing-rule' }),
    };
    return labels[ruleType] ?? t('pricingRule.ruleType.unknown', { ns: 'pricing-rule' });
  }, [t]);

  const mapDocumentSerialTypeRow = useCallback((c: DocumentSerialTypeDto): Record<string, unknown> => {
    const row: Record<string, unknown> = {};
    orderedVisibleColumns.forEach((key) => {
      if (key === 'ruleTypeLabel') {
        row[key] = getRuleTypeLabel(c.ruleType);
      } else if (key === 'createdDate' && c.createdDate) {
        row[key] = new Date(String(c.createdDate)).toLocaleDateString(i18n.language);
      } else {
        const val = c[key as keyof DocumentSerialTypeDto];
        row[key] = val ?? '';
      }
    });
    return row;
  }, [orderedVisibleColumns, i18n.language, getRuleTypeLabel]);

  const exportRows = useMemo<Record<string, unknown>[]>(
    () => documentSerialTypes.map(mapDocumentSerialTypeRow),
    [documentSerialTypes, mapDocumentSerialTypeRow]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list = await fetchAllPagedData({
      fetchPage: (exportPageNumber, exportPageSize) =>
        documentSerialTypeApi.getList({
          pageNumber: exportPageNumber,
          pageSize: exportPageSize,
          search: searchTerm || undefined,
          sortBy: apiSortBy,
          sortDirection,
          ...filtersParam,
        }),
    });
    return {
      columns: exportColumns,
      rows: list.map(mapDocumentSerialTypeRow),
    };
  }, [exportColumns, mapDocumentSerialTypeRow, searchTerm, apiSortBy, sortDirection, filtersParam]);

  const appliedFilterCount = useMemo(() => appliedAdvancedFilters.length, [appliedAdvancedFilters]);

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm, appliedAdvancedFilters, pageSize]);

  const handleAddClick = (): void => {
    setEditingDocumentSerialType(null);
    setFormOpen(true);
  };

  const handleEdit = (documentSerialType: DocumentSerialTypeDto): void => {
    setEditingDocumentSerialType(documentSerialType);
    setFormOpen(true);
  };

  const handleDeleteClick = (documentSerialType: DocumentSerialTypeDto): void => {
    setSelectedDocumentSerialType(documentSerialType);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!selectedDocumentSerialType) return;
    await deleteDocumentSerialType.mutateAsync(selectedDocumentSerialType.id);
    setDeleteDialogOpen(false);
    setSelectedDocumentSerialType(null);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setEditingDocumentSerialType(null);
  };

  const handleFormSubmit = async (data: DocumentSerialTypeFormSchema): Promise<void> => {
    if (editingDocumentSerialType) {
      await updateDocumentSerialType.mutateAsync({
        id: editingDocumentSerialType.id,
        data: {
          ruleType: data.ruleType as PricingRuleType,
          customerTypeId: data.customerTypeId,
          salesRepId: data.salesRepId,
          serialPrefix: data.serialPrefix,
          serialLength: data.serialLength,
          serialStart: data.serialStart,
          serialCurrent: data.serialCurrent,
          serialIncrement: data.serialIncrement,
        },
      });
    } else {
      await createDocumentSerialType.mutateAsync({
        ruleType: data.ruleType as PricingRuleType,
        customerTypeId: data.customerTypeId,
        salesRepId: data.salesRepId,
        serialPrefix: data.serialPrefix,
        serialLength: data.serialLength,
        serialStart: data.serialStart,
        serialCurrent: data.serialCurrent,
        serialIncrement: data.serialIncrement,
      });
    }
    setFormOpen(false);
    setEditingDocumentSerialType(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: [DOCUMENT_SERIAL_TYPE_QUERY_KEYS.LIST],
    });
  };

  const handleGridRefresh = async (): Promise<void> => {
    setSearchTerm('');
    setSearchResetKey((value) => value + 1);
    setDraftFilterRows([]);
    setAppliedAdvancedFilters([]);
    setPageNumber(1);
    await handleRefresh();
  };

  const columns = useMemo<DataTableGridColumn<DocumentSerialTypeColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as DocumentSerialTypeColumnKey,
        label: c.label,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  const renderCell = (row: DocumentSerialTypeDto, key: DocumentSerialTypeColumnKey): ReactNode => {
    if (key === 'ruleTypeLabel') {
      return (
        <span className="font-semibold text-sm">
          {getRuleTypeLabel(row.ruleType)}
        </span>
      );
    }
    const val = row[key as keyof DocumentSerialTypeDto];
    if (val == null) return '-';
    if (key === 'id') return String(val);
    if (key === 'createdDate') return new Date(String(val)).toLocaleDateString(i18n.language);
    return String(val);
  };

  const handleSort = (key: string): void => {
    const colKey = key as DocumentSerialTypeColumnKey;
    if (sortBy === colKey) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(colKey);
      setSortDirection('asc');
    }
    setPageNumber(1);
  };

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="h-11 bg-linear-to-r from-pink-600 to-orange-600 px-8 font-bold text-white shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] rounded-xl opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
        >
          <Plus size={18} className="mr-2" />
          {t('addButton')}
        </Button>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{t('table.title')}</CardTitle>
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <ManagementDataTableChrome>
              <DataTableGrid<DocumentSerialTypeDto, DocumentSerialTypeColumnKey>
                actionBar={{
                  pageKey: PAGE_KEY,
                  userId: user?.id,
                  columns: baseColumns,
                  visibleColumns,
                  columnOrder,
                  onVisibleColumnsChange: setVisibleColumns,
                  onColumnOrderChange: setColumnOrder,
                  exportFileName: 'document-serial-types',
                  exportColumns,
                  exportRows,
                  getExportData,
                  filterColumns,
                  defaultFilterColumn: 'serialPrefix',
                  draftFilterRows,
                  onDraftFilterRowsChange: setDraftFilterRows,
                  onApplyFilters: () => setAppliedAdvancedFilters(documentSerialTypeRowsToBackendFilters(draftFilterRows)),
                  onClearFilters: () => {
                    setDraftFilterRows([]);
                    setAppliedAdvancedFilters([]);
                  },
                  translationNamespace: 'document-serial-type-management',
                  appliedFilterCount,
                  search: {
                    onSearchChange: setSearchTerm,
                    placeholder: t('search'),
                    minLength: 1,
                    resetKey: searchResetKey,
                  },
                  refresh: {
                    onRefresh: () => {
                      void handleGridRefresh();
                    },
                    isLoading,
                    cooldownSeconds: 60,
                    label: resolveLabel(t, 'common.refresh', 'Yenile'),
                  },
                } satisfies DataTableActionBarProps}
                columns={columns}
                visibleColumnKeys={orderedVisibleColumns}
                rows={documentSerialTypes}
                rowKey={(r) => r.id}
                renderCell={renderCell}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
                renderSortIcon={(k) => {
                  if (sortBy !== k) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
                  return sortDirection === 'asc' ? (
                    <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                  );
                }}
                isLoading={isLoading || isFetching}
                loadingText={t('loading')}
                errorText={t('error', { defaultValue: t('common.error') })}
                emptyText={t('noData')}
                minTableWidthClassName="min-w-[800px] lg:min-w-[1000px]"
                showActionsColumn
                actionsHeaderLabel={t('actions')}
                renderActionsCell={(documentSerialType) => (
                  <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(documentSerialType)}
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(documentSerialType)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
                rowClassName="group"
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPageNumber(1);
                }}
                pageNumber={pageNumber}
                totalPages={totalPages}
                hasPreviousPage={hasPreviousPage}
                hasNextPage={hasNextPage}
                onPreviousPage={() => setPageNumber((p) => Math.max(1, p - 1))}
                onNextPage={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                previousLabel={t('previous', { defaultValue: 'Önceki' })}
                nextLabel={t('next', { defaultValue: 'Sonraki' })}
                paginationInfoText={t('common.table.showing', {
                  from: startRow,
                  to: endRow,
                  total: totalCount,
                })}
                disablePaginationButtons={false}
                centerColumnHeaders
                onColumnOrderChange={(newVisibleOrder) => {
                  setColumnOrder((currentOrder) => {
                    const hiddenCols = currentOrder.filter(k => !(newVisibleOrder as string[]).includes(k));
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
              <Alert02Icon size={36} className="text-red-600 dark:text-red-500" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('deleteConfirmTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('deleteConfirmDescription')}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 justify-center p-6 bg-slate-50/50 dark:bg-[#1a1025]/50 border-t border-slate-100 dark:border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold"
            >
              {t('cancel', { defaultValue: t('common.cancel') })}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteConfirm()}
              disabled={deleteDocumentSerialType.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteDocumentSerialType.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentSerialTypeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        documentSerialType={editingDocumentSerialType}
        isLoading={createDocumentSerialType.isPending || updateDocumentSerialType.isPending}
      />
    </div>
  );
}
