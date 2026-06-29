import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchX, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDropdownInfiniteSearch } from '@/hooks/useDropdownInfiniteSearch';
import { dropdownApi } from '@/components/shared/dropdown/dropdown-api';
import {
  DROPDOWN_MIN_CHARS,
  DROPDOWN_PAGE_SIZE,
  DROPDOWN_SCROLL_THRESHOLD,
} from '@/components/shared/dropdown/constants';
import { useCustomerComboListKeyboard } from '@/components/shared/useCustomerComboListKeyboard';
import type { ProductSelectionResult } from '@/components/shared/ProductSelectDialog';
import {
  RelatedStocksSelectionDialog,
  type RelatedStockSelectionConfirmItem,
} from '@/components/shared/RelatedStocksSelectionDialog';
import type { StockGetDto } from '@/features/stock/types';
import { dedupeStocksByErpStockCode } from '@/features/stock/utils/dedupe-stocks-by-erp-code';
import { getLocalizedStockName } from '@/features/stock/utils/localized-stock-name';
import { getCatalogFieldLabel } from '@/lib/catalog-field-labels';
import { cn } from '@/lib/utils';
import { useSystemSettingsStore } from '@/stores/system-settings-store';

const INLINE_STOCK_SEARCH_DEBOUNCE_MS = 400;

export interface LineFormStockSearchFieldProps {
  productCode: string;
  onSelectResult: (product: ProductSelectionResult) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  inputClassName?: string;
}

