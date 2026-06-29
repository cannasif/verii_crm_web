import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, ManagementListPageHeader, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { arraysEqual } from '@/lib/utils';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
  ADD_BUTTON_CLASS,
} from '@/lib/management-list-layout';

import { COUNTRY_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { CountryTable, getColumnsConfig } from './CountryTable';
import { CountryForm } from './CountryForm';
import type { CountryDto } from '../types/country-types';
import { useCountryList } from '../hooks/useCountryList';
import { applyCountryFilters, COUNTRY_FILTER_COLUMNS } from '../types/country-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { DefinitionExcelActions } from '@/features/definition-excel/components/DefinitionExcelActions';

const EMPTY_COUNTRIES: CountryDto[] = [];
const PAGE_KEY = 'country-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type CountryColumnKey = keyof CountryDto;

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function CountryManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['country-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<CountryColumnKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

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
    setPageTitle(t('menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data: apiResponse, isLoading } = useCountryList({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy,
    sortDirection,
  });

  const countries = useMemo<CountryDto[]>(
    () => apiResponse?.data ?? EMPTY_COUNTRIES,
    [apiResponse?.data]
  );

  const filteredCountries = useMemo<CountryDto[]>(() => {
    if (!countries.length) return [];
    let result = [...countries];
    result = applyCountryFilters(result, appliedFilterRows);
    return result;
  }, [countries, appliedFilterRows]);

  const sortedCountries = useMemo(() => {
    const result = [...filteredCountries];
    result.sort((a, b) => {
      const aVal = a[sortBy] != null ? String(a[sortBy]).toLowerCase() : '';
      const bVal = b[sortBy] != null ? String(b[sortBy]).toLowerCase() : '';
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredCountries, sortBy, sortDirection]);

  const totalCount = apiResponse?.totalCount ?? sortedCountries.length;
  const totalPages = apiResponse?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(startRow + sortedCountries.length - 1, totalCount);
  const currentPageRows = sortedCountries;

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as CountryColumnKey[];

  const filterColumns = useMemo(
    () =>
      COUNTRY_FILTER_COLUMNS.map((col) => ({
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
      currentPageRows.map((c) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          const val = c[key];
          if (key === 'createdDate' && val) {
            row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    [currentPageRows, orderedVisibleColumns, i18n.language]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    return {
      columns: exportColumns,
      rows: currentPageRows.map((c: CountryDto) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          const val = c[key];
          if (key === 'createdDate' && val) {
            row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    };
  }, [currentPageRows, exportColumns, orderedVisibleColumns, i18n.language]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

  const handleAddClick = (): void => {
    setEditingCountry(null);
    setFormOpen(true);
  };

  const handleEdit = (country: CountryDto): void => {
    setEditingCountry(country);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setEditingCountry(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [COUNTRY_MANAGEMENT_QUERY_KEYS.LIST] });
  };

  const columns = useMemo<DataTableGridColumn<CountryColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as CountryColumnKey,
        label: c.label,
        headClassName: c.headClassName,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

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
            onColumnOrderChange={setColumnOrder}
            exportFileName="countries"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={filterColumns}
            defaultFilterColumn="name"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="country-management"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('searchPlaceholder')}
            onSearchChange={setSearchTerm}
            additionalFilterActions={
              <DefinitionExcelActions
                definitionKey="country-definition"
                fileNamePrefix="countries"
                onImportCompleted={handleRefresh}
              />
            }
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
            <CountryTable
              columns={columns}
              visibleColumnKeys={orderedVisibleColumns}
              rows={currentPageRows}
              rowKey={(r) => r.id}
              renderCell={(row, key) => {
                const val = row[key];
                if (val == null && val !== 0) return '-';
                if (key === 'id') return `#${val}`;
                if (key === 'createdDate') return new Date(String(val)).toLocaleDateString(i18n.language);
                if (key === 'createdByFullUser') return String(val);
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
              loadingText={t('loading')}
              errorText={t('error', { defaultValue: 'Hata oluştu' })}
              emptyText={t('table.noData')}
              minTableWidthClassName="min-w-[800px] lg:min-w-[1000px]"
              showActionsColumn
              actionsHeaderLabel={t('common.actions')}
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
              hasPreviousPage={apiResponse?.hasPreviousPage ?? pageNumber > 1}
              hasNextPage={apiResponse?.hasNextPage ?? pageNumber < totalPages}
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

      <CountryForm open={formOpen} onOpenChange={handleFormClose} country={editingCountry} />
    </div>
  );
}
