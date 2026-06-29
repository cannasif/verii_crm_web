'use client';

import { type ReactElement, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Loader2, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { normalizeSearchValue } from '@/lib/search';
import { getCatalogFieldLabel } from '@/lib/catalog-field-labels';
import { useSystemSettingsStore } from '@/stores/system-settings-store';
import {
  CATALOG_FILTER_DIMENSIONS,
  type CatalogFilterDimension,
  type CatalogSpecialCodeOption,
  type CatalogSpecialCodeSelections,
} from './catalog-special-code-filter';

type CatalogSpecialCodeFilterPanelProps = {
  selections: CatalogSpecialCodeSelections;
  optionsByLevel: Record<CatalogFilterDimension, CatalogSpecialCodeOption[]>;
  isLoadingOptions: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  areOptionsServerFiltered?: boolean;
  onToggle: (dimension: CatalogFilterDimension, value: string) => void;
  onClear: () => void;
};

function optionMatchesFilterSearch(option: CatalogSpecialCodeOption, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }
  const label = normalizeSearchValue(option.label);
  const value = normalizeSearchValue(option.value);
  return label.includes(normalizedQuery) || value.includes(normalizedQuery);
}

function buildInitialExpandedState(): Record<CatalogFilterDimension, boolean> {
  return {
    grupKodu: true,
    kod1: false,
    kod2: false,
    kod3: false,
    kod4: false,
    kod5: false,
  };
}