export function LineFormStockSearchField({
  productCode,
  onSelectResult,
  disabled = false,
  placeholder,
  inputClassName,
}: LineFormStockSearchFieldProps): ReactElement {
  const { t, i18n } = useTranslation('common');
  const systemSettings = useSystemSettingsStore((state) => state.settings);
  const [draftQuery, setDraftQuery] = useState(productCode || '');
  const [stockPopoverOpen, setStockPopoverOpen] = useState(false);
  const [relatedDialogOpen, setRelatedDialogOpen] = useState(false);
  const [pendingRelatedStock, setPendingRelatedStock] = useState<StockGetDto | null>(null);
  const [pickBusy, setPickBusy] = useState(false);
  const pickBusyRef = useRef(false);
  const listScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftQuery(productCode || '');
  }, [productCode]);

  const debouncedSearch = useDebouncedValue(draftQuery, INLINE_STOCK_SEARCH_DEBOUNCE_MS);

  const stocksDropdown = useDropdownInfiniteSearch<StockGetDto>({
    entityKey: ['line-form-inline-stock'] as const,
    searchTerm: debouncedSearch,
    enabled: stockPopoverOpen && !disabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'desc',
    buildFilters: () => undefined,
    fetchPage: dropdownApi.getStockPage,
  });

  const visibleStocks = useMemo(
    () => dedupeStocksByErpStockCode(stocksDropdown.items),
    [stocksDropdown.items],
  );

  const handleListScroll = (event: React.UIEvent<HTMLDivElement>): void => {
    if (!stocksDropdown.hasNextPage || stocksDropdown.isFetchingNextPage) {
      return;
    }
    const target = event.currentTarget;
    if (target.scrollHeight <= 0) {
      return;
    }
    const scrollProgress = (target.scrollTop + target.clientHeight) / target.scrollHeight;
    if (scrollProgress >= DROPDOWN_SCROLL_THRESHOLD) {
      void stocksDropdown.fetchNextPage();
    }
  };

  const applyPlainStock = useCallback(async (stock: StockGetDto): Promise<void> => {
    if (pickBusyRef.current) {
      return;
    }
    pickBusyRef.current = true;
    setPickBusy(true);
    try {
      await onSelectResult({
        id: stock.id,
        code: stock.erpStockCode,
        name: getLocalizedStockName(stock, i18n.language),
        unit: stock.unit,
        groupCode: stock.grupKodu,
      });
      setStockPopoverOpen(false);
    } finally {
      pickBusyRef.current = false;
      setPickBusy(false);
    }
  }, [onSelectResult, i18n.language]);

  const handlePickStock = useCallback(
    async (stock: StockGetDto): Promise<void> => {
      if (pickBusyRef.current) {
        return;
      }
      const relations = stock.parentRelations;
      if (relations && relations.length > 0) {
        setPendingRelatedStock(stock);
        setStockPopoverOpen(false);
        setRelatedDialogOpen(true);
        return;
      }
      await applyPlainStock(stock);
    },
    [applyPlainStock],
  );

  const handleRelatedConfirm = async (selection: RelatedStockSelectionConfirmItem[]): Promise<void> => {
    if (!pendingRelatedStock || pickBusyRef.current) {
      return;
    }
    const relatedStockIds = selection.map((item) => item.relatedStockId);
    const relatedStockQuantitiesById: Record<number, number> = {};
    for (const item of selection) {
      relatedStockQuantitiesById[item.relatedStockId] = item.quantityPerMain;
    }
    pickBusyRef.current = true;
    setPickBusy(true);
    try {
      await onSelectResult({
        id: pendingRelatedStock.id,
        code: pendingRelatedStock.erpStockCode,
        name: getLocalizedStockName(pendingRelatedStock, i18n.language),
        unit: pendingRelatedStock.unit,
        groupCode: pendingRelatedStock.grupKodu,
        relatedStockIds,
        relatedStockQuantitiesById,
      });
      setRelatedDialogOpen(false);
      setPendingRelatedStock(null);
    } finally {
      pickBusyRef.current = false;
      setPickBusy(false);
    }
  };

  const stockKeyboard = useCustomerComboListKeyboard({
    readOnly: Boolean(disabled),
    filterKey: draftQuery,
    filteredOptions: visibleStocks,
    comboboxOpen: stockPopoverOpen,
    setComboboxOpen: setStockPopoverOpen,
    onSelectOption: (stock) => {
      void handlePickStock(stock);
    },
  });

  useEffect(() => {
    if (!stockPopoverOpen || stockKeyboard.highlightIndex < 0) {
      return;
    }
    const root = listScrollRef.current;
    if (!root) {
      return;
    }
    window.requestAnimationFrame(() => {
      const active = root.querySelector('[data-kb-stock-active="true"]');
      if (active instanceof HTMLElement) {
        active.scrollIntoView({ block: 'nearest' });
      }
    });
  }, [stockKeyboard.highlightIndex, stockPopoverOpen]);

  const minCharsHint = t('dropdown.minCharsHint', {
    count: DROPDOWN_MIN_CHARS,
    defaultValue: `Minimum ${DROPDOWN_MIN_CHARS} characters`,
  });
  const resolvedPlaceholder = useMemo(() => {
    if (placeholder) {
      return placeholder;
    }

    const groupLabel = getCatalogFieldLabel(systemSettings, 'grupKodu', t);
    const code1Label = getCatalogFieldLabel(systemSettings, 'kod1', t);
    const code2Label = getCatalogFieldLabel(systemSettings, 'kod2', t);

    return t('lineFormStockSearch.searchPlaceholderWithLabels', {
      group: groupLabel,
      code1: code1Label,
      code2: code2Label,
      defaultValue: `Stok kodu, stok adı, ${code1Label}, ${code2Label} ve ${groupLabel} ile ara...`,
    });
  }, [placeholder, systemSettings, t]);

  return (
    <>
      <div className="relative min-w-0 flex-1">
        <Input
          type="text"
          autoComplete="off"
          value={draftQuery}
          disabled={disabled}
          placeholder={resolvedPlaceholder}
          onChange={(e) => {
            const v = e.target.value;
            setDraftQuery(v);
            setStockPopoverOpen(v.trim().length > 0);
          }}
          onKeyDown={stockKeyboard.onInputKeyDown}
          className={cn(
            'h-11 rounded-xl border-slate-200 bg-white font-mono text-sm text-slate-900 shadow-sm dark:border-white/10 dark:bg-[#0f0a18] dark:text-white',
            inputClassName,
          )}
        />
        <Popover open={stockPopoverOpen} onOpenChange={setStockPopoverOpen}>
          <PopoverTrigger asChild>
            <div className="absolute top-full left-0 h-0 w-full" />
          </PopoverTrigger>
          <PopoverContent
            className="w-[min(96vw,560px)] max-w-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-[#130822]"
            align="start"
            sideOffset={8}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onWheel={(e) => e.stopPropagation()}
          >
            <Command shouldFilter={false}>
              <div
                ref={listScrollRef}
                className="max-h-[min(60vh,360px)] overflow-y-auto"
                onScroll={handleListScroll}
              >
                <CommandList className="p-2">
                  {stocksDropdown.isThresholdMode && draftQuery.trim().length > 0 ? (
                    <div className="px-2 py-2 text-center text-xs text-amber-600 dark:text-amber-400">
                      {minCharsHint}
                    </div>
                  ) : null}
                  {stocksDropdown.isLoading && visibleStocks.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('productSelectDialog.loading')}
                    </div>
                  ) : null}
                  {!stocksDropdown.isLoading && visibleStocks.length === 0 ? (
                    <CommandEmpty className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                      <SearchX className="h-5 w-5 text-slate-400" />
                      <span>{draftQuery.trim() ? t('productSelectDialog.noResults') : t('productSelectDialog.noProducts')}</span>
                    </CommandEmpty>
                  ) : null}
                  <CommandGroup>
                    {visibleStocks.map((stock, index) => (
                      <CommandItem
                        key={stock.id}
                        value={`${stock.id}-${stock.erpStockCode}`}
                        data-kb-stock-active={stockKeyboard.isOptionKeyboardActive(index) ? 'true' : undefined}
                        disabled={pickBusy}
                        onSelect={() => {
                          void handlePickStock(stock);
                        }}
                        className={cn(
                          'mb-1 cursor-pointer rounded-xl px-3 py-2.5 transition-colors',
                          'data-[selected=true]:bg-rose-50 dark:data-[selected=true]:bg-rose-950/20',
                          stockKeyboard.isOptionKeyboardActive(index) &&
                          'ring-2 ring-rose-500 ring-offset-2 ring-offset-white dark:ring-offset-[#130822]',
                        )}
                      >
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-mono text-xs font-semibold text-pink-700 dark:text-pink-300">
                            {stock.erpStockCode}
                          </span>
                          <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {getLocalizedStockName(stock, i18n.language)}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {stocksDropdown.isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t('loading')}
                    </div>
                  ) : null}
                </CommandList>
              </div>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <RelatedStocksSelectionDialog
        open={relatedDialogOpen}
        onOpenChange={(open) => {
          setRelatedDialogOpen(open);
          if (!open) {
            setPendingRelatedStock(null);
          }
        }}
        relatedStocks={pendingRelatedStock?.parentRelations ?? []}
        onConfirm={handleRelatedConfirm}
      />
    </>
  );
}
