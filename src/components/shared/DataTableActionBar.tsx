import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AdvancedFilter } from './AdvancedFilter';
import { ColumnPreferencesPopover, type ColumnDef } from './ColumnPreferencesPopover';
import { GridExportMenu } from './GridExportMenu';
import type { FilterColumnConfig, FilterRow } from '@/lib/advanced-filter-types';
import type { GridExportColumn } from '@/lib/grid-export';

interface DataTableActionBarProps {
  pageKey: string;
  userId?: number;
  columns: ColumnDef[];
  visibleColumns: string[];
  columnOrder: string[];
  onVisibleColumnsChange: (visible: string[]) => void;
  onColumnOrderChange: (order: string[]) => void;
  exportFileName: string;
  exportColumns: GridExportColumn[];
  exportRows: Record<string, unknown>[];
  getExportData?: () => Promise<{ columns: GridExportColumn[]; rows: Record<string, unknown>[] }>;
  filterColumns: readonly FilterColumnConfig[];
  defaultFilterColumn: string;
  draftFilterRows: FilterRow[];
  onDraftFilterRowsChange: (rows: FilterRow[]) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  translationNamespace?: string;
  appliedFilterCount?: number;
  leftSlot?: React.ReactNode;
}

export function DataTableActionBar({
  pageKey,
  userId,
  columns,
  visibleColumns,
  columnOrder,
  onVisibleColumnsChange,
  onColumnOrderChange,
  exportFileName,
  exportColumns,
  exportRows,
  getExportData,
  filterColumns,
  defaultFilterColumn,
  draftFilterRows,
  onDraftFilterRowsChange,
  onApplyFilters,
  onClearFilters,
  translationNamespace = 'common',
  appliedFilterCount = 0,
  leftSlot,
}: DataTableActionBarProps): ReactElement {
  const { t } = useTranslation([translationNamespace, 'common']);
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">{leftSlot}</div>
      <div className="flex items-center gap-2">
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button
              variant={appliedFilterCount > 0 ? 'default' : 'outline'}
              size="sm"
              className={`h-9 border-dashed border-slate-300 dark:border-white/20 text-xs sm:text-sm ${
                appliedFilterCount > 0
                  ? 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30 hover:bg-pink-500/30'
                  : 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <Filter className="mr-2 h-4 w-4" />
              {t('filters', { ns: 'common' })}
              {appliedFilterCount > 0 && (
                <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  {appliedFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" className="w-[560px] max-w-[95vw] p-0 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-white/5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('advancedFilter.title', { ns: translationNamespace, defaultValue: t('advancedFilter.title', { ns: 'common' }) })}
              </h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label={t('common.close', { ns: 'common', defaultValue: 'Close' })}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-[420px]">
              <AdvancedFilter
                columns={filterColumns}
                defaultColumn={defaultFilterColumn}
                draftRows={draftFilterRows}
                onDraftRowsChange={onDraftFilterRowsChange}
                onSearch={() => {
                  onApplyFilters();
                  setShowFilters(false);
                }}
                onClear={onClearFilters}
                translationNamespace={translationNamespace}
                embedded
              />
            </div>
          </PopoverContent>
        </Popover>

        <ColumnPreferencesPopover
          pageKey={pageKey}
          userId={userId}
          columns={columns}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
          onVisibleColumnsChange={onVisibleColumnsChange}
          onColumnOrderChange={onColumnOrderChange}
        />

        <GridExportMenu fileName={exportFileName} columns={exportColumns} rows={exportRows} getExportData={getExportData} translationNamespace={translationNamespace} />
      </div>
    </div>
  );
}
