import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, CheckCircle2, XCircle, Calendar, Building2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DefinitionExcelActions } from '@/features/definition-excel/components/DefinitionExcelActions';
import { isToolbarTabsCompactMode } from '@/hooks/useToolbarCompactMode';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { arraysEqual, cn } from '@/lib/utils';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';

import { pricingRuleQueryKeys } from '../utils/query-keys';
import { PricingRuleTable, getColumnsConfig } from './PricingRuleTable';
import { PricingRuleForm } from './PricingRuleForm';
import type { PricingRuleHeaderGetDto } from '../types/pricing-rule-types';
import { usePricingRuleHeaders } from '../hooks/usePricingRuleHeaders';
import { getPricingRuleTypeIcon, getPricingRuleTypeLabelKey } from '../utils/pricing-rule-type-options';

const EMPTY_HEADERS: PricingRuleHeaderGetDto[] = [];
const PAGE_KEY = 'pricing-rule-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type PricingRuleColumnKey = keyof PricingRuleHeaderGetDto | 'status';

function resolveLabel(t: (key: string) => string, key: string, fallback: string): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

function getRuleTypeConfig(t: (key: string) => string, type: number) {
  return {
    label: t(getPricingRuleTypeLabelKey(type).replace('pricingRule.', '')),
    className: 'bg-slate-50 dark:bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-500/20',
    icon: getPricingRuleTypeIcon(type),
  };
}

