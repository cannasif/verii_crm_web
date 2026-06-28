import { type ReactElement, type ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import {
  DataTableGrid,
  DataTableActionBar,
  ManagementDataTableChrome,
  ManagementListPageHeader,
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
import { arraysEqual } from '@/lib/utils';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  ADD_BUTTON_CLASS,
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
import { DefinitionExcelActions } from '@/features/definition-excel/components/DefinitionExcelActions';

const PAGE_KEY = 'document-serial-type-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const MISSING_TRANSLATION = 'Çeviri eksik';

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
  t: (key: string, options?: Record<string, unknown>) => string,
  key: string,
  fallback: string,
  options?: Record<string, unknown>
): string {
  const translated = t(key, options);
  return translated && translated !== key && translated !== MISSING_TRANSLATION ? translated : fallback;
}

function normalizePricingRuleType(ruleType: PricingRuleType | string | number | null | undefined): PricingRuleType | null {
  if (typeof ruleType === 'number') {
    return ruleType === PricingRuleType.Demand || ruleType === PricingRuleType.Quotation || ruleType === PricingRuleType.Order
      ? ruleType
      : null;
  }

  if (typeof ruleType !== 'string') {
    return null;
  }

  const trimmed = ruleType.trim();
  const numericValue = Number(trimmed);
  if (Number.isFinite(numericValue)) {
    return normalizePricingRuleType(numericValue);
  }

  const normalized = trimmed.toLowerCase();
  if (normalized === 'demand') return PricingRuleType.Demand;
  if (normalized === 'quotation') return PricingRuleType.Quotation;
  if (normalized === 'order') return PricingRuleType.Order;

  return null;
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
  const [pageSize, setPageSize] = useState(10);
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
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
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

  const getRuleTypeLabel = useCallback((ruleType: PricingRuleType | string | number | null | undefined): string => {
    const normalizedRuleType = normalizePricingRuleType(ruleType);
    const labels: Record<PricingRuleType, string> = {
      [PricingRuleType.Demand]: resolveLabel(t, 'pricingRule.ruleType.demand', 'Talep', { ns: 'pricing-rule' }),
      [PricingRuleType.Quotation]: resolveLabel(t, 'pricingRule.ruleType.quotation', 'Teklif', { ns: 'pricing-rule' }),
      [PricingRuleType.Order]: resolveLabel(t, 'pricingRule.ruleType.order', 'Sipariş', { ns: 'pricing-rule' }),
    };
    return normalizedRuleType
      ? labels[normalizedRuleType]
      : resolveLabel(t, 'pricingRule.ruleType.unknown', 'Bilinmiyor', { ns: 'pricing-rule' });
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
        headClassName: c.headClassName,
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
      <ManagementListPageHeader
        title={t('menu')}
        description={t('description')}
        backLabel={t('common.back', { ns: 'common', defaultValue: 'Geri' })}
        actions={
          <Button onClick={handleAddClick} className={ADD_BUTTON_CLASS}>
            <Plus size={20} className="mr-2 stroke-[3px]" />
            {t('addButton')}
          </Button>
        }
      />

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{t('table.title')}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={(newVisibleOrder) => {
              setColumnOrder((currentOrder) => {
                const hiddenCols = currentOrder.filter((k) => !(newVisibleOrder as string[]).includes(k));
                const finalOrder = [...newVisibleOrder, ...hiddenCols];
                saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                return finalOrder;
              });
            }}
            exportFileName="document-serial-types"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={filterColumns}
            defaultFilterColumn="serialPrefix"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedAdvancedFilters(documentSerialTypeRowsToBackendFilters(draftFilterRows))}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedAdvancedFilters([]);
              setSearchResetKey((value) => value + 1);
            }}
            translationNamespace="document-serial-type-management"
            appliedFilterCount={appliedFilterCount}
            search={{
              onSearchChange: setSearchTerm,
              placeholder: t('search'),
              minLength: 1,
              resetKey: searchResetKey,
            }}
            refresh={{
              onRefresh: () => {
                void handleGridRefresh();
              },
              isLoading: isLoading || isFetching,
              cooldownSeconds: 60,
              label: resolveLabel(t, 'common.refresh', 'Yenile', { ns: 'common' }),
            }}
            additionalFilterActions={
              <DefinitionExcelActions
                definitionKey="document-serial-type-definition"
                fileNamePrefix="document-serial-types"
                onImportCompleted={handleGridRefresh}
              />
            }
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <ManagementDataTableChrome>
              <DataTableGrid<DocumentSerialTypeDto, DocumentSerialTypeColumnKey>
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
                errorText={t('error', { defaultValue: t('common.error', { ns: 'common' }) })}
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
                  ns: 'common',
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
              {t('cancel', { defaultValue: t('common.cancel', { ns: 'common' }) })}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteConfirm()}
              disabled={deleteDocumentSerialType.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteDocumentSerialType.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete.action', { ns: 'common' })}
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
