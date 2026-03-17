import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { Users, Activity, Calendar } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { TitleTable, getColumnsConfig } from './TitleTable';
import { TitleForm } from './TitleForm';
import type { TitleDto } from '../types/title-types';
import type { TitleFormSchema } from '../types/title-types';
import { useTitleList } from '../hooks/useTitleList';
import { useTitleStats } from '../hooks/useTitleStats';
import { useCreateTitle } from '../hooks/useCreateTitle';
import { useUpdateTitle } from '../hooks/useUpdateTitle';
import { applyTitleFilters, TITLE_FILTER_COLUMNS } from '../types/title-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { queryKeys } from '../utils/query-keys';
import { titleApi } from '../api/title-api';

const EMPTY_TITLES: TitleDto[] = [];
const PAGE_KEY = 'title-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type TitleColumnKey = keyof TitleDto;

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function TitleManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['title-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<TitleDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<TitleColumnKey>('titleName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createTitle = useCreateTitle();
  const updateTitle = useUpdateTitle();
  const { data: statsData } = useTitleStats();

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
    setPageTitle(t('titleManagement.menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data: apiResponse, isLoading } = useTitleList({
    pageNumber: 1,
    pageSize: 10000,
  });

  const titles = useMemo<TitleDto[]>(
    () => apiResponse?.data ?? EMPTY_TITLES,
    [apiResponse?.data]
  );

  const filteredTitles = useMemo<TitleDto[]>(() => {
    if (!titles.length) return [];
    let result = [...titles];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          (c.titleName && c.titleName.toLowerCase().includes(lower)) ||
          (c.code && c.code.toLowerCase().includes(lower))
      );
    }
    result = applyTitleFilters(result, appliedFilterRows);
    return result;
  }, [titles, searchTerm, appliedFilterRows]);

  const sortedTitles = useMemo(() => {
    const result = [...filteredTitles];
    result.sort((a, b) => {
      const aVal = a[sortBy] != null ? String(a[sortBy]).toLowerCase() : '';
      const bVal = b[sortBy] != null ? String(b[sortBy]).toLowerCase() : '';
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredTitles, sortBy, sortDirection]);

  const totalCount = sortedTitles.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const currentPageRows = useMemo(
    () => sortedTitles.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [sortedTitles, pageNumber, pageSize]
  );

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as TitleColumnKey[];

  const filterColumns = useMemo(
    () =>
      TITLE_FILTER_COLUMNS.map((col) => ({
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
    const response = await titleApi.getList({ pageNumber: 1, pageSize: 10000 });
    const list = response?.data ?? [];
    return {
      columns: exportColumns,
      rows: list.map((c: TitleDto) => {
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
  }, [exportColumns, orderedVisibleColumns, i18n.language]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

  const handleAddClick = (): void => {
    setEditingTitle(null);
    setFormOpen(true);
  };

  const handleEdit = (title: TitleDto): void => {
    setEditingTitle(title);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setEditingTitle(null);
  };

  const handleFormSubmit = async (data: TitleFormSchema): Promise<void> => {
    if (editingTitle) {
      await updateTitle.mutateAsync({
        id: editingTitle.id,
        data: { titleName: data.titleName, code: data.code || undefined },
      });
    } else {
      await createTitle.mutateAsync({ titleName: data.titleName, code: data.code || undefined });
    }
    setFormOpen(false);
    setEditingTitle(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.list({ pageNumber: 1, pageSize: 10000 }) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
  };

  const columns = useMemo<DataTableGridColumn<TitleColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as TitleColumnKey,
        label: c.label,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  const cardStyle = `
    bg-white/60 dark:bg-[#1a1025]/40 
    hover:bg-white/90 dark:hover:bg-[#1a1025]/80
    border border-white/60 dark:border-white/5 
    shadow-sm hover:shadow-md 
    backdrop-blur-md 
    transition-all duration-300 
    hover:border-pink-500/30 
    group relative overflow-hidden
  `;

  const glowStyle = "absolute inset-0 bg-linear-to-r from-pink-50/0 to-orange-50/0 dark:from-pink-500/0 dark:to-orange-500/0 group-hover:from-pink-50/50 group-hover:to-orange-50/50 dark:group-hover:from-pink-500/5 dark:group-hover:to-orange-500/5 transition-all duration-500 pointer-events-none";

  const stats = [
    {
      title: t('titleManagement.stats.totalTitles'),
      value: statsData?.totalTitles || 0,
      icon: Users,
      iconContainerClass: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 border-pink-100 dark:border-pink-500/20',
    },
    {
      title: t('titleManagement.stats.activeTitles'),
      value: statsData?.activeTitles || 0,
      icon: Activity,
      iconContainerClass: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border-orange-100 dark:border-orange-500/20',
    },
    {
      title: t('titleManagement.stats.newThisMonth'),
      value: statsData?.newThisMonth || 0,
      icon: Calendar,
      iconContainerClass: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20',
    },
  ];

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('titleManagement.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('titleManagement.description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('titleManagement.addButton')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className={cardStyle}>
            <div className={glowStyle} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg shadow-sm border ${stat.iconContainerClass}`}>
                <stat.icon size={18} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-slate-800 dark:text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
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
            exportFileName="titles"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={filterColumns}
            defaultFilterColumn="titleName"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="title-management"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('titleManagement.search')}
            onSearchChange={setSearchTerm}
            leftSlot={
              <>
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
          <TitleTable
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
            loadingText={t('common.loading')}
            errorText={t('titleManagement.error', { defaultValue: 'Hata oluştu' })}
            emptyText={t('titleManagement.noData')}
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

      <TitleForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        title={editingTitle}
        isLoading={createTitle.isPending || updateTitle.isPending}
      />
    </div>
  );
}
