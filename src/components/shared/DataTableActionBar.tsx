import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { AdvancedFilter } from './AdvancedFilter';
import { ColumnPreferencesPopover, type ColumnDef } from './ColumnPreferencesPopover';
import { GridExportMenu } from './GridExportMenu';
import type { FilterColumnConfig, FilterRow } from '@/lib/advanced-filter-types';
import type { GridExportColumn } from '@/lib/grid-export';

export interface DataTableSearchConfig {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  minLength?: number;
  resetKey?: string | number;
}

export interface DataTableRefreshConfig {
  onRefresh: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  cooldownSeconds?: number;
  label?: string;
}

export interface DataTableActionBarProps {
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
  filterLogic?: 'and' | 'or';
  onFilterLogicChange?: (value: 'and' | 'or') => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  translationNamespace?: string;
  appliedFilterCount?: number;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchClassName?: string;
  search?: DataTableSearchConfig;
  refresh?: DataTableRefreshConfig;
  searchDebounceMs?: number;
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
  filterLogic,
  onFilterLogicChange,
  onApplyFilters,
  onClearFilters,
  translationNamespace = 'common',
  appliedFilterCount = 0,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  searchClassName = 'h-9 w-[200px]',
  search,
  refresh,
  searchDebounceMs = 700,
  leftSlot,
}: DataTableActionBarProps): ReactElement {
  const { t } = useTranslation([translationNamespace, 'common']);
  const MISSING_TRANSLATION = 'Çeviri eksik';
  const resolveAdvancedFilterTitle = (): string => {
    const featureTitle = t('advancedFilter.title', { ns: translationNamespace });
    if (featureTitle && featureTitle !== MISSING_TRANSLATION && featureTitle !== 'advancedFilter.title') return featureTitle;
    return t('advancedFilter.title', { ns: 'common' });
  };
  const [showFilters, setShowFilters] = useState(false);
  const [internalSearchValue, setInternalSearchValue] = useState(search?.defaultValue ?? '');
  const [legacyDisplayValue, setLegacyDisplayValue] = useState(searchValue ?? '');
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState<number | null>(null);
  const [refreshNow, setRefreshNow] = useState(() => Date.now());
  const lastEmittedLegacyRef = useRef(searchValue ?? '');

  const isSearchControlled = search?.value !== undefined;
  const useLegacySearch = Boolean(onSearchChange && !search);
  const legacyDebounceMs = searchDebounceMs;

  const debouncedLegacyValue = useDebouncedValue(legacyDisplayValue, legacyDebounceMs);

  useEffect(() => {
    if (!useLegacySearch) return;
    if (debouncedLegacyValue === lastEmittedLegacyRef.current) return;
    lastEmittedLegacyRef.current = debouncedLegacyValue;
    onSearchChange?.(debouncedLegacyValue);
  }, [debouncedLegacyValue, useLegacySearch, onSearchChange]);

  useEffect(() => {
    if (!useLegacySearch) return;
    if (searchValue === '') {
      setLegacyDisplayValue('');
      lastEmittedLegacyRef.current = '';
      return;
    }
    if (searchValue === lastEmittedLegacyRef.current) {
      setLegacyDisplayValue(searchValue);
    }
  }, [searchValue, useLegacySearch]);

  useEffect(() => {
    if (!search?.resetKey || isSearchControlled) return;
    setInternalSearchValue(search.defaultValue ?? '');
  }, [search?.resetKey, search?.defaultValue, isSearchControlled]);

  useEffect(() => {
    if (!refreshCooldownUntil) return;
    if (refreshCooldownUntil <= Date.now()) {
      setRefreshCooldownUntil(null);
      return;
    }

    const interval = window.setInterval(() => {
      setRefreshNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [refreshCooldownUntil]);

  const currentSearchValue = search
    ? (isSearchControlled ? (search.value ?? '') : internalSearchValue)
    : legacyDisplayValue;
  const debouncedSearchConfigValue = useDebouncedValue(currentSearchValue, search?.debounceMs ?? 700);
  const debouncedSearchValue = search ? debouncedSearchConfigValue : debouncedLegacyValue;
  const normalizedSearchValue = useMemo(() => {
    const trimmed = debouncedSearchValue.trim();
    if (!trimmed) return '';

    const minLength = Math.max(search?.minLength ?? 0, 0);
    return trimmed.length < minLength ? '' : trimmed;
  }, [debouncedSearchValue, search?.minLength]);

  const searchOnSearchChangeRef = useRef(search?.onSearchChange);
  searchOnSearchChangeRef.current = search?.onSearchChange;
  useEffect(() => {
    if (!searchOnSearchChangeRef.current) return;
    searchOnSearchChangeRef.current(normalizedSearchValue);
  }, [normalizedSearchValue]);

  const handleSearchInputChange = (value: string): void => {
    if (search) {
      if (!isSearchControlled) {
        setInternalSearchValue(value);
      }
      search.onValueChange?.(value);
      return;
    }
    setLegacyDisplayValue(value);
  };

  const resolvedSearchPlaceholderProp = search?.placeholder ?? searchPlaceholder;
  const resolvedSearchPlaceholder = resolvedSearchPlaceholderProp === MISSING_TRANSLATION
    ? t('search', { ns: 'common' })
    : resolvedSearchPlaceholderProp ?? t('search', { ns: 'common' });
  const resolvedSearchClassName = search?.className ?? searchClassName;
  const shouldRenderSearch = Boolean(search || onSearchChange);
  const refreshCooldownSeconds = Math.max(refresh?.cooldownSeconds ?? 60, 0);
  const refreshRemainingSeconds = refreshCooldownUntil == null
    ? 0
    : Math.max(0, Math.ceil((refreshCooldownUntil - refreshNow) / 1000));
  const isRefreshDisabled = Boolean(refresh?.disabled || refresh?.isLoading || refreshRemainingSeconds > 0);
  const refreshLabel = refresh?.label && refresh.label === MISSING_TRANSLATION ? t('refresh', { ns: 'common' }) : refresh?.label ?? t('refresh', { ns: 'common' });

  const handleRefresh = (): void => {
    if (!refresh || isRefreshDisabled) return;
    refresh.onRefresh();
    if (refreshCooldownSeconds > 0) {
      setRefreshCooldownUntil(Date.now() + refreshCooldownSeconds * 1000);
      setRefreshNow(Date.now());
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {shouldRenderSearch && (
          <Input
            placeholder={resolvedSearchPlaceholder}
            value={currentSearchValue}
            onChange={(event) => handleSearchInputChange(event.target.value)}
            className={resolvedSearchClassName}
          />
        )}
        {refresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshDisabled}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refresh?.isLoading ? 'animate-spin' : ''}`} />
            {refreshRemainingSeconds > 0 ? `${refreshLabel} (${refreshRemainingSeconds}s)` : refreshLabel}
          </Button>
        )}
        {leftSlot}
      </div>
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
                {resolveAdvancedFilterTitle()}
              </h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label={t('common.close')}
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
                filterLogic={filterLogic}
                onFilterLogicChange={onFilterLogicChange}
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
