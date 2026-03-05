import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
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
import { DOCUMENT_SERIAL_TYPE_QUERY_KEYS } from '../utils/query-keys';
import { DocumentSerialTypeTable, getColumnsConfig } from './DocumentSerialTypeTable';
import { DocumentSerialTypeForm } from './DocumentSerialTypeForm';
import type { DocumentSerialTypeDto, DocumentSerialTypeFormSchema } from '../types/document-serial-type-types';
import { useDocumentSerialTypeList } from '../hooks/useDocumentSerialTypeList';
import { useCreateDocumentSerialType } from '../hooks/useCreateDocumentSerialType';
import { useUpdateDocumentSerialType } from '../hooks/useUpdateDocumentSerialType';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import {
  documentSerialTypeRowsToBackendFilters,
  DOCUMENT_SERIAL_TYPE_FILTER_COLUMNS,
} from '../types/document-serial-type-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import type { PagedFilter } from '@/types/api';

const PAGE_KEY = 'document-serial-type-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type DocumentSerialTypeColumnKey = keyof DocumentSerialTypeDto | 'ruleTypeLabel';

const SORT_MAP: Record<string, string> = {
  id: 'Id',
  ruleTypeLabel: 'RuleType',
  customerTypeName: 'CustomerTypeName',
  salesRepFullName: 'SalesRepFullName',
  serialPrefix: 'SerialPrefix',
  serialLength: 'SerialLength',
  createdDate: 'CreatedDate',
};

function buildSearchFilters(searchTerm: string): PagedFilter[] {
  const trimmed = searchTerm.trim();
  if (!trimmed) return [];
  return [
    { column: 'serialPrefix', operator: 'Contains', value: trimmed },
    { column: 'customerTypeName', operator: 'Contains', value: trimmed },
    { column: 'salesRepFullName', operator: 'Contains', value: trimmed },
  ];
}

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

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<DocumentSerialTypeColumnKey>('serialPrefix');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState<PagedFilter[]>([]);

  const queryClient = useQueryClient();
  const createDocumentSerialType = useCreateDocumentSerialType();
  const updateDocumentSerialType = useUpdateDocumentSerialType();

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
    setPageTitle(t('menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const searchFilters = useMemo(() => buildSearchFilters(searchTerm), [searchTerm]);
  const apiFilters = useMemo<PagedFilter[]>(
    () => [...searchFilters, ...appliedAdvancedFilters],
    [searchFilters, appliedAdvancedFilters]
  );
  const filtersParam = useMemo(
    () => (apiFilters.length > 0 ? { filters: apiFilters } : {}),
    [apiFilters]
  );

  const apiSortBy = SORT_MAP[sortBy] ?? sortBy;

  const { data: apiResponse, isLoading } = useDocumentSerialTypeList({
    pageNumber,
    pageSize,
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

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      documentSerialTypes.map((c) => {
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
      }),
    [documentSerialTypes, orderedVisibleColumns, i18n.language, getRuleTypeLabel]
  );

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

  const columns = useMemo<DataTableGridColumn<DocumentSerialTypeColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as DocumentSerialTypeColumnKey,
        label: c.label,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  const renderCell = (row: DocumentSerialTypeDto, key: DocumentSerialTypeColumnKey): React.ReactNode => {
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
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('addButton')}
        </Button>
      </div>

      <Card className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm">
        <CardHeader className="space-y-4">
          <CardTitle>{t('table.title')}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="document-serial-types"
            exportColumns={exportColumns}
            exportRows={exportRows}
            filterColumns={filterColumns}
            defaultFilterColumn="serialPrefix"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedAdvancedFilters(documentSerialTypeRowsToBackendFilters(draftFilterRows))}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedAdvancedFilters([]);
            }}
            translationNamespace="document-serial-type-management"
            appliedFilterCount={appliedFilterCount}
            leftSlot={
              <>
                <Input
                  placeholder={t('search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-[200px]"
                />
                <Button
                  variant="outline"
                  size="sm"
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
        <CardContent>
          <DocumentSerialTypeTable
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
            isLoading={isLoading}
            loadingText={t('loading')}
            errorText={t('error', { defaultValue: 'Hata oluştu' })}
            emptyText={t('noData')}
            minTableWidthClassName="min-w-[800px] lg:min-w-[1000px]"
            showActionsColumn
            actionsHeaderLabel={t('actions')}
            onEdit={handleEdit}
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
          />
        </CardContent>
      </Card>

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