export function PricingRuleManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['pricing-rule', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingHeader, setEditingHeader] = useState<PricingRuleHeaderGetDto | null>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<PricingRuleColumnKey>('ruleName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
    setPageTitle(t('list.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data: apiResponse, isLoading } = usePricingRuleHeaders({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy,
    sortDirection,
  });

  const headers = useMemo<PricingRuleHeaderGetDto[]>(
    () => apiResponse?.data ?? EMPTY_HEADERS,
    [apiResponse?.data]
  );

  const filteredHeaders = useMemo<PricingRuleHeaderGetDto[]>(() => {
    if (!headers.length) return [];
    let result: PricingRuleHeaderGetDto[] = [...headers];
    if (activeFilter === 'active') {
      const now = new Date();
      result = result.filter((h) => {
        const from = new Date(h.validFrom);
        const to = new Date(h.validTo);
        return h.isActive && from <= now && to >= now;
      });
    } else if (activeFilter === 'inactive') {
      const now = new Date();
      result = result.filter((h) => {
        const from = new Date(h.validFrom);
        const to = new Date(h.validTo);
        return !h.isActive || from > now || to < now;
      });
    }
    return result;
  }, [headers, activeFilter]);

  const sortedHeaders = useMemo(() => {
    const result = [...filteredHeaders];
    result.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy as string] != null
        ? String((a as unknown as Record<string, unknown>)[sortBy as string]).toLowerCase()
        : '';
      const bVal = (b as unknown as Record<string, unknown>)[sortBy as string] != null
        ? String((b as unknown as Record<string, unknown>)[sortBy as string]).toLowerCase()
        : '';
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredHeaders, sortBy, sortDirection]);

  const totalCount = apiResponse?.totalCount ?? sortedHeaders.length;
  const totalPages = apiResponse?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(startRow + sortedHeaders.length - 1, totalCount);
  const currentPageRows = sortedHeaders;

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as PricingRuleColumnKey[];

  const filterColumns = useMemo(() => [], []);
  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns
        .filter((k) => k !== 'status')
        .map((key) => {
          const col = tableColumns.find((c) => c.key === key);
          return { key, label: col?.label ?? key };
        }),
    [tableColumns, orderedVisibleColumns]
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      currentPageRows.map((h) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          if (key === 'isActive') {
            const now = new Date();
            const from = new Date(h.validFrom);
            const to = new Date(h.validTo);
            const isRuleValid = h.isActive && from <= now && to >= now;
            row[key] = isRuleValid ? t('status.active') : t('status.inactive');
          } else if (key === 'ruleType') {
            row[key] = getRuleTypeConfig(t, h.ruleType).label;
          } else if (key === 'validFrom' || key === 'validTo') {
            row[key] = new Date(String(h[key])).toLocaleDateString(i18n.language);
          } else {
            row[key] = (h as unknown as Record<string, unknown>)[key] ?? '';
          }
        });
        return row;
      }),
    [currentPageRows, orderedVisibleColumns, i18n.language, t]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list: PricingRuleHeaderGetDto[] = sortedHeaders;
    return {
      columns: exportColumns,
      rows: list.map((h) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          if (key === 'isActive') {
            const now = new Date();
            const from = new Date(h.validFrom);
            const to = new Date(h.validTo);
            const isRuleValid = h.isActive && from <= now && to >= now;
            row[key] = isRuleValid ? t('status.active') : t('status.inactive');
          } else if (key === 'ruleType') {
            row[key] = getRuleTypeConfig(t, h.ruleType).label;
          } else if (key === 'validFrom' || key === 'validTo') {
            row[key] = new Date(String(h[key])).toLocaleDateString(i18n.language);
          } else {
            row[key] = (h as unknown as Record<string, unknown>)[key] ?? '';
          }
        });
        return row;
      }),
    };
  }, [exportColumns, orderedVisibleColumns, i18n.language, t, sortedHeaders]);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, activeFilter, sortBy, sortDirection]);

  const handleAddClick = (): void => {
    setEditingHeader(null);
    setFormOpen(true);
  };

  const handleEdit = (header: PricingRuleHeaderGetDto): void => {
    setEditingHeader(header);
    setFormOpen(true);
  };

  const handleFormClose = (): void => {
    setFormOpen(false);
    setEditingHeader(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: pricingRuleQueryKeys.headers() });
  };

  const columns = useMemo<DataTableGridColumn<PricingRuleColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as PricingRuleColumnKey,
        label: c.label,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2 pb-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white transition-colors">
            {t('list.title')}
          </h1>
          <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
            {t('list.description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="h-12 px-8 bg-[image:var(--crm-brand-gradient)] rounded-2xl text-white text-sm font-black shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.05] hover:shadow-primary/30 active:scale-[0.98] border-0 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
        >
          <Plus size={20} className="mr-2 stroke-[3px]" />
          {t('list.add')}
        </Button>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{t('table.title', { defaultValue: t('list.title') })}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            compactSearchOnMobile={true}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="pricing-rules"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={filterColumns}
            defaultFilterColumn="ruleName"
            draftFilterRows={[]}
            onDraftFilterRowsChange={() => { }}
            onApplyFilters={() => { }}
            onClearFilters={() => { }}
            translationNamespace="pricing-rule"
            appliedFilterCount={0}
            searchValue={searchTerm}
            searchPlaceholder={t('common.search')}
            onSearchChange={setSearchTerm}
            refresh={{
              onRefresh: () => {
                void handleRefresh();
              },
              isLoading,
              cooldownSeconds: 60,
              label: resolveLabel(t, 'common.refresh', 'Yenile'),
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
                        'font-bold uppercase whitespace-nowrap transition-all',
                        isCompactTabs
                          ? 'h-7 w-auto min-w-0 rounded-md !px-1 text-xs tracking-wide'
                          : 'h-8 shrink-0 rounded-lg px-4 text-xs tracking-wider',
                        activeFilter === filter
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                      )}
                    >
                      {filter === 'all'
                        ? t('common.all')
                        : filter === 'active'
                          ? t('status.active')
                          : t('status.inactive')}
                    </Button>
                  ))}
                </div>
              );
            }}
            additionalFilterActions={
              <DefinitionExcelActions
                definitionKey="pricing-rule"
                fileNamePrefix="fiyat-kurallari"
                onImportCompleted={handleRefresh}
              />
            }
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <PricingRuleTable
              onEdit={handleEdit}
              columns={columns}
              visibleColumnKeys={orderedVisibleColumns}
              rows={currentPageRows}
              rowKey={(r) => r.id}
              renderCell={(row, key) => {
                if (key === 'isActive') {
                  const now = new Date();
                  const from = new Date(row.validFrom);
                  const to = new Date(row.validTo);
                  const isRuleValid = row.isActive && from <= now && to >= now;
                  return (
                    <Badge
                      variant="outline"
                      className={`gap-1.5 pl-1.5 pr-2.5 py-0.5 border ${isRuleValid
                        ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20'
                        : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
                        }`}
                    >
                      {isRuleValid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {isRuleValid ? t('status.active') : t('status.inactive')}
                    </Badge>
                  );
                }
                const val = (row as unknown as Record<string, unknown>)[key as string];
                if (!val && val !== 0) return '-';
                if (key === 'ruleCode') {
                  return (
                    <span className="font-mono text-xs bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                      {String(val)}
                    </span>
                  );
                }
                if (key === 'ruleType') {
                  const config = getRuleTypeConfig(t, row.ruleType);
                  const Icon = config.icon;
                  return (
                    <Badge variant="outline" className={`gap-1.5 pl-2 pr-2.5 py-0.5 ${config.className}`}>
                      <Icon size={12} />
                      {config.label}
                    </Badge>
                  );
                }
                if (key === 'customerName') {
                  return (
                    <div className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate max-w-[150px]" title={String(val)}>
                        {String(val)}
                      </span>
                    </div>
                  );
                }
                if (key === 'validFrom' || key === 'validTo') {
                  return (
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar size={14} className="text-slate-400" />
                      {new Date(String(val)).toLocaleDateString(i18n.language)}
                    </div>
                  );
                }
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
              emptyText={t('noData')}
              onRowDoubleClick={handleEdit}
              minTableWidthClassName="min-w-[900px] lg:min-w-[1100px]"
              showActionsColumn
              actionsHeaderLabel={t('actions')}
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

      <PricingRuleForm
        open={formOpen}
        onOpenChange={handleFormClose}
        header={editingHeader}
      />
    </div>
  );
}
