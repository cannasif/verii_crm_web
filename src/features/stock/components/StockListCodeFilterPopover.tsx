import { type ReactElement, useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CatalogSpecialCodeFilterPanel } from '@/components/shared/CatalogSpecialCodeFilterPanel';
import {
  CATALOG_FILTER_DIMENSIONS,
  clearSpecialCodeSelections,
  toggleSpecialCodeValue,
  type CatalogFilterDimension,
  type CatalogSpecialCodeOption,
  type CatalogSpecialCodeSelections,
} from '@/components/shared/catalog-special-code-filter';
import { stockApi } from '../api/stock-api';

type StockListCodeFilterPopoverProps = {
  draftSelections: CatalogSpecialCodeSelections;
  onDraftSelectionsChange: (next: CatalogSpecialCodeSelections) => void;
  appliedSelections: CatalogSpecialCodeSelections;
  onApply: () => void;
  onClearApplied: () => void;
};

function countSelectedValues(selections: CatalogSpecialCodeSelections): number {
  return CATALOG_FILTER_DIMENSIONS.reduce((sum, dimension) => sum + selections[dimension].length, 0);
}

export function StockListCodeFilterPopover({
  draftSelections,
  onDraftSelectionsChange,
  appliedSelections,
  onApply,
  onClearApplied,
}: StockListCodeFilterPopoverProps): ReactElement {
  const { t } = useTranslation(['stock', 'common']);
  const [open, setOpen] = useState(false);
  const [optionSearch, setOptionSearch] = useState('');
  const deferredOptionSearch = useDeferredValue(optionSearch);

  const handleOpenChange = (nextOpen: boolean): void => {
    if (nextOpen) {
      onDraftSelectionsChange({
        grupKodu: [...appliedSelections.grupKodu],
        kod1: [...appliedSelections.kod1],
        kod2: [...appliedSelections.kod2],
        kod3: [...appliedSelections.kod3],
        kod4: [...appliedSelections.kod4],
        kod5: [...appliedSelections.kod5],
      });
    }
    if (!nextOpen) {
      setOptionSearch('');
    }
    setOpen(nextOpen);
  };

  const appliedCount = useMemo(() => countSelectedValues(appliedSelections), [appliedSelections]);
  const draftDirty = useMemo(() => {
    return CATALOG_FILTER_DIMENSIONS.some(
      (dimension) =>
        draftSelections[dimension].join('|') !== appliedSelections[dimension].join('|'),
    );
  }, [appliedSelections, draftSelections]);

  const codeFilterOptionsQuery = useQuery({
    queryKey: ['stock-list-code-filter-options', deferredOptionSearch],
    queryFn: () =>
      stockApi.getCodeFilterOptions({
        search: deferredOptionSearch,
        pageSize: 150,
      }),
    staleTime: 300_000,
    gcTime: 600_000,
  });

  const optionsByLevel = useMemo(() => {
    const options = codeFilterOptionsQuery.data;
    const result = {} as Record<CatalogFilterDimension, CatalogSpecialCodeOption[]>;
    for (const dimension of CATALOG_FILTER_DIMENSIONS) {
      result[dimension] = options?.[dimension] ?? [];
    }
    return result;
  }, [codeFilterOptionsQuery.data]);

  const handleToggle = (dimension: CatalogFilterDimension, value: string): void => {
    onDraftSelectionsChange(toggleSpecialCodeValue(draftSelections, dimension, value));
  };

  const handleClearDraft = (): void => {
    onDraftSelectionsChange(clearSpecialCodeSelections());
  };

  const handleApply = (): void => {
    onApply();
    setOpen(false);
  };

  const handleClearAll = (): void => {
    handleClearDraft();
    onClearApplied();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={appliedCount > 0 ? 'default' : 'outline'}
          size="sm"
          className={`h-9 border-dashed border-slate-300 text-xs sm:text-sm dark:border-white/20 ${
            appliedCount > 0
              ? 'border-primary/30 bg-primary/15 text-primary hover:bg-primary/20 dark:text-primary/80'
              : 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
          }`}
        >
          <Filter className="mr-2 h-4 w-4" />
          {t('list.codeFilters', { defaultValue: 'Kod filtreleri' })}
          {appliedCount > 0 ? (
            <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
              {appliedCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="flex w-[min(420px,95vw)] max-h-[min(72vh,560px)] flex-col overflow-hidden rounded-2xl p-0"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/90 p-3 dark:border-white/10">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('common:catalogStockPicker.specialCodesPanelTitle')}
          </h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white"
            aria-label={t('common:common.close')}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="flex h-[min(52vh,400px)] flex-col p-3">
          <CatalogSpecialCodeFilterPanel
            selections={draftSelections}
            optionsByLevel={optionsByLevel}
            isLoadingOptions={codeFilterOptionsQuery.isLoading}
            searchValue={optionSearch}
            onSearchChange={setOptionSearch}
            areOptionsServerFiltered
            onToggle={handleToggle}
            onClear={handleClearDraft}
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200/90 p-3 dark:border-white/10">
          <Button type="button" variant="ghost" size="sm" onClick={handleClearAll}>
            {t('common:catalogStockPicker.specialCodesClear')}
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-primary text-white hover:opacity-90 dark:bg-primary dark:hover:bg-primary"
            onClick={handleApply}
            disabled={!draftDirty}
          >
            {t('list.applyCodeFilters', { defaultValue: 'Uygula' })}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