export function CatalogSpecialCodeFilterPanel({
  selections,
  optionsByLevel,
  isLoadingOptions,
  searchValue,
  onSearchChange,
  areOptionsServerFiltered = false,
  onToggle,
  onClear,
}: CatalogSpecialCodeFilterPanelProps): ReactElement {
  const { t } = useTranslation('common');
  const systemSettings = useSystemSettingsStore((state) => state.settings);
  const [internalFilterSearch, setInternalFilterSearch] = useState('');
  const [expandedByDimension, setExpandedByDimension] =
    useState<Record<CatalogFilterDimension, boolean>>(buildInitialExpandedState);
  const filterSearch = searchValue ?? internalFilterSearch;

  const normalizedFilterSearch = useMemo(
    () => normalizeSearchValue(filterSearch.trim()),
    [filterSearch],
  );

  const hasAnySelection = useMemo(
    () => CATALOG_FILTER_DIMENSIONS.some((dimension) => selections[dimension].length > 0),
    [selections],
  );

  const filteredOptionsByLevel = useMemo((): Record<CatalogFilterDimension, CatalogSpecialCodeOption[]> => {
    const result = {} as Record<CatalogFilterDimension, CatalogSpecialCodeOption[]>;
    for (const dimension of CATALOG_FILTER_DIMENSIONS) {
      result[dimension] = areOptionsServerFiltered
        ? optionsByLevel[dimension]
        : optionsByLevel[dimension].filter((option) =>
            optionMatchesFilterSearch(option, normalizedFilterSearch),
          );
    }
    return result;
  }, [areOptionsServerFiltered, optionsByLevel, normalizedFilterSearch]);

  const toggleDimensionExpanded = useCallback((dimension: CatalogFilterDimension): void => {
    setExpandedByDimension((prev) => ({ ...prev, [dimension]: !prev[dimension] }));
  }, []);

  const handleFilterSearchChange = useCallback(
    (value: string): void => {
      onSearchChange?.(value);
      if (searchValue === undefined) {
        setInternalFilterSearch(value);
      }
    },
    [onSearchChange, searchValue],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2 px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          {t('catalogStockPicker.specialCodesPanelTitle')}
        </p>
        {hasAnySelection ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 rounded-lg px-2 text-[10px] text-slate-600 hover:text-pink-600 dark:text-slate-300 dark:hover:text-pink-200"
            onClick={onClear}
          >
            <RotateCcw className="mr-1 h-3 w-3" aria-hidden />
            {t('catalogStockPicker.specialCodesClear')}
          </Button>
        ) : null}
      </div>

      <div className="relative shrink-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-pink-500/75 dark:text-pink-400/75"
          aria-hidden
        />
        <Input
          value={filterSearch}
          onChange={(e) => handleFilterSearchChange(e.target.value)}
          placeholder={t('catalogStockPicker.specialCodesFilterSearchPlaceholder')}
          className="h-10 rounded-2xl border border-slate-200/95 bg-white pl-9 text-xs text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-500 focus-visible:border-pink-400/50 focus-visible:ring-pink-500/15 dark:border-white/12 dark:bg-zinc-900/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-pink-500/40 sm:pl-10 sm:text-[13px]"
        />
      </div>

      <p className="shrink-0 px-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        {t('catalogStockPicker.specialCodesPanelHint')}
      </p>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
        {CATALOG_FILTER_DIMENSIONS.map((dimension, index) => {
          const options = filteredOptionsByLevel[dimension];
          const totalInDimension = optionsByLevel[dimension].length;
          const selectedSet = new Set(selections[dimension]);
          const levelLabel = getCatalogFieldLabel(systemSettings, dimension, t);
          const isExpanded =
            normalizedFilterSearch.length > 0
              ? options.length > 0
              : expandedByDimension[dimension];
          const sectionId = `catalog-code-section-${dimension}`;

          return (
            <section
              key={dimension}
              className="overflow-hidden rounded-xl border border-slate-300/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
            >
              <button
                type="button"
                onClick={() => toggleDimensionExpanded(dimension)}
                aria-expanded={isExpanded}
                aria-controls={sectionId}
                className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition-colors hover:bg-slate-50/90 dark:hover:bg-white/[0.04]"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-pink-700 dark:text-pink-300">
                  {levelLabel}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {selectedSet.size > 0 ? (
                    <span className="rounded-full bg-pink-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-pink-700 dark:text-pink-200">
                      {t('catalogStockPicker.specialCodesSelectedCount', { count: selectedSet.size })}
                    </span>
                  ) : null}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400',
                      isExpanded && 'rotate-180',
                    )}
                    aria-hidden
                  />
                </span>
              </button>

              {isExpanded ? (
                <div id={sectionId} className="border-t border-slate-200/90 px-2.5 pb-2.5 pt-1 dark:border-white/[0.06]">
                  {isLoadingOptions && index === 0 ? (
                    <div className="flex items-center gap-2 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-500" aria-hidden />
                      {t('catalogStockPicker.specialCodesLoadingOptions')}
                    </div>
                  ) : totalInDimension === 0 ? (
                    <p className="py-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {t('catalogStockPicker.specialCodesNoOptions')}
                    </p>
                  ) : options.length === 0 ? (
                    <p className="py-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {t('catalogStockPicker.specialCodesSearchEmpty')}
                    </p>
                  ) : (
                    <ul className="max-h-[min(28vh,220px)] space-y-0.5 overflow-y-auto">
                      {options.map((option) => {
                        const checked = selectedSet.has(option.value);
                        const inputId = `catalog-special-code-${dimension}-${option.value}`;
                        return (
                          <li key={`${dimension}-${option.value}`}>
                            <label
                              htmlFor={inputId}
                              className={cn(
                                'flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition-colors',
                                checked
                                  ? 'bg-pink-50 dark:bg-pink-500/10'
                                  : 'hover:bg-slate-50 dark:hover:bg-white/[0.05]',
                              )}
                            >
                              <Checkbox
                                id={inputId}
                                checked={checked}
                                onCheckedChange={() => onToggle(dimension, option.value)}
                                className="mt-0.5"
                              />
                              <span className="min-w-0 flex-1 text-[12px] leading-snug text-slate-800 dark:text-slate-100">
                                {option.label}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {!hasAnySelection ? (
        <p className="shrink-0 rounded-lg border border-dashed border-slate-300/90 bg-slate-50/80 px-2.5 py-2 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
          {t('catalogStockPicker.specialCodesPickHint')}
        </p>
      ) : null}
    </div>
  );
}
