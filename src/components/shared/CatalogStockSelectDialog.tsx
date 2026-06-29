'use client';

import { type ReactElement, type Ref, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Flame,
  FolderTree,
  LayoutGrid,
  List,
  ListFilter,
  MinusCircle,
  Package,
  PlusCircle,
  RotateCcw,
  Loader2,
  PackageSearch,
  Search,
  ShoppingBag,
  Star,
  Sparkles,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { categoryDefinitionsApi } from '@/features/category-definitions/api/category-definitions-api';
import {
  buildAncestorChainFromRoot,
  buildCategoryIdIndex,
  fetchCatalogCategoryTreeFlat,
  filterCategoryNodesForClientSearch,
  MAX_CATEGORY_CLIENT_SEARCH_RESULTS,
  tokenizeCategorySearchQuery,
} from '@/features/category-definitions/utils/catalog-category-tree-client';
import type {
  CatalogCategoryNodeDto,
  CatalogStockItemDto,
  ProductCatalogDto,
} from '@/features/category-definitions/types/category-definition-types';
import { matchesSearchTerm, normalizeSearchValue } from '@/lib/search';
import { stockMatchesDraftSnapshot, type ProductSelectionResult } from './ProductSelectDialog';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { stockApi } from '@/features/stock/api/stock-api';
import { StockWarehouseBalanceBadge } from '@/features/stock/components/StockWarehouseBalanceBadge';
import type { StockGetDto, StockGetWithMainImageDto, StockRelationDto } from '@/features/stock/types';
import { getImageUrl } from '@/features/stock/utils/image-url';
import { getLocalizedStockName, getLocalizedStockSearchTerms } from '@/features/stock/utils/localized-stock-name';
import { dedupeStocksByErpStockCode } from '@/features/stock/utils/dedupe-stocks-by-erp-code';
import {
  fetchPricingRuleCampaignStockData,
  type PricingRuleCampaignLineDisplay,
} from '@/features/pricing-rule/utils/fetch-pricing-rule-campaign-stock-codes';
import type { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { formatSystemCurrency, getSystemCurrency } from '@/lib/system-settings';
import { getCatalogFieldLabel } from '@/lib/catalog-field-labels';
import { useSystemSettingsStore } from '@/stores/system-settings-store';
import { RelatedStocksSelectionDialog, type RelatedStockSelectionConfirmItem } from './RelatedStocksSelectionDialog';
import { CatalogSpecialCodeFilterPanel } from './CatalogSpecialCodeFilterPanel';
import {
  CATALOG_SPECIAL_CODE_FACET_POOL_SIZE,
  clearSpecialCodeSelections,
  EMPTY_SPECIAL_CODE_SELECTIONS,
  CATALOG_FILTER_DIMENSIONS,
  extractFilterDimensionOptions,
  hasSpecialCodeSelection,
  toggleSpecialCodeValue,
  type CatalogFilterDimension,
  type CatalogSpecialCodeOption,
  type CatalogSpecialCodeSelections,
} from './catalog-special-code-filter';

interface CatalogStockSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: ProductSelectionResult) => void | Promise<void>;
  onMultiSelect?: (results: ProductSelectionResult[]) => void | Promise<void>;
  multiSelect?: boolean;
  initialSelectedResults?: ProductSelectionResult[];
  /** Belgedeki mevcut satır stokları — “Satırda” rozeti */
  existingLineStockMarkers?: ProductSelectionResult[];
  pricingRuleType: PricingRuleType;
  pricingRuleCustomerId?: number | null;
  pricingRuleErpCustomerCode?: string | null;
}

function mapStockGetToCatalogItem(stock: StockGetDto): CatalogStockItemDto {
  const stockWithMainImage = stock as StockGetWithMainImageDto;
  const primary = stockWithMainImage.mainImage ?? stock.stockImages?.find((img) => img.isPrimary) ?? stock.stockImages?.[0];
  return {
    id: stock.id,
    stockCategoryId: 0,
    stockId: stock.id,
    erpStockCode: stock.erpStockCode ?? '',
    stockName: stock.stockName ?? '',
    englishStockName: stock.englishStockName ?? null,
    unit: stock.unit,
    grupKodu: stock.grupKodu,
    grupAdi: stock.grupAdi,
    kod1: stock.kod1,
    kod1Adi: stock.kod1Adi,
    kod2: stock.kod2,
    kod2Adi: stock.kod2Adi,
    kod3: stock.kod3,
    kod3Adi: stock.kod3Adi,
    isPrimaryCategory: true,
    isFavorite: false,
    favoriteId: null,
    imageUrl: primary?.filePath ?? null,
  };
}

function toCatalogStockApiSearch(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = normalizeSearchValue(trimmed);
  return normalized.length > 0 ? normalized : trimmed;
}

function normalizeCampaignCurrency(currencyCode: string | number): string {
  const raw = String(currencyCode ?? '').trim();
  if (raw === '' || /^\d+$/.test(raw)) {
    return getSystemCurrency();
  }
  return raw.length >= 3 ? raw.slice(0, 3).toUpperCase() : getSystemCurrency();
}

function deriveReferenceUnitPriceFromDiscountedNet(
  net: number,
  r1: number,
  r2: number,
  r3: number,
): number | null {
  let denom = 1;
  for (const r of [r1, r2, r3]) {
    if (r > 0.0001) {
      const f = 1 - r / 100;
      if (f <= 0.001 || f >= 1) {
        return null;
      }
      denom *= f;
    }
  }
  if (denom >= 0.999) {
    return null;
  }
  const ref = net / denom;
  if (!Number.isFinite(ref) || ref <= net) {
    return null;
  }
  return ref;
}

function formatDiscountRateChip(rate: number): string {
  const rounded =
    Math.abs(rate - Math.round(rate)) < 0.05 ? Math.round(rate) : Math.round(rate * 10) / 10;
  return `%${rounded}`;
}

function formatPositiveDiscountRatesSummary(line: PricingRuleCampaignLineDisplay): string {
  const parts: string[] = [];
  for (const r of [line.discountRate1, line.discountRate2, line.discountRate3]) {
    if (r > 0.0001) {
      parts.push(formatDiscountRateChip(r));
    }
  }
  return parts.join(' + ');
}

type CatalogCampaignPricingRowProps = {
  line: PricingRuleCampaignLineDisplay | undefined;
};

function CatalogCampaignPricingRow({ line }: CatalogCampaignPricingRowProps): ReactElement | null {
  const { t } = useTranslation('common');
  if (!line) {
    return null;
  }
  const currency = normalizeCampaignCurrency(line.currencyCode);
  const fixed = line.fixedUnitPrice;
  const ratesSummary = formatPositiveDiscountRatesSummary(line);
  const hasPositiveRates = ratesSummary.length > 0;
  const refPrice =
    fixed != null && Number.isFinite(fixed)
      ? deriveReferenceUnitPriceFromDiscountedNet(
        fixed,
        line.discountRate1,
        line.discountRate2,
        line.discountRate3,
      )
      : null;
  const showFixed = fixed != null && Number.isFinite(fixed);

  if (!showFixed && !hasPositiveRates) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative mt-1 w-full max-w-full text-[11px] leading-snug',
        hasPositiveRates && 'crm-pe-8',
      )}
    >
      {hasPositiveRates ? (
        <span className="absolute crm-end-0 top-0 z-[1] rounded-sm border border-red-600/35 bg-red-600/[0.09] px-[3px] py-px text-[6.5px] font-bold uppercase leading-none tracking-wide text-red-700 shadow-sm dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-300">
          {t('catalogStockPicker.campaignPromoLabel')}
        </span>
      ) : null}
      {(refPrice != null && fixed != null) || showFixed ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {refPrice != null && fixed != null ? (
            <span className="text-slate-400 line-through decoration-slate-400/80 dark:text-slate-500">
              {formatSystemCurrency(refPrice, currency)}
            </span>
          ) : null}
          {showFixed ? (
            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatSystemCurrency(fixed!, currency)}
            </span>
          ) : null}
        </div>
      ) : null}
      {hasPositiveRates ? (
        <div className="mt-1 flex max-w-full">
          <span className="inline-flex max-w-full shrink items-center rounded-full border border-red-500/45 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold leading-tight text-red-900 dark:border-red-400/40 dark:bg-red-950/35 dark:text-red-100">
            {t('catalogStockPicker.campaignDiscountBadge', { rates: ratesSummary })}
          </span>
        </div>
      ) : null}
    </div>
  );
}

type CampaignStocksQueryData = {
  items: CatalogStockItemDto[];
  pricingByCodeLower: Record<string, PricingRuleCampaignLineDisplay>;
};

type FavoriteStocksQueryData = {
  items: CatalogStockItemDto[];
  totalCount: number;
  hasNextPage: boolean;
};

const PAGE_SIZE = 24;
const EMPTY_CATALOG_STOCK_ROWS: CatalogStockItemDto[] = [];

type CatalogSessionPick = {
  pickId: string;
  result: ProductSelectionResult;
};

type CatalogStockBrowseMode = 'category' | 'specialCodes' | 'campaign' | 'favorites';

type CatalogLeftPanelMode = 'catalog' | 'code';

function appendUniqueCatalogStockItems(
  previous: CatalogStockItemDto[],
  nextPage: CatalogStockItemDto[],
  pageNumber: number,
): CatalogStockItemDto[] {
  if (pageNumber <= 1) {
    return nextPage;
  }

  const merged = new Map<number, CatalogStockItemDto>();
  for (const item of previous) {
    merged.set(item.stockId, item);
  }
  for (const item of nextPage) {
    merged.set(item.stockId, item);
  }
  return Array.from(merged.values());
}

type HorizontalScrollRowProps = {
  syncKey?: string | number;
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
  scrollBackLabel: string;
  scrollForwardLabel: string;
  scrollStep?: number;
};

function HorizontalScrollRow({
  syncKey,
  children,
  className,
  trackClassName,
  scrollBackLabel,
  scrollForwardLabel,
  scrollStep = 200,
}: HorizontalScrollRowProps): ReactElement {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) {
      setCanLeft(false);
      setCanRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 2);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return undefined;

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updateEdges);
    });
    ro.observe(el);
    const onScroll = (): void => {
      updateEdges();
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', onScroll);
    };
  }, [updateEdges, syncKey]);

  const scrollByDir = (dir: 1 | -1): void => {
    scrollerRef.current?.scrollBy({ left: dir * scrollStep, behavior: 'smooth' });
  };

  return (
    <div className={cn('flex min-w-0 max-w-full items-center gap-0.5', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 shrink-0 rounded-full', !canLeft && 'pointer-events-none invisible')}
        disabled={!canLeft}
        aria-label={scrollBackLabel}
        onClick={() => scrollByDir(-1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div
        ref={scrollerRef}
        className={cn('min-h-8 min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:thin]', trackClassName)}
      >
        <div className="flex w-max min-w-0 flex-nowrap items-center gap-2 py-0.5">{children}</div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 shrink-0 rounded-full', !canRight && 'pointer-events-none invisible')}
        disabled={!canRight}
        aria-label={scrollForwardLabel}
        onClick={() => scrollByDir(1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function CatalogStockSelectDialog({
  open,
  onOpenChange,
  onSelect,
  onMultiSelect,
  multiSelect = false,
  initialSelectedResults = [],
  existingLineStockMarkers = [],
  pricingRuleType,
  pricingRuleCustomerId,
  pricingRuleErpCustomerCode,
}: CatalogStockSelectDialogProps): ReactElement {
  const { t, i18n } = useTranslation('common');
  const systemSettings = useSystemSettingsStore((state) => state.settings);
  const groupCodeLabel = getCatalogFieldLabel(systemSettings, 'grupKodu', t);
  const [selectedCatalog, setSelectedCatalog] = useState<ProductCatalogDto | null>(null);
  const [navigationPath, setNavigationPath] = useState<CatalogCategoryNodeDto[]>([]);
  const [selectedLeafCategory, setSelectedLeafCategory] = useState<CatalogCategoryNodeDto | null>(null);
  const [includeDescendants, setIncludeDescendants] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [sessionPicks, setSessionPicks] = useState<CatalogSessionPick[]>([]);
  const [relatedDialogOpen, setRelatedDialogOpen] = useState(false);
  const [relatedDialogStock, setRelatedDialogStock] = useState<CatalogStockItemDto | null>(null);
  const [relatedDialogRelations, setRelatedDialogRelations] = useState<StockRelationDto[]>([]);
  const [hierarchyInfoOpen, setHierarchyInfoOpen] = useState(false);
  const [helperStripOpen, setHelperStripOpen] = useState(false);
  const [stockLayoutMode, setStockLayoutMode] = useState<'cards' | 'list'>('cards');
  const [leftPanelMode, setLeftPanelMode] = useState<CatalogLeftPanelMode>('code');
  const [stockBrowseMode, setStockBrowseMode] = useState<CatalogStockBrowseMode>('specialCodes');
  const [specialCodeSelections, setSpecialCodeSelections] = useState<CatalogSpecialCodeSelections>(
    () => ({ ...EMPTY_SPECIAL_CODE_SELECTIONS }),
  );
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(true);
  const [mobileCategoryToolsOpen, setMobileCategoryToolsOpen] = useState(false);
  const [mobileStocksOpen, setMobileStocksOpen] = useState(true);
  const [categoryClientSearch, setCategoryClientSearch] = useState('');
  const [categorySearchShowBranches, setCategorySearchShowBranches] = useState(false);
  const [expandedCatalogIds, setExpandedCatalogIds] = useState<Set<number>>(() => new Set());
  const [catalogPaths, setCatalogPaths] = useState<Record<number, CatalogCategoryNodeDto[]>>({});
  const [categoryStockItems, setCategoryStockItems] = useState<CatalogStockItemDto[]>([]);
  const [favoriteStockItems, setFavoriteStockItems] = useState<CatalogStockItemDto[]>([]);
  const [specialCodePagedItems, setSpecialCodePagedItems] = useState<CatalogStockItemDto[]>([]);
  const debouncedStockSearch = useDebouncedValue(stockSearch, 300);
  const effectiveDebouncedStockSearch = stockSearch.trim().length === 0 ? '' : debouncedStockSearch;
  const catalogStockApiSearch = useMemo(
    (): string | undefined => toCatalogStockApiSearch(effectiveDebouncedStockSearch),
    [effectiveDebouncedStockSearch],
  );
  const debouncedCategoryClientSearch = useDebouncedValue(categoryClientSearch, 320);
  const wasOpenRef = useRef(false);
  const categorySelectionRowRef = useRef<HTMLElement | null>(null);
  const initialDraftSnapshotRef = useRef<ProductSelectionResult[]>([]);
  const documentLinesSnapshotRef = useRef<ProductSelectionResult[]>([]);

  useEffect(() => {
    if (!open) {
      setSelectedCatalog(null);
      setNavigationPath([]);
      setSelectedLeafCategory(null);
      setIncludeDescendants(false);
      setStockSearch('');
      setPageNumber(1);
      setSessionPicks([]);
      setRelatedDialogOpen(false);
      setRelatedDialogStock(null);
      setRelatedDialogRelations([]);
      setHierarchyInfoOpen(false);
      setHelperStripOpen(false);
      setStockLayoutMode('cards');
      setLeftPanelMode('code');
      setStockBrowseMode('specialCodes');
      setSpecialCodeSelections(clearSpecialCodeSelections());
      setMobileCategoriesOpen(true);
      setMobileCategoryToolsOpen(false);
      setMobileStocksOpen(true);
      setCategoryClientSearch('');
      setCategorySearchShowBranches(false);
      setExpandedCatalogIds(new Set());
      setCatalogPaths({});
      wasOpenRef.current = false;
      initialDraftSnapshotRef.current = [];
      documentLinesSnapshotRef.current = [];
      return;
    }

    if (!wasOpenRef.current) {
      const snapshot = initialSelectedResults.map((r) => ({ ...r }));
      initialDraftSnapshotRef.current = snapshot;
      documentLinesSnapshotRef.current = (existingLineStockMarkers ?? []).map((r) => ({ ...r }));
      setSessionPicks([]);
      wasOpenRef.current = true;
    }
  }, [initialSelectedResults, open, existingLineStockMarkers]);

  const catalogsQuery = useQuery({
    queryKey: ['catalog-stock-picker-catalogs'],
    queryFn: categoryDefinitionsApi.getCatalogs,
    enabled: open,
  });

  const catalogListForQueries = catalogsQuery.data ?? [];

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    if (!mq.matches) return;
    if (selectedLeafCategory) {
      setMobileCategoriesOpen(false);
      setMobileStocksOpen(true);
    } else {
      setMobileCategoriesOpen(true);
    }
  }, [open, selectedLeafCategory]);

  useEffect(() => {
    if (!open || !selectedLeafCategory) {
      return;
    }
    categorySelectionRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open, selectedLeafCategory]);

  const categoryQueries = useQueries({
    queries: catalogListForQueries.map((c) => {
      const path = catalogPaths[c.id] ?? [];
      const parentCategoryId =
        path.length > 0 ? path[path.length - 1]!.catalogCategoryId : null;
      return {
        queryKey: ['catalog-stock-picker-categories', c.id, parentCategoryId] as const,
        queryFn: (): Promise<CatalogCategoryNodeDto[]> =>
          categoryDefinitionsApi.getCatalogCategories(c.id, parentCategoryId),
        enabled: open && expandedCatalogIds.has(c.id),
      };
    }),
  });

  const fullCategoryTreeQuery = useQuery({
    queryKey: ['catalog-client-full-tree', selectedCatalog?.id],
    queryFn: (): Promise<CatalogCategoryNodeDto[]> => fetchCatalogCategoryTreeFlat(selectedCatalog!.id),
    enabled: open && selectedCatalog != null,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 86_400_000,
    retry: 1,
  });

  const categoryClientSearchResults = useMemo((): CatalogCategoryNodeDto[] => {
    const flat = fullCategoryTreeQuery.data;
    if (!flat?.length) {
      return [];
    }
    return filterCategoryNodesForClientSearch(flat, debouncedCategoryClientSearch, {
      includeBranches: categorySearchShowBranches,
    });
  }, [
    fullCategoryTreeQuery.data,
    debouncedCategoryClientSearch,
    categorySearchShowBranches,
  ]);

  useEffect(() => {
    setPageNumber(1);
  }, [
    selectedLeafCategory?.catalogCategoryId,
    debouncedStockSearch,
    includeDescendants,
    stockBrowseMode,
    specialCodeSelections,
  ]);

  const campaignDisplayCount = pageNumber * PAGE_SIZE;

  const stocksQuery = useQuery({
    queryKey: [
      'catalog-stock-picker-stocks',
      stockBrowseMode,
      selectedCatalog?.id,
      selectedLeafCategory?.catalogCategoryId,
      includeDescendants,
      pageNumber,
      catalogStockApiSearch,
    ],
    queryFn: () =>
      categoryDefinitionsApi.getCatalogCategoryStocks(selectedCatalog!.id, selectedLeafCategory!.catalogCategoryId, {
        pageNumber,
        pageSize: PAGE_SIZE,
        search: catalogStockApiSearch,
        includeDescendants,
      }),
    enabled:
      open &&
      stockBrowseMode === 'category' &&
      selectedCatalog != null &&
      selectedLeafCategory != null,
    placeholderData: keepPreviousData,
  });

  const categoryPageItems = stocksQuery.data?.data ?? EMPTY_CATALOG_STOCK_ROWS;
  const totalCount = stocksQuery.data?.totalCount ?? categoryStockItems.length;
  const hasNextPage = stocksQuery.data?.hasNextPage ?? (categoryStockItems.length < totalCount);

  const campaignStocksQuery = useQuery({
    queryKey: [
      'catalog-stock-picker-campaign-stocks',
      pricingRuleType,
      pricingRuleCustomerId ?? null,
      pricingRuleErpCustomerCode ?? null,
    ] as const,
    queryFn: async (): Promise<CampaignStocksQueryData> => {
      const { orderedCodes, pricingByCodeLower } = await fetchPricingRuleCampaignStockData({
        ruleType: pricingRuleType,
        customerId: pricingRuleCustomerId,
        erpCustomerCode: pricingRuleErpCustomerCode,
      });
      const stocks = await stockApi.getListByErpStockCodes(orderedCodes);
      const byLower = new Map(stocks.map((s) => [String(s.erpStockCode ?? '').toLowerCase(), s]));
      const ordered: StockGetDto[] = [];
      for (const code of orderedCodes) {
        const row = byLower.get(code.toLowerCase());
        if (row) {
          ordered.push(row);
        }
      }
      return {
        items: ordered.map(mapStockGetToCatalogItem),
        pricingByCodeLower,
      };
    },
    enabled: open && stockBrowseMode === 'campaign',
    staleTime: 2 * 60 * 1000,
  });

  const campaignCatalogItems = useMemo(
    () => campaignStocksQuery.data?.items ?? [],
    [campaignStocksQuery.data?.items]
  );
  const campaignPricingByCodeLower = campaignStocksQuery.data?.pricingByCodeLower ?? {};
  const campaignSearchFilteredItems = useMemo((): CatalogStockItemDto[] => {
    if (!debouncedStockSearch.trim()) {
      return campaignCatalogItems;
    }
    return campaignCatalogItems.filter((s) =>
      matchesSearchTerm(debouncedStockSearch, [
        s.erpStockCode,
        ...getLocalizedStockSearchTerms(s, i18n.language),
        s.grupKodu,
      ]),
    );
  }, [campaignCatalogItems, debouncedStockSearch, i18n.language]);
  const campaignDisplayItems = useMemo((): CatalogStockItemDto[] => {
    return campaignSearchFilteredItems.slice(0, campaignDisplayCount);
  }, [campaignSearchFilteredItems, campaignDisplayCount]);
  const campaignHasNextPage = campaignDisplayCount < campaignSearchFilteredItems.length;
  const favoriteCatalogId = selectedCatalog?.id ?? catalogsQuery.data?.[0]?.id ?? null;

  const favoriteStocksQuery = useQuery({
    queryKey: [
      'catalog-stock-picker-favorites',
      favoriteCatalogId,
      pageNumber,
      catalogStockApiSearch,
    ] as const,
    queryFn: async (): Promise<FavoriteStocksQueryData> => {
      const response = await categoryDefinitionsApi.getCatalogFavorites(favoriteCatalogId!, {
        pageNumber,
        pageSize: PAGE_SIZE,
        search: catalogStockApiSearch,
      });
      const rawItems = response.data ?? [];

      const codesNeedingImage = rawItems
        .filter((item) => !item.imageUrl?.trim())
        .map((item) => item.erpStockCode)
        .filter((code): code is string => typeof code === 'string' && code.length > 0);

      let imageByCodeLower = new Map<string, string>();
      if (codesNeedingImage.length > 0) {
        try {
          const stocks = await stockApi.getListByErpStockCodes(codesNeedingImage);
          imageByCodeLower = new Map(
            stocks
              .map((s): [string, string | null] => {
                const enriched = s as StockGetWithMainImageDto;
                const primary =
                  enriched.mainImage ??
                  s.stockImages?.find((img) => img.isPrimary) ??
                  s.stockImages?.[0];
                const filePath = primary?.filePath ?? null;
                return [String(s.erpStockCode ?? '').toLowerCase(), filePath];
              })
              .filter((entry): entry is [string, string] => entry[1] != null && entry[1].length > 0),
          );
        } catch {
          imageByCodeLower = new Map();
        }
      }

      const enrichedItems: CatalogStockItemDto[] = rawItems.map((item) => {
        if (item.imageUrl?.trim()) {
          return item;
        }
        const filePath = imageByCodeLower.get(String(item.erpStockCode ?? '').toLowerCase());
        return filePath ? { ...item, imageUrl: filePath } : item;
      });

      return {
        items: enrichedItems,
        totalCount: response.totalCount ?? 0,
        hasNextPage: response.hasNextPage ?? false,
      };
    },
    enabled: open && stockBrowseMode === 'favorites' && favoriteCatalogId != null,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const favoritePageItems = favoriteStocksQuery.data?.items ?? EMPTY_CATALOG_STOCK_ROWS;
  const favoriteTotalCount = favoriteStocksQuery.data?.totalCount ?? favoriteStockItems.length;
  const favoriteHasNextPage = favoriteStocksQuery.data?.hasNextPage ?? (favoriteStockItems.length < favoriteTotalCount);

  const specialCodeHasSelection = hasSpecialCodeSelection(specialCodeSelections);

  const specialCodeFacetPoolQuery = useQuery({
    queryKey: ['catalog-special-code-facet-pool'],
    queryFn: async (): Promise<StockGetDto[]> => {
      const response = await stockApi.getList({
        pageNumber: 1,
        pageSize: CATALOG_SPECIAL_CODE_FACET_POOL_SIZE,
        search: '',
        sortBy: 'Id',
        sortDirection: 'desc',
        filterLogic: 'and',
        filters: [],
      });
      return response.data ?? [];
    },
    enabled: open && leftPanelMode === 'code',
    staleTime: 120_000,
    gcTime: 300_000,
  });

  const specialCodeOptionsByLevel = useMemo((): Record<CatalogFilterDimension, CatalogSpecialCodeOption[]> => {
    const pool = specialCodeFacetPoolQuery.data ?? [];
    const result = {} as Record<CatalogFilterDimension, CatalogSpecialCodeOption[]>;
    for (const dimension of CATALOG_FILTER_DIMENSIONS) {
      result[dimension] = extractFilterDimensionOptions(pool, dimension);
    }
    return result;
  }, [specialCodeFacetPoolQuery.data]);

  const specialCodeStocksQuery = useQuery({
    queryKey: [
      'catalog-special-code-stocks',
      pageNumber,
      catalogStockApiSearch,
      specialCodeSelections,
    ] as const,
    queryFn: async (): Promise<{ data: CatalogStockItemDto[]; totalCount: number }> => {
      const result = await stockApi.getListWithImagesByCodeFilters({
        pageNumber,
        pageSize: PAGE_SIZE,
        search: catalogStockApiSearch ?? '',
        sortBy: 'Id',
        sortDirection: 'desc',
        filterLogic: 'and',
        filters: [],
        codeFilters: specialCodeSelections,
      });
      return {
        data: result.data.map((row) => mapStockGetToCatalogItem(row)),
        totalCount: result.totalCount ?? result.data.length,
      };
    },
    enabled: open && leftPanelMode === 'code' && specialCodeHasSelection,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const specialCodePageItems = specialCodeStocksQuery.data?.data ?? EMPTY_CATALOG_STOCK_ROWS;
  const specialCodeTotalCount = specialCodeStocksQuery.data?.totalCount ?? specialCodePagedItems.length;
  const specialCodeHasNextPage = specialCodePagedItems.length < specialCodeTotalCount;

  useEffect(() => {
    setCategoryStockItems([]);
  }, [
    open,
    selectedCatalog?.id,
    selectedLeafCategory?.catalogCategoryId,
    includeDescendants,
    catalogStockApiSearch,
  ]);

  useEffect(() => {
    if (!stocksQuery.data || stocksQuery.isPlaceholderData) {
      return;
    }
    setCategoryStockItems((previous) =>
      appendUniqueCatalogStockItems(previous, categoryPageItems, pageNumber),
    );
  }, [categoryPageItems, pageNumber, stocksQuery.data, stocksQuery.isPlaceholderData]);

  useEffect(() => {
    setFavoriteStockItems([]);
  }, [open, favoriteCatalogId, catalogStockApiSearch]);

  useEffect(() => {
    if (!favoriteStocksQuery.data || favoriteStocksQuery.isPlaceholderData) {
      return;
    }
    setFavoriteStockItems((previous) =>
      appendUniqueCatalogStockItems(previous, favoritePageItems, pageNumber),
    );
  }, [favoritePageItems, favoriteStocksQuery.data, favoriteStocksQuery.isPlaceholderData, pageNumber]);

  useEffect(() => {
    setSpecialCodePagedItems([]);
  }, [open, catalogStockApiSearch, specialCodeSelections]);

  useEffect(() => {
    if (!specialCodeStocksQuery.data || specialCodeStocksQuery.isPlaceholderData) {
      return;
    }
    setSpecialCodePagedItems((previous) =>
      appendUniqueCatalogStockItems(previous, specialCodePageItems, pageNumber),
    );
  }, [pageNumber, specialCodePageItems, specialCodeStocksQuery.data, specialCodeStocksQuery.isPlaceholderData]);

  const rawActiveStockRows: CatalogStockItemDto[] =
    stockBrowseMode === 'campaign'
      ? campaignDisplayItems
      : stockBrowseMode === 'favorites'
        ? favoriteStockItems
        : leftPanelMode === 'code' && stockBrowseMode === 'specialCodes'
          ? specialCodePagedItems
          : categoryStockItems;
  const activeStockRows = useMemo(
    () => dedupeStocksByErpStockCode(rawActiveStockRows),
    [rawActiveStockRows],
  );
  const activeStockLoading =
    stockBrowseMode === 'campaign'
      ? campaignStocksQuery.isFetching
      : stockBrowseMode === 'favorites'
        ? (favoriteStocksQuery.isPending || favoriteStocksQuery.isFetching) && favoriteStockItems.length === 0
        : leftPanelMode === 'code' && stockBrowseMode === 'specialCodes'
          ? (specialCodeStocksQuery.isPending || specialCodeStocksQuery.isFetching) && specialCodePagedItems.length === 0
          : (stocksQuery.isPending || stocksQuery.isFetching) && categoryStockItems.length === 0;
  const activeStockFetchingMore =
    stockBrowseMode === 'campaign'
      ? false
      : stockBrowseMode === 'favorites'
        ? favoriteStocksQuery.isFetching && pageNumber > 1
        : leftPanelMode === 'code' && stockBrowseMode === 'specialCodes'
          ? specialCodeStocksQuery.isFetching && pageNumber > 1
          : stocksQuery.isFetching && pageNumber > 1;
  const activeStockHasNextPage =
    stockBrowseMode === 'campaign'
      ? campaignHasNextPage
      : stockBrowseMode === 'favorites'
        ? favoriteHasNextPage
        : leftPanelMode === 'code' && stockBrowseMode === 'specialCodes'
          ? specialCodeHasNextPage
          : hasNextPage;

  const relationQueries = useQueries({
    queries: activeStockRows.map((stock) => ({
      queryKey: ['catalog-stock-picker-relations', stock.stockId],
      queryFn: () => stockApi.getRelations(stock.stockId),
      enabled:
        open &&
        activeStockRows.length > 0 &&
        (stockBrowseMode === 'campaign' ||
          stockBrowseMode === 'favorites' ||
          (leftPanelMode === 'code' && specialCodeHasSelection) ||
          (stockBrowseMode === 'category' && selectedLeafCategory != null)),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const relationMap = useMemo(() => {
    const map = new Map<number, StockRelationDto[]>();
    activeStockRows.forEach((stock, index) => {
      const relations = relationQueries[index]?.data ?? [];
      map.set(stock.stockId, relations);
    });
    return map;
  }, [activeStockRows, relationQueries]);

  const getSelectionKey = (value: { id?: number; code: string }): string =>
    value.id != null ? `id:${value.id}` : `code:${value.code}`;

  const upsertSessionPickByStockKey = (result: ProductSelectionResult): void => {
    const nextKey = getSelectionKey(result);
    setSessionPicks((prev) => {
      const existingIndex = prev.findIndex((p) => getSelectionKey(p.result) === nextKey);
      if (existingIndex >= 0) {
        return prev.map((p, i) => (i === existingIndex ? { ...p, result: { ...result } } : p));
      }
      return [...prev, { pickId: crypto.randomUUID(), result: { ...result } }];
    });
  };

  const removeSessionPickById = (pickId: string): void => {
    setSessionPicks((prev) => prev.filter((p) => p.pickId !== pickId));
  };

  const duplicateSessionPickById = (pickId: string): void => {
    setSessionPicks((prev) => {
      const found = prev.find((p) => p.pickId === pickId);
      if (!found) {
        return prev;
      }
      return [...prev, { pickId: crypto.randomUUID(), result: { ...found.result } }];
    });
  };

  const selectedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const p of sessionPicks) {
      keys.add(getSelectionKey(p.result));
    }
    return keys;
  }, [sessionPicks]);

  const selectedScrollSyncKey = useMemo(
    () => sessionPicks.map((p) => p.pickId).join('|'),
    [sessionPicks],
  );

  const activateCategoryInCatalog = useCallback(
    (catalogId: number, category: CatalogCategoryNodeDto, branchPath?: CatalogCategoryNodeDto[]): void => {
      setLeftPanelMode('catalog');
      setStockBrowseMode('category');
      setStockLayoutMode('cards');
      const catalog = catalogsQuery.data?.find((c) => c.id === catalogId);
      if (!catalog) {
        return;
      }
      const pathBase = branchPath ?? catalogPaths[catalogId] ?? [];
      const nextPath =
        branchPath !== undefined
          ? branchPath
          : category.hasChildren
            ? [...pathBase, category]
            : pathBase;
      setCatalogPaths((prev) => ({ ...prev, [catalogId]: nextPath }));
      setSelectedCatalog(catalog);
      setNavigationPath(nextPath);
      setSelectedLeafCategory(category);
      setIncludeDescendants(category.hasChildren);
      setStockSearch('');
      setPageNumber(1);
    },
    [catalogPaths, catalogsQuery.data],
  );

  const handleCategoryClientSearchPick = useCallback(
    (node: CatalogCategoryNodeDto): void => {
      const flat = fullCategoryTreeQuery.data;
      const cid = selectedCatalog?.id;
      if (!flat?.length || cid == null) {
        return;
      }
      const byId = buildCategoryIdIndex(flat);
      const chain = buildAncestorChainFromRoot(node, byId);
      if (chain.length === 0) {
        return;
      }
      activateCategoryInCatalog(cid, node, node.hasChildren ? chain : chain.slice(0, -1));
      setCategoryClientSearch('');
    },
    [activateCategoryInCatalog, fullCategoryTreeQuery.data, selectedCatalog?.id],
  );

  const handleCategoryClick = (catalogId: number, category: CatalogCategoryNodeDto): void => {
    activateCategoryInCatalog(catalogId, category);
  };

  const resolveDefaultStockBrowseMode = (): CatalogStockBrowseMode =>
    leftPanelMode === 'code' ? 'specialCodes' : 'category';

  const toggleStockBrowseCampaign = (): void => {
    setStockLayoutMode('cards');
    setStockBrowseMode((mode) => (mode === 'campaign' ? resolveDefaultStockBrowseMode() : 'campaign'));
  };

  const toggleStockBrowseFavorites = (): void => {
    setStockLayoutMode('cards');
    setStockBrowseMode((mode) => (mode === 'favorites' ? resolveDefaultStockBrowseMode() : 'favorites'));
  };

  const handleLeftPanelModeChange = (mode: CatalogLeftPanelMode): void => {
    setLeftPanelMode(mode);
    setPageNumber(1);
    setStockSearch('');
    if (mode === 'code') {
      setStockLayoutMode('cards');
      setStockBrowseMode('specialCodes');
      return;
    }
    if (stockBrowseMode === 'specialCodes') {
      setStockBrowseMode('category');
    }
  };

  const handleSpecialCodeToggle = (dimension: CatalogFilterDimension, value: string): void => {
    setSpecialCodeSelections((prev) => toggleSpecialCodeValue(prev, dimension, value));
    setPageNumber(1);
  };

  const handleSpecialCodeClear = (): void => {
    setSpecialCodeSelections(clearSpecialCodeSelections());
    setPageNumber(1);
  };

  const handleCatalogTrailSegmentClick = (catalogId: number, endIndexInclusive: number): void => {
    setStockBrowseMode('category');
    setStockLayoutMode('cards');
    const catalog = catalogsQuery.data?.find((c) => c.id === catalogId);
    if (!catalog) {
      return;
    }
    const path = catalogPaths[catalogId] ?? [];
    const nextPath = path.slice(0, endIndexInclusive + 1);
    setCatalogPaths((p) => ({ ...p, [catalogId]: nextPath }));
    setSelectedCatalog(catalog);
    const folder = nextPath.length > 0 ? nextPath[nextPath.length - 1]! : null;
    setNavigationPath(nextPath);
    setSelectedLeafCategory(folder);
    setIncludeDescendants(folder?.hasChildren ?? false);
    setStockSearch('');
    setPageNumber(1);
  };

  const toggleCatalogExpanded = (catalogId: number): void => {
    const willCollapse = expandedCatalogIds.has(catalogId);
    setExpandedCatalogIds((prev) => {
      const next = new Set(prev);
      if (next.has(catalogId)) {
        next.delete(catalogId);
      } else {
        next.add(catalogId);
      }
      return next;
    });
    if (!willCollapse) {
      return;
    }
    setCatalogPaths((p) => {
      const copy = { ...p };
      delete copy[catalogId];
      return copy;
    });
    if (selectedCatalog?.id === catalogId) {
      setSelectedCatalog(null);
      setNavigationPath([]);
      setSelectedLeafCategory(null);
      setIncludeDescendants(false);
      setStockSearch('');
      setPageNumber(1);
    }
  };

  const handleBackLevelInCatalog = (catalogId: number): void => {
    setStockBrowseMode('category');
    setStockLayoutMode('cards');
    const path = catalogPaths[catalogId] ?? (selectedCatalog?.id === catalogId ? navigationPath : []);
    const nextPath = path.slice(0, -1);
    setCatalogPaths((p) => ({ ...p, [catalogId]: nextPath }));
    if (selectedCatalog?.id !== catalogId) {
      return;
    }
    const parent = nextPath[nextPath.length - 1] ?? null;
    setNavigationPath(nextPath);
    setSelectedLeafCategory(parent);
    setIncludeDescendants(parent?.hasChildren ?? false);
    setStockSearch('');
    setPageNumber(1);
  };

  const handleBackLevel = (): void => {
    if (!selectedCatalog) {
      return;
    }
    handleBackLevelInCatalog(selectedCatalog.id);
  };

  const handleResetCategoryBranch = (): void => {
    setNavigationPath([]);
    setSelectedLeafCategory(null);
    setSelectedCatalog(null);
    setIncludeDescendants(false);
    setStockSearch('');
    setPageNumber(1);
    setCategoryClientSearch('');
    setCatalogPaths({});
    setExpandedCatalogIds(new Set());
    setStockBrowseMode('category');
    setStockLayoutMode('cards');
    setSpecialCodeSelections(clearSpecialCodeSelections());
  };

  const canResetCategoryBranch =
    selectedCatalog != null ||
    Object.keys(catalogPaths).some((k) => (catalogPaths[Number(k)]?.length ?? 0) > 0) ||
    selectedLeafCategory != null ||
    includeDescendants ||
    stockSearch.trim() !== '' ||
    pageNumber > 1 ||
    stockBrowseMode !== 'category' ||
    specialCodeHasSelection;

  const toSelectionResult = (stock: CatalogStockItemDto): ProductSelectionResult => ({
    id: stock.stockId,
    code: stock.erpStockCode,
    name: getLocalizedStockName(stock, i18n.language),
    unit: stock.unit ?? undefined,
    groupCode: stock.grupKodu ?? undefined,
  });

  const handleStockClick = async (stock: CatalogStockItemDto): Promise<void> => {
    const relations = relationMap.get(stock.stockId) ?? [];
    if (relations.length > 0) {
      setRelatedDialogStock(stock);
      setRelatedDialogRelations(relations);
      setRelatedDialogOpen(true);
      return;
    }

    const result = toSelectionResult(stock);

    if (multiSelect) {
      const key = getSelectionKey(result);
      setSessionPicks((prev) => {
        if (prev.some((p) => getSelectionKey(p.result) === key)) {
          return prev.filter((p) => getSelectionKey(p.result) !== key);
        }
        return [...prev, { pickId: crypto.randomUUID(), result: { ...result } }];
      });
      return;
    }

    await onSelect(result);
    onOpenChange(false);
  };

  const handleRelatedStocksConfirm = async (selection: RelatedStockSelectionConfirmItem[]): Promise<void> => {
    if (!relatedDialogStock) return;

    const relatedStockIds = selection.map((item) => item.relatedStockId);
    const relatedStockQuantitiesById: Record<number, number> = {};
    for (const item of selection) {
      relatedStockQuantitiesById[item.relatedStockId] = item.quantityPerMain;
    }

    const result: ProductSelectionResult = {
      ...toSelectionResult(relatedDialogStock),
      relatedStockIds,
      relatedStockQuantitiesById,
    };

    if (multiSelect) {
      upsertSessionPickByStockKey(result);
      setRelatedDialogOpen(false);
      setRelatedDialogStock(null);
      setRelatedDialogRelations([]);
      return;
    }

    await onSelect(result);
    setRelatedDialogOpen(false);
    setRelatedDialogStock(null);
    setRelatedDialogRelations([]);
    onOpenChange(false);
  };

  const handleConfirmMulti = async (): Promise<void> => {
    if (!multiSelect || !onMultiSelect) return;
    const draft = initialDraftSnapshotRef.current;
    const session = sessionPicks.map((p) => p.result);
    if (draft.length === 0 && session.length === 0) return;
    const merged = [...draft, ...session];
    await onMultiSelect(merged);
    onOpenChange(false);
  };

  const catalogDraftSnapshotList = initialDraftSnapshotRef.current;
  const catalogDocumentLinesList = documentLinesSnapshotRef.current;

  const hasAnyPicksOrDraft = sessionPicks.length > 0 || catalogDraftSnapshotList.length > 0;

  const helperTitle = useMemo((): string => {
    if (stockBrowseMode === 'favorites') {
      return t('catalogStockPicker.favoriteStocksChip');
    }
    if (leftPanelMode === 'code' && stockBrowseMode === 'specialCodes') {
      if (!specialCodeHasSelection) {
        return t('catalogStockPicker.specialCodesEmptyTitle');
      }
      if (specialCodeStocksQuery.isLoading) {
        return t('catalogStockPicker.loadingStocks');
      }
      return hasAnyPicksOrDraft
        ? t('catalogStockPicker.selectionReadyTitle')
        : specialCodePagedItems.length > 0
          ? t('catalogStockPicker.stocksFoundTitle', { count: specialCodeTotalCount })
          : t('catalogStockPicker.emptyStocksTitle');
    }
    if (stockBrowseMode === 'campaign') {
      if (campaignStocksQuery.isLoading) {
        return t('catalogStockPicker.loadingStocks');
      }
      return hasAnyPicksOrDraft
        ? t('catalogStockPicker.selectionReadyTitle')
        : campaignSearchFilteredItems.length > 0
          ? t('catalogStockPicker.stocksFoundTitle', { count: campaignSearchFilteredItems.length })
          : t('catalogStockPicker.emptyStocksTitle');
    }
    if (!selectedLeafCategory) {
      return t('catalogStockPicker.rightPanelTitle');
    }
    return hasAnyPicksOrDraft
      ? t('catalogStockPicker.selectionReadyTitle')
      : categoryStockItems.length > 0
        ? t('catalogStockPicker.stocksFoundTitle', { count: totalCount })
        : t('catalogStockPicker.emptyStocksTitle');
  }, [
    stockBrowseMode,
    leftPanelMode,
    specialCodeHasSelection,
    specialCodeStocksQuery.isLoading,
    specialCodePagedItems.length,
    specialCodeTotalCount,
    campaignStocksQuery.isLoading,
    hasAnyPicksOrDraft,
    campaignSearchFilteredItems.length,
    selectedLeafCategory,
    categoryStockItems.length,
    totalCount,
    t,
  ]);

  const helperDescription = useMemo((): string => {
    if (leftPanelMode === 'code' && stockBrowseMode === 'specialCodes') {
      if (!specialCodeHasSelection) {
        return t('catalogStockPicker.specialCodesPickHint');
      }
      if (specialCodeStocksQuery.isLoading) {
        return t('catalogStockPicker.loadingStocks');
      }
      return hasAnyPicksOrDraft
        ? t('catalogStockPicker.selectionReadyHint')
        : specialCodePagedItems.length > 0
          ? t('catalogStockPicker.rightPanelLeafHint')
          : t('catalogStockPicker.emptyStocks');
    }
    if (stockBrowseMode === 'favorites') {
      return t('catalogStockPicker.specialStockListPlaceholderHint');
    }
    if (stockBrowseMode === 'campaign') {
      if (campaignStocksQuery.isLoading) {
        return t('catalogStockPicker.loadingStocks');
      }
      return hasAnyPicksOrDraft
        ? t('catalogStockPicker.selectionReadyHint')
        : campaignSearchFilteredItems.length > 0
          ? t('catalogStockPicker.rightPanelLeafHint')
          : t('catalogStockPicker.emptyStocks');
    }
    if (!selectedLeafCategory) {
      return t('catalogStockPicker.selectLeafHint');
    }
    return hasAnyPicksOrDraft
      ? t('catalogStockPicker.selectionReadyHint')
      : categoryStockItems.length > 0
        ? t('catalogStockPicker.rightPanelLeafHint')
        : t('catalogStockPicker.emptyStocks');
  }, [
    stockBrowseMode,
    leftPanelMode,
    specialCodeHasSelection,
    specialCodeStocksQuery.isLoading,
    specialCodePagedItems.length,
    campaignStocksQuery.isLoading,
    hasAnyPicksOrDraft,
    campaignSearchFilteredItems.length,
    selectedLeafCategory,
    categoryStockItems.length,
    t,
  ]);

  const helperStrip = (
    <div className="shrink-0 border-b border-slate-300/90 bg-white backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80">
      <button
        type="button"
        onClick={() => setHelperStripOpen((v) => !v)}
        aria-expanded={helperStripOpen}
        className="flex w-full items-center gap-2 px-3 py-2 crm-text-start transition-colors hover:bg-slate-100/70 dark:hover:bg-white/[0.04] sm:gap-3 sm:px-5 sm:py-2"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-500 shadow-[0_0_18px_rgba(236,72,153,0.18)] dark:text-rose-400 sm:h-8 sm:w-8 sm:rounded-xl">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-sm">{helperTitle}</div>
          {!helperStripOpen ? (
            <div className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{helperDescription}</div>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 sm:h-5 sm:w-5',
            helperStripOpen && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {helperStripOpen ? (
        <div className="border-t border-slate-300/90 px-3 pb-2 pt-1.5 dark:border-white/10 sm:px-5 sm:pb-3 sm:pt-2">
          <div className="rounded-xl border border-slate-300/90 bg-slate-50/90 p-2 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none sm:rounded-2xl sm:p-3">
            <div className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">{helperDescription}</div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const stockListScrollInner =
    leftPanelMode === 'code' && stockBrowseMode === 'specialCodes' && !specialCodeHasSelection ? (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300/90 bg-slate-50/80 px-4 py-8 text-center shadow-sm shadow-slate-200/40 backdrop-blur-sm dark:border-white/15 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-none sm:px-6 sm:py-12">
        <div className="max-w-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-[0_0_24px_rgba(236,72,153,0.22)] dark:text-rose-400">
            <ListFilter className="h-6 w-6" />
          </div>
          <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {t('catalogStockPicker.specialCodesEmptyTitle')}
          </div>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('catalogStockPicker.specialCodesPickHint')}</div>
        </div>
      </div>
    ) : stockBrowseMode === 'category' && !selectedLeafCategory ? (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300/90 bg-slate-50/80 px-4 py-8 text-center shadow-sm shadow-slate-200/40 backdrop-blur-sm dark:border-white/15 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-none sm:px-6 sm:py-12">
        <div className="max-w-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-[0_0_24px_rgba(236,72,153,0.22)] dark:text-rose-400 dark:shadow-[0_0_28px_rgba(236,72,153,0.25)]">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {t('catalogStockPicker.selectLeafTitle')}
          </div>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('catalogStockPicker.selectLeafHint')}</div>
        </div>
      </div>
    ) : activeStockLoading ? (
      <div className="flex min-h-0 flex-1 items-center justify-center py-8 text-sm text-slate-500 dark:text-slate-400">
        {t('catalogStockPicker.loadingStocks')}
      </div>
    ) : activeStockRows.length ? (
      stockLayoutMode === 'list' ? (
        <div className="flex w-full flex-col rounded-2xl border border-slate-300/90 bg-white shadow-md shadow-slate-200/50 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:shadow-none">
          <div className="w-full">
            <table className="w-full min-w-[620px] table-fixed border-collapse text-sm sm:min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-300/90 bg-slate-100/90 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 sm:text-[11px]">
                  <th className="w-[120px] crm-border-end border-slate-300/90 px-2 py-1.5 text-center sm:px-3 sm:py-2 dark:border-white/10">
                    {t('catalogStockPicker.listColCode')}
                  </th>
                  <th className="crm-border-end border-slate-300/90 px-2 py-1.5 text-center sm:px-3 sm:py-2 dark:border-white/10">
                    {t('catalogStockPicker.listColName')}
                  </th>
                  <th className="w-14 crm-border-end border-slate-300/90 px-2 py-1.5 text-center sm:py-2 dark:border-white/10">
                    {t('catalogStockPicker.unit')}
                  </th>
                  <th className="w-24 crm-border-end border-slate-300/90 px-2 py-1.5 text-center sm:py-2 dark:border-white/10">
                    {groupCodeLabel}
                  </th>
                  <th className="w-36 crm-border-end border-slate-300/90 px-2 py-1.5 text-center sm:py-2 dark:border-white/10">
                    {t('catalogStockPicker.warehouseBalanceTotal', { defaultValue: 'Toplam bakiye' })}
                  </th>
                  <th className="w-16 crm-border-end border-slate-300/90 px-2 py-1.5 text-center sm:py-2 dark:border-white/10">
                    {t('catalogStockPicker.listColRelated')}
                  </th>
                  <th className="w-28 px-2 py-1.5 text-center sm:py-2">{t('catalogStockPicker.listColAction')}</th>
                </tr>
              </thead>
              <tbody>
                {activeStockRows.map((stock) => {
                  const selectionKey = getSelectionKey({ id: stock.stockId, code: stock.erpStockCode });
                  const selected = selectedKeys.has(selectionKey);
                  const inOpeningDraft = stockMatchesDraftSnapshot(
                    { id: stock.stockId, erpStockCode: stock.erpStockCode },
                    catalogDraftSnapshotList
                  );
                  const onDocumentLine = stockMatchesDraftSnapshot(
                    { id: stock.stockId, erpStockCode: stock.erpStockCode },
                    catalogDocumentLinesList
                  );
                  const relCount = relationMap.get(stock.stockId)?.length ?? 0;

                  return (
                    <tr
                      key={`${stock.stockCategoryId}-${stock.stockId}`}
                      tabIndex={0}
                      className={cn(
                        'cursor-pointer border-b border-slate-200/90 transition-colors duration-200 hover:bg-rose-50/80 dark:border-white/5 dark:hover:bg-rose-500/[0.07]',
                        selected && 'bg-rose-50 dark:bg-rose-500/10 ring-1 ring-inset ring-rose-500/25',
                      )}
                      onClick={() => void handleStockClick(stock)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          void handleStockClick(stock);
                        }
                      }}
                    >
                      <td className="crm-border-end border-slate-200/90 px-2 py-1 align-middle sm:px-3 sm:py-1.5 dark:border-white/10">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <span className="font-mono text-[11px] font-semibold tracking-wide text-rose-700 dark:text-rose-300 sm:text-xs">
                            {stock.erpStockCode}
                          </span>
                          {inOpeningDraft ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="h-4 border border-amber-400/40 bg-amber-50 px-1 text-[8px] font-semibold leading-none text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
                                >
                                  {t('catalogStockPicker.alreadyInDraftBadge')}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                {t('catalogStockPicker.alreadyInDraftTooltip')}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                          {onDocumentLine ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="h-4 border border-indigo-400/40 bg-indigo-50 px-1 text-[8px] font-semibold leading-none text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200"
                                >
                                  {t('catalogStockPicker.alreadyOnLineBadge')}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                {t('catalogStockPicker.alreadyOnLineTooltip')}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      </td>
                      <td className="crm-border-end border-slate-200/90 px-2 py-1 align-middle sm:px-3 sm:py-1.5 dark:border-white/10">
                        <div className="min-w-0 crm-text-start">
                          <span className="line-clamp-2 text-sm font-medium leading-relaxed tracking-tight text-slate-900 dark:text-slate-100">
                            {getLocalizedStockName(stock, i18n.language)}
                          </span>
                          {stockBrowseMode === 'campaign' ? (
                            <CatalogCampaignPricingRow
                              line={campaignPricingByCodeLower[stock.erpStockCode.toLowerCase()]}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="crm-border-end border-slate-200/90 px-2 py-1 text-center align-middle font-mono text-[11px] text-slate-500 dark:text-slate-400 sm:py-1.5 sm:text-xs dark:border-white/10">
                        {stock.unit || '—'}
                      </td>
                      <td className="crm-border-end border-slate-200/90 px-2 py-1 text-center align-middle font-mono text-[11px] text-slate-500 dark:text-slate-400 sm:py-1.5 sm:text-xs dark:border-white/10">
                        {stock.grupKodu || '—'}
                      </td>
                      <td className="crm-border-end border-slate-200/90 px-2 py-1 align-middle text-center sm:py-1.5 dark:border-white/10">
                        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                          <StockWarehouseBalanceBadge stockId={stock.stockId} unit={stock.unit} />
                        </div>
                      </td>
                      <td className="crm-border-end border-slate-200/90 px-2 py-1 align-middle text-center sm:py-1.5 dark:border-white/10">
                        {relCount > 0 ? (
                          <Badge
                            variant="outline"
                            className="border border-cyan-400/40 bg-cyan-50 px-1.5 py-0 text-[10px] font-mono text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300"
                          >
                            {relCount}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1 align-middle text-center sm:py-1.5">
                        {selected ? (
                          <span className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-300">
                            <Check className="h-3.5 w-3.5 drop-shadow-[0_0_10px_rgba(244,114,182,0.55)]" />
                            {t('catalogStockPicker.selectedBadge')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">{t('catalogStockPicker.selectStockButton')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {activeStockHasNextPage ? (
            <div className="shrink-0 border-t border-slate-300/90 bg-slate-100/80 p-2 dark:border-white/10 dark:bg-white/[0.02] sm:p-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeStockFetchingMore}
                className="h-9 w-full rounded-xl border border-slate-300/90 bg-white text-xs text-slate-800 shadow-sm backdrop-blur-sm hover:border-rose-400/55 hover:bg-rose-50 hover:text-rose-600 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-200 dark:shadow-none dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-100"
                onClick={() => setPageNumber((prev) => prev + 1)}
              >
                {activeStockFetchingMore ? (
                  <>
                    <Loader2 className="crm-me-2 h-3.5 w-3.5 animate-spin" />
                    {t('catalogStockPicker.loadingStocks')}
                  </>
                ) : (
                  t('catalogStockPicker.loadMore')
                )}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="relative flex w-full flex-col">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(244,63,94,0.06),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(148,163,184,0.08),transparent_60%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(244,63,94,0.08),transparent_55%)]"
            aria-hidden
          />
          <div className="relative px-1 pt-1.5">
            <div className="grid grid-cols-1 gap-2.5 pb-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 2xl:gap-3">
              {activeStockRows.map((stock) => {
                const selectionKey = getSelectionKey({ id: stock.stockId, code: stock.erpStockCode });
                const selected = selectedKeys.has(selectionKey);
                const inOpeningDraft = stockMatchesDraftSnapshot(
                  { id: stock.stockId, erpStockCode: stock.erpStockCode },
                  catalogDraftSnapshotList
                );
                const onDocumentLine = stockMatchesDraftSnapshot(
                  { id: stock.stockId, erpStockCode: stock.erpStockCode },
                  catalogDocumentLinesList
                );
                const watermark = (stock.erpStockCode ?? '').slice(0, 2).toUpperCase() || '·';
                const relCount = relationMap.get(stock.stockId)?.length ?? 0;
                const imageUrl = stock.imageUrl?.trim() ? getImageUrl(stock.imageUrl) : null;

                return (
                  <button
                    key={`${stock.stockCategoryId}-${stock.stockId}`}
                    type="button"
                    onClick={() => void handleStockClick(stock)}
                    className={cn(
                      'group relative flex flex-col overflow-hidden rounded-xl border border-slate-300/90 bg-white crm-text-start shadow-md shadow-slate-200/45 backdrop-blur-md transition-all duration-300 ease-out will-change-transform dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none',
                      'hover:-translate-y-0.5 hover:border-rose-400/60 hover:shadow-[0_10px_30px_-8px_rgba(236,72,153,0.28),0_2px_6px_rgba(15,23,42,0.06)] dark:hover:border-rose-500/45 dark:hover:bg-white/[0.05] dark:hover:shadow-[0_6px_24px_rgba(236,72,153,0.22)]',
                      selected &&
                      'border-rose-400/70 bg-gradient-to-b from-rose-50/90 to-white shadow-[0_6px_22px_-6px_rgba(236,72,153,0.28)] ring-1 ring-rose-400/40 dark:from-rose-500/[0.08] dark:to-transparent dark:border-rose-500/55 dark:shadow-[0_0_22px_rgba(236,72,153,0.2)] dark:ring-rose-500/30',
                    )}
                  >
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      aria-hidden
                    />

                    {selected ? (
                      <div
                        className="pointer-events-none absolute crm-end-1-5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-rose-400/80 bg-rose-500 shadow-[0_4px_14px_-2px_rgba(236,72,153,0.6)] ring-2 ring-white/90 backdrop-blur-md dark:ring-zinc-950/80"
                        aria-hidden
                      >
                        <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
                      </div>
                    ) : null}

                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200/70 dark:from-zinc-900 dark:via-slate-950 dark:to-zinc-900">
                      {imageUrl ? (
                        <>
                          <img
                            src={imageUrl}
                            alt={getLocalizedStockName(stock, i18n.language)}
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                          <div
                            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(15,23,42,0.45),transparent_55%)] dark:bg-[linear-gradient(to_top,rgba(9,9,11,0.7),transparent_55%)]"
                            aria-hidden
                          />
                        </>
                      ) : (
                        <>
                          <div
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,63,94,0.14),transparent_55%),radial-gradient(circle_at_80%_90%,rgba(59,130,246,0.09),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(244,63,94,0.18),transparent_55%),radial-gradient(circle_at_80%_90%,rgba(59,130,246,0.12),transparent_50%)]"
                            aria-hidden
                          />
                          <div
                            className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:18px_18px] dark:opacity-70 dark:[background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)]"
                            aria-hidden
                          />
                          <span
                            className="pointer-events-none absolute -bottom-2 crm-start-1 select-none font-mono text-[clamp(2.25rem,7vw,4rem)] font-black uppercase leading-none tracking-tighter text-slate-900/[0.07] transition-all duration-500 group-hover:-translate-y-0.5 group-hover:text-rose-500/20 dark:text-white/[0.06] dark:group-hover:text-rose-300/[0.14]"
                            aria-hidden
                          >
                            {watermark}
                          </span>
                          <Package
                            className="pointer-events-none absolute crm-end-2 top-2 h-4 w-4 text-slate-400/70 transition-all duration-300 group-hover:text-rose-500/70 dark:text-white/15 dark:group-hover:text-rose-300/60"
                            aria-hidden
                          />
                          <div
                            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(241,245,249,0.9),transparent_55%)] dark:bg-[linear-gradient(to_top,rgba(9,9,11,0.85),transparent_50%)]"
                            aria-hidden
                          />
                        </>
                      )}
                      {(inOpeningDraft || onDocumentLine || relCount > 0) ? (
                        <div className="absolute bottom-1.5 crm-start-1-5 z-10 flex flex-wrap items-center gap-1">
                          {inOpeningDraft ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="rounded-full border border-amber-500/50 bg-amber-500 px-1.5 py-0 text-[8px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur-md dark:border-amber-400/50 dark:bg-amber-500/25 dark:text-amber-100">
                                  {t('catalogStockPicker.alreadyInDraftBadge')}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                {t('catalogStockPicker.alreadyInDraftTooltip')}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                          {onDocumentLine ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="rounded-full border border-indigo-500/50 bg-indigo-500 px-1.5 py-0 text-[8px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur-md dark:border-indigo-400/50 dark:bg-indigo-500/25 dark:text-indigo-100">
                                  {t('catalogStockPicker.alreadyOnLineBadge')}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                {t('catalogStockPicker.alreadyOnLineTooltip')}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                          {relCount > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/50 bg-amber-500 px-1.5 py-0 font-mono text-[8px] font-semibold text-white shadow-sm backdrop-blur-md dark:border-amber-400/50 dark:bg-amber-500/25 dark:text-amber-100">
                                  ×{relCount}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                {t('catalogStockPicker.relatedStocksHint')}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-600 dark:text-rose-300/90">
                          {stock.erpStockCode}
                        </span>
                        {stock.unit ? (
                          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                            {stock.unit}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="line-clamp-2 min-h-[2.2em] text-[12.5px] font-medium leading-snug tracking-tight text-slate-800 dark:text-slate-100">
                        {getLocalizedStockName(stock, i18n.language)}
                      </h3>

                      {stockBrowseMode === 'campaign' ? (
                        <CatalogCampaignPricingRow
                          line={campaignPricingByCodeLower[stock.erpStockCode.toLowerCase()]}
                        />
                      ) : null}

                      <div className="mt-auto flex w-fit max-w-full pt-1">
                        <StockWarehouseBalanceBadge stockId={stock.stockId} unit={stock.unit} />
                      </div>

                      {(stock.grupKodu || stock.kod1) ? (
                        <div className="mt-auto flex items-center gap-1 pt-0.5">
                          {stock.grupKodu ? (
                            <span className="truncate rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[9px] text-rose-700/90 dark:bg-rose-500/[0.08] dark:text-rose-200/90">
                              {stock.grupKodu}
                            </span>
                          ) : null}
                          {stock.kod1 ? (
                            <span className="truncate rounded bg-slate-100/80 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                              {stock.kod1}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {activeStockHasNextPage ? (
            <div className="relative z-10 shrink-0 border-t border-slate-300/90 bg-slate-100/80 p-2 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.02] sm:p-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeStockFetchingMore}
                className="h-9 w-full rounded-xl border border-slate-300/90 bg-white text-xs text-slate-800 shadow-sm backdrop-blur-sm hover:border-rose-400/55 hover:bg-rose-50 hover:text-rose-600 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-200 dark:shadow-none dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-100"
                onClick={() => setPageNumber((prev) => prev + 1)}
              >
                {activeStockFetchingMore ? (
                  <>
                    <Loader2 className="crm-me-2 h-3.5 w-3.5 animate-spin" />
                    {t('catalogStockPicker.loadingStocks')}
                  </>
                ) : (
                  t('catalogStockPicker.loadMore')
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )
    ) : (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300/90 bg-slate-50/90 px-4 py-8 text-center shadow-sm shadow-slate-200/40 backdrop-blur-sm dark:border-white/15 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:shadow-none sm:px-6 sm:py-12">
        <div className="max-w-md">
          <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('catalogStockPicker.emptyStocksTitle')}</div>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('catalogStockPicker.emptyStocks')}</div>
        </div>
      </div>
    );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="!fixed !flex min-h-0 flex-col gap-0 !overflow-hidden border border-slate-300/95 bg-[linear-gradient(180deg,#ffffff,#f8fafc_40%,#f1f5f9)] p-0 text-slate-900 shadow-[0_0_50px_rgba(236,72,153,0.1),0_25px_80px_rgba(15,23,42,0.18)] ring-1 ring-slate-300/40 backdrop-blur-3xl dark:border-white/10 dark:bg-zinc-950/85 dark:bg-none dark:text-slate-100 dark:shadow-[0_0_50px_rgba(236,72,153,0.1),0_25px_80px_rgba(0,0,0,0.45)] dark:ring-0 max-lg:!top-3 max-lg:!h-[calc(100svh-0.75rem)] max-lg:!max-h-[calc(100svh-0.75rem)] max-lg:!translate-y-0 max-lg:!w-[calc(100vw-0.5rem)] max-lg:!max-w-[calc(100vw-0.5rem)] lg:!top-1/2 lg:!left-1/2 lg:!h-[min(96dvh,980px)] lg:!max-h-[min(96dvh,980px)] lg:!w-[min(1520px,calc(100vw-1rem))] lg:!max-w-[min(1520px,calc(100vw-1rem))] lg:!-translate-x-1/2 lg:!-translate-y-1/2"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,rgba(244,63,94,0.07),transparent_50%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(59,130,246,0.04),transparent_45%)] dark:bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,rgba(244,63,94,0.14),transparent_50%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(59,130,246,0.08),transparent_45%)]"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t('cancel', { ns: 'common' })}
            className="absolute crm-end-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300/90 bg-white text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:border-red-400/60 hover:bg-red-50 hover:text-red-600 hover:shadow-[0_0_16px_rgba(239,68,68,0.35)] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-300 dark:hover:shadow-[0_0_18px_rgba(239,68,68,0.3)] sm:[inset-inline-end:0.625rem] sm:top-2 sm:h-8 sm:w-8"
          >
            <X className="h-4 w-4" />
          </button>
          <DialogHeader className="relative z-10 shrink-0 border-b border-slate-300/90 bg-white px-3 py-1.5 crm-pe-10 shadow-[inset_0_-1px_0_rgba(148,163,184,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-none sm:px-4 sm:py-2 sm:[padding-inline-end:2.75rem]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-50 text-rose-500 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 sm:h-9 sm:w-9 sm:rounded-xl">
                  <PackageSearch className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="truncate crm-text-start text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100 sm:text-base">
                    {t('catalogStockPicker.pickerMainHeading')}
                  </DialogTitle>
                  <DialogDescription className="sr-only">{t('catalogStockPicker.description')}</DialogDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1 rounded-lg border border-slate-300/90 bg-white px-2 text-[11px] font-medium text-slate-800 shadow-sm backdrop-blur-sm hover:border-rose-400/55 hover:bg-rose-50 hover:text-rose-600 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-200 dark:shadow-none dark:hover:border-rose-500/35 dark:hover:bg-rose-500/10 dark:hover:text-rose-100 sm:px-2.5 sm:text-xs"
                onClick={() => setHierarchyInfoOpen(true)}
              >
                <CircleHelp className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                <span className="hidden max-w-[10rem] truncate sm:inline">{t('catalogStockPicker.hierarchyInfoButton')}</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-0 overflow-hidden xl:grid xl:min-h-0 xl:grid-cols-[minmax(220px,22%)_minmax(0,1fr)] xl:items-stretch 2xl:grid-cols-[minmax(236px,21%)_minmax(0,1fr)]">
            <div
              className={cn(
                'flex flex-col overflow-hidden border-b border-slate-300/90 shadow-[inset_-1px_0_0_rgba(148,163,184,0.12)] backdrop-blur-sm dark:border-white/10 dark:shadow-none xl:shadow-[inset_-1px_0_0_rgba(148,163,184,0.14)] dark:xl:shadow-none',
                'bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.55))]',
                'dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.55),rgba(9,9,11,0.42))]',
                'min-h-0 max-xl:min-h-[100px] xl:h-full xl:min-h-0 xl:max-h-none xl:self-stretch xl:[border-inline-end-width:1px] xl:border-slate-300/90 xl:border-b-0',
                'max-xl:shrink-0',
                mobileCategoriesOpen ? 'max-lg:max-h-[min(52dvh,460px)]' : 'max-lg:max-h-[2.75rem]',
                'lg:max-h-[min(52dvh,460px)] xl:max-h-none',
              )}
            >
              <button
                type="button"
                onClick={() => setMobileCategoriesOpen((v) => !v)}
                aria-expanded={mobileCategoriesOpen}
                className="flex w-full items-center justify-between gap-2 border-b border-slate-300/90 bg-slate-50 px-3 py-2 crm-text-start transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] lg:hidden"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {leftPanelMode === 'code' ? (
                    <ListFilter className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                  ) : (
                    <FolderTree className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                  )}
                  <span className="truncate">
                    {leftPanelMode === 'code'
                      ? t('catalogStockPicker.mobileSpecialCodesAccordion')
                      : t('catalogStockPicker.mobileCategoriesAccordion')}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400',
                    mobileCategoriesOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>

              <div
                className={cn(
                  'flex min-h-0 flex-1 flex-col overflow-hidden xl:-mt-px xl:h-full xl:border-t-0',
                  !mobileCategoriesOpen && 'max-lg:hidden lg:flex',
                )}
              >
                <div className="shrink-0 border-b border-slate-300/90 bg-white/90 px-2.5 py-2 dark:border-white/10 dark:bg-zinc-950/80 sm:px-3">
                  <div
                    className="flex rounded-xl border border-slate-300/90 bg-slate-100/90 p-0.5 dark:border-white/10 dark:bg-white/[0.04]"
                    role="group"
                    aria-label={t('catalogStockPicker.leftPanelModeGroupLabel')}
                  >
                    <button
                      type="button"
                      onClick={() => handleLeftPanelModeChange('code')}
                      aria-pressed={leftPanelMode === 'code'}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2 py-2 text-[10px] font-bold uppercase tracking-wide transition-all sm:text-[11px]',
                        leftPanelMode === 'code'
                          ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-rose-700 dark:text-slate-400 dark:hover:text-rose-300',
                      )}
                    >
                      <ListFilter className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{t('catalogStockPicker.leftPanelModeCode')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLeftPanelModeChange('catalog')}
                      aria-pressed={leftPanelMode === 'catalog'}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2 py-2 text-[10px] font-bold uppercase tracking-wide transition-all sm:text-[11px]',
                        leftPanelMode === 'catalog'
                          ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-rose-700 dark:text-slate-400 dark:hover:text-rose-300',
                      )}
                    >
                      <FolderTree className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{t('catalogStockPicker.leftPanelModeCatalog')}</span>
                    </button>
                  </div>
                </div>

                {leftPanelMode === 'code' ? (
                  <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain bg-slate-100/55 px-2 py-2 [-webkit-overflow-scrolling:touch] dark:bg-zinc-950/40 sm:px-3 sm:py-2.5">
                    <CatalogSpecialCodeFilterPanel
                      selections={specialCodeSelections}
                      optionsByLevel={specialCodeOptionsByLevel}
                      isLoadingOptions={specialCodeFacetPoolQuery.isLoading}
                      onToggle={handleSpecialCodeToggle}
                      onClear={handleSpecialCodeClear}
                    />
                  </div>
                ) : (
                  <>
                    <div
                      className={cn(
                        'shrink-0 border-b border-slate-300/90 bg-gradient-to-b from-white to-transparent px-3 py-1.5 shadow-[inset_0_-1px_0_rgba(148,163,184,0.06)] dark:border-white/10 dark:from-white/[0.03] dark:shadow-none sm:px-3.5 sm:py-2 xl:px-3 xl:pb-1.5 xl:pt-1',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setMobileCategoryToolsOpen((v) => !v)}
                        aria-expanded={mobileCategoryToolsOpen}
                        className="mb-2 flex w-full items-center justify-between rounded-lg border border-slate-300/90 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08] lg:hidden"
                      >
                        <span>{t('catalogStockPicker.hierarchySectionTitle')}</span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400',
                            mobileCategoryToolsOpen && 'rotate-180',
                          )}
                          aria-hidden
                        />
                      </button>
                      <div className={cn(!mobileCategoryToolsOpen && 'max-lg:hidden', 'lg:block')}>
                        <div
                          className={cn(
                            'flex items-center justify-between gap-2',
                            navigationPath.length === 0 && !selectedLeafCategory && 'max-lg:hidden',
                          )}
                        >
                          <div className="hidden min-w-0 items-center gap-2 lg:flex">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-500/15 bg-rose-500/[0.06] text-rose-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                              <FolderTree className="h-3.5 w-3.5" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-600/95 dark:text-sky-400/90">
                                {t('catalogStockPicker.hierarchySectionTitle')}
                              </div>
                            </div>
                          </div>
                          {navigationPath.length > 0 || canResetCategoryBranch ? (
                            <div className="crm-ms-auto flex shrink-0 flex-wrap items-center justify-end gap-1">
                              {navigationPath.length > 0 ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleBackLevel}
                                  className="h-8 shrink-0 rounded-lg text-xs text-slate-600 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-rose-200"
                                >
                                  <ArrowLeft className="crm-me-1 h-3.5 w-3.5" />
                                  {t('catalogStockPicker.back')}
                                </Button>
                              ) : null}
                              {canResetCategoryBranch ? (
                                <Tooltip delayDuration={250}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleResetCategoryBranch}
                                      className="h-8 shrink-0 rounded-lg text-xs text-slate-600 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-rose-200"
                                      aria-label={t('catalogStockPicker.resetBranchTooltip')}
                                    >
                                      <RotateCcw className="crm-me-1 h-3.5 w-3.5" />
                                      {t('catalogStockPicker.resetBranch')}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                                    {t('catalogStockPicker.resetBranchTooltip')}
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-3 space-y-2 border-t border-slate-200/95 pt-3 dark:border-white/[0.06]">
                          {fullCategoryTreeQuery.isError ? (
                            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-300/50 bg-red-50/90 px-2.5 py-2 text-[11px] text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-100">
                              <span className="min-w-0 flex-1 leading-snug">{t('catalogStockPicker.categoryClientSearchError')}</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 shrink-0 border-red-300/60 text-xs text-red-800 hover:bg-red-100 dark:border-red-500/40 dark:text-red-100 dark:hover:bg-red-950/60"
                                onClick={() => void fullCategoryTreeQuery.refetch()}
                              >
                                {t('catalogStockPicker.categoryClientSearchRetry')}
                              </Button>
                            </div>
                          ) : null}

                          {fullCategoryTreeQuery.isLoading ? (
                            <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300/90 bg-slate-50/80 px-2.5 py-2 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-rose-500" aria-hidden />
                              <span>{t('catalogStockPicker.categoryClientSearchLoadingTree')}</span>
                            </div>
                          ) : null}

                          <div className="relative">
                            <Search className="pointer-events-none absolute crm-start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rose-500/75 dark:text-rose-400/75" aria-hidden />
                            <Input
                              value={categoryClientSearch}
                              onChange={(e) => setCategoryClientSearch(e.target.value)}
                              placeholder={t('catalogStockPicker.categoryClientSearchPlaceholder')}
                              disabled={!fullCategoryTreeQuery.data?.length || fullCategoryTreeQuery.isLoading}
                              className="h-10 rounded-2xl border border-slate-200/95 bg-white crm-ps-9 text-xs text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-500 focus-visible:border-rose-400/50 focus-visible:ring-rose-500/15 dark:border-white/12 dark:bg-zinc-900/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-rose-500/40 sm:[padding-inline-start:2.5rem] sm:text-[13px]"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <Label
                              htmlFor="catalog-category-search-branches"
                              className="cursor-pointer text-[11px] font-medium text-slate-700 dark:text-slate-300"
                            >
                              {t('catalogStockPicker.categoryClientSearchShowBranches')}
                            </Label>
                            <Switch
                              id="catalog-category-search-branches"
                              checked={categorySearchShowBranches}
                              onCheckedChange={setCategorySearchShowBranches}
                              disabled={!fullCategoryTreeQuery.data?.length || fullCategoryTreeQuery.isLoading}
                            />
                          </div>

                          {tokenizeCategorySearchQuery(debouncedCategoryClientSearch).length > 0 ? (
                            <div className="max-h-[min(40vh,220px)] overflow-y-auto rounded-xl border border-slate-300/90 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                              {fullCategoryTreeQuery.isLoading ? (
                                <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-slate-500 dark:text-slate-400">
                                  <Loader2 className="h-4 w-4 animate-spin text-rose-500" aria-hidden />
                                </div>
                              ) : categoryClientSearchResults.length === 0 ? (
                                <div className="px-3 py-4 text-center text-[11px] text-slate-500 dark:text-slate-400">
                                  {t('catalogStockPicker.categoryClientSearchEmpty')}
                                </div>
                              ) : (
                                <ul className="divide-y divide-slate-200/90 dark:divide-white/[0.06]">
                                  {categoryClientSearchResults.map((row) => (
                                    <li key={row.catalogCategoryId}>
                                      <button
                                        type="button"
                                        onClick={() => handleCategoryClientSearchPick(row)}
                                        className="flex w-full flex-col gap-0.5 px-3 py-2 crm-text-start transition-colors hover:bg-rose-50/90 dark:hover:bg-rose-500/10"
                                      >
                                        <span className="text-[12px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
                                          {row.name}
                                          {row.hasChildren ? (
                                            <Badge
                                              variant="outline"
                                              className="crm-ms-2 align-middle text-[9px] font-normal text-cyan-700 dark:text-cyan-300"
                                            >
                                              {t('catalogStockPicker.subCategoryBadge')}
                                            </Badge>
                                          ) : (
                                            <Badge
                                              variant="outline"
                                              className="crm-ms-2 align-middle text-[9px] font-normal text-rose-700 dark:text-rose-300"
                                            >
                                              {t('catalogStockPicker.leafBadge')}
                                            </Badge>
                                          )}
                                        </span>
                                        <span className="line-clamp-2 font-mono text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                                          {row.fullPath ?? row.code}
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {categoryClientSearchResults.length >= MAX_CATEGORY_CLIENT_SEARCH_RESULTS ? (
                                <div className="border-t border-slate-200/90 px-3 py-2 text-[10px] text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
                                  {t('catalogStockPicker.categoryClientSearchCapped', { count: MAX_CATEGORY_CLIENT_SEARCH_RESULTS })}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="relative flex min-h-0 flex-1 touch-pan-y flex-col overflow-hidden overscroll-contain bg-slate-100/55 px-2 py-2 [-webkit-overflow-scrolling:touch] dark:bg-zinc-950/40 sm:px-3 sm:py-2.5 xl:px-3 xl:py-2">
                      {catalogsQuery.isLoading ? (
                        <div className="flex min-h-[9rem] flex-1 flex-col justify-center py-8 text-center text-xs text-slate-500 xl:min-h-0 dark:text-slate-400">
                          {t('catalogStockPicker.loadingCatalogs')}
                        </div>
                      ) : catalogListForQueries.length > 0 ? (
                        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto [-webkit-overflow-scrolling:touch] touch-pan-y pb-2 crm-ps-0-5 crm-pe-1 pt-0.5 sm:[padding-inline-end:0.375rem]">
                          <p className="shrink-0 px-0.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                            {t('catalogStockPicker.hierarchySectionTitle')}
                          </p>
                          {catalogListForQueries.map((catalog, catalogIdx) => {
                            const catalogExpanded = expandedCatalogIds.has(catalog.id);
                            const catQ = categoryQueries[catalogIdx];
                            const localPath = catalogPaths[catalog.id] ?? [];
                            const categoriesForCatalog = catQ?.data ?? [];
                            const catalogLoading =
                              catalogExpanded && (catQ?.isPending || catQ?.isFetching) && categoriesForCatalog.length === 0;

                            return (
                              <div key={catalog.id} className="mb-1.5 last:mb-0">
                                <button
                                  type="button"
                                  onClick={() => toggleCatalogExpanded(catalog.id)}
                                  aria-expanded={catalogExpanded}
                                  className={cn(
                                    'flex w-full items-center gap-2 rounded-lg py-2.5 crm-ps-1 crm-pe-2 crm-text-start transition-colors',
                                    catalogExpanded
                                      ? 'bg-rose-500/[0.11] dark:bg-rose-500/[0.14]'
                                      : 'hover:bg-slate-200/40 dark:hover:bg-white/[0.05]',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'shrink-0 self-stretch rounded-full transition-[width,background-color] duration-200',
                                      catalogExpanded
                                        ? 'w-1 bg-rose-500 dark:bg-rose-400'
                                        : 'w-0 bg-transparent',
                                    )}
                                    aria-hidden
                                  />
                                  <Package
                                    className={cn(
                                      'h-4 w-4 shrink-0',
                                      catalogExpanded
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-slate-500 dark:text-slate-400',
                                    )}
                                    aria-hidden
                                  />
                                  <span
                                    className={cn(
                                      'min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[0.08em]',
                                      catalogExpanded
                                        ? 'text-rose-700 dark:text-rose-300'
                                        : 'text-slate-800 dark:text-slate-100',
                                    )}
                                  >
                                    {catalog.name}
                                  </span>
                                  <ChevronRight
                                    className={cn(
                                      'h-4 w-4 shrink-0 transition-transform duration-200',
                                      catalogExpanded
                                        ? 'rotate-90 text-rose-600 dark:text-rose-400'
                                        : 'text-slate-600 dark:text-slate-400',
                                    )}
                                    aria-hidden
                                  />
                                </button>
                                {catalogExpanded ? (
                                  <div className="crm-ms-2 mt-0.5 crm-border-start border-slate-300/80 dark:border-white/12">
                                    <div className="flex flex-col gap-0.5 py-0.5">
                                      {localPath.map((segment, pathIdx) => {
                                        const isTrailEnd = pathIdx === localPath.length - 1;
                                        const trailFolderFocus =
                                          selectedCatalog?.id === catalog.id &&
                                          isTrailEnd &&
                                          selectedLeafCategory?.catalogCategoryId ===
                                          localPath[localPath.length - 1]?.catalogCategoryId;
                                        const trailPadRem = 0.75 + pathIdx * 0.65;
                                        return (
                                          <button
                                            key={`${catalog.id}-trail-${segment.catalogCategoryId}-${pathIdx}`}
                                            type="button"
                                            ref={
                                              trailFolderFocus
                                                ? (categorySelectionRowRef as Ref<HTMLButtonElement>)
                                                : undefined
                                            }
                                            style={{ paddingInlineStart: `${trailPadRem}rem` }}
                                            onClick={() => handleCatalogTrailSegmentClick(catalog.id, pathIdx)}
                                            className={cn(
                                              'flex w-full items-center justify-between gap-2 rounded-md py-2 crm-pe-2 crm-text-start text-[13px] transition-colors',
                                              isTrailEnd
                                                ? 'bg-rose-500/15 font-semibold text-rose-900 dark:bg-rose-500/20 dark:text-rose-100'
                                                : 'bg-rose-500/[0.07] font-medium text-slate-800 dark:bg-rose-500/10 dark:text-slate-100',
                                            )}
                                          >
                                            <span className="min-w-0 flex-1 leading-snug">{segment.name}</span>
                                            {segment.hasChildren ? (
                                              isTrailEnd ? (
                                                <ChevronDown
                                                  className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400"
                                                  aria-hidden
                                                />
                                              ) : (
                                                <ChevronRight
                                                  className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
                                                  aria-hidden
                                                />
                                              )
                                            ) : null}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {catalogLoading ? (
                                      <div
                                        className="flex items-center gap-2 py-4 text-[11px] text-slate-500 dark:text-slate-400"
                                        style={{ paddingInlineStart: `${0.75 + localPath.length * 0.65}rem` }}
                                      >
                                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                        {t('catalogStockPicker.loadingCategories')}
                                      </div>
                                    ) : categoriesForCatalog.length > 0 ? (
                                      <div
                                        className="mt-0.5 flex flex-col gap-0.5 border-t border-slate-200/80 pt-1 dark:border-white/[0.08]"
                                        style={{ paddingInlineStart: `${0.75 + localPath.length * 0.65}rem` }}
                                      >
                                        {categoriesForCatalog.map((category) => {
                                          const isActive =
                                            selectedLeafCategory?.catalogCategoryId === category.catalogCategoryId;
                                          const listRowRef =
                                            isActive &&
                                            selectedCatalog?.id === catalog.id &&
                                            !(
                                              localPath.length > 0 &&
                                              selectedLeafCategory?.catalogCategoryId ===
                                              localPath[localPath.length - 1]?.catalogCategoryId
                                            );
                                          return (
                                            <button
                                              key={category.catalogCategoryId}
                                              type="button"
                                              ref={
                                                listRowRef
                                                  ? (categorySelectionRowRef as Ref<HTMLButtonElement>)
                                                  : undefined
                                              }
                                              onClick={() => handleCategoryClick(catalog.id, category)}
                                              className={cn(
                                                'w-full rounded-md px-2 py-2 crm-text-start text-[13px] transition-colors',
                                                isActive
                                                  ? 'bg-slate-200/90 text-slate-900 dark:bg-white/10 dark:text-slate-50'
                                                  : 'text-slate-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:bg-white/[0.06]',
                                              )}
                                            >
                                              <div className="flex items-start justify-between gap-2">
                                                <span className="min-w-0 flex-1 font-medium leading-snug text-slate-800 dark:text-slate-100">
                                                  {category.name}
                                                </span>
                                                {category.hasChildren ? (
                                                  <ChevronRight
                                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
                                                    aria-hidden
                                                  />
                                                ) : null}
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : localPath.length > 0 ? (
                                      <div
                                        className="py-3 text-center text-[11px] text-slate-500 dark:text-slate-400"
                                        style={{ paddingLeft: `${0.75 + localPath.length * 0.65}rem` }}
                                      >
                                        {t('catalogStockPicker.emptyCategories')}
                                      </div>
                                    ) : (
                                      <div className="py-3 crm-ps-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
                                        {t('catalogStockPicker.emptyCategories')}
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex min-h-[9rem] flex-1 flex-col justify-center py-8 text-center text-sm text-slate-500 xl:min-h-0 dark:text-slate-400">
                          {t('catalogStockPicker.noCatalogSelected')}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div
              className={cn(
                'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden xl:h-full xl:min-h-0',
                mobileStocksOpen ? 'max-lg:min-h-0' : 'max-lg:h-[2.75rem] max-lg:max-h-[2.75rem] max-lg:flex-none max-lg:shrink-0 max-lg:overflow-hidden',
              )}
            >
              <button
                type="button"
                onClick={() => setMobileStocksOpen((v) => !v)}
                aria-expanded={mobileStocksOpen}
                className="flex w-full items-center justify-between gap-2 border-b border-slate-300/90 bg-slate-50 px-3 py-2 crm-text-start transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] lg:hidden"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <ShoppingBag className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                  <span className="truncate">{t('catalogStockPicker.mobileStocksAccordion')}</span>
                </span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400',
                    mobileStocksOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>

              <div
                className={cn(
                  'flex min-h-0 flex-1 flex-col',
                  'max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto max-lg:overscroll-y-contain max-lg:touch-pan-y max-lg:[-webkit-overflow-scrolling:touch]',
                  'lg:overflow-hidden',
                  !mobileStocksOpen && 'max-lg:hidden lg:flex',
                )}
              >
                <div className="shrink-0 overflow-visible border-b border-slate-300/90 bg-white px-4 py-2 shadow-[inset_0_-1px_0_rgba(148,163,184,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-none sm:px-5 sm:py-2.5">
                  <div className="flex w-full shrink-0 flex-col gap-3 overflow-visible sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 shrink-0 items-center justify-start gap-3 overflow-x-auto px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 md:gap-5">
                      <button
                        type="button"
                        onClick={toggleStockBrowseCampaign}
                        aria-pressed={stockBrowseMode === 'campaign'}
                        className={cn(
                          'group relative isolate flex shrink-0 items-center gap-2 overflow-visible rounded-xl border px-3 py-2 text-[11px] font-bold tracking-wide transition-all duration-300 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm',
                          stockBrowseMode === 'campaign'
                            ? 'scale-105 border-transparent bg-gradient-to-r from-rose-500 via-rose-500 to-rose-500 text-white shadow-[0_8px_20px_rgba(244,63,94,0.4)] ring-4 ring-rose-100 dark:ring-rose-950/55'
                            : 'border-rose-200 bg-gradient-to-r from-rose-50 to-rose-100/50 text-rose-600 hover:from-rose-100 hover:to-rose-100 dark:border-rose-800/50 dark:from-rose-950/45 dark:to-rose-950/20 dark:text-rose-200 dark:hover:from-rose-900/55 dark:hover:to-rose-900/25',
                        )}
                      >
                        <span className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl" aria-hidden>
                          <span
                            className={cn(
                              'catalog-tab-shine-layer pointer-events-none',
                              stockBrowseMode !== 'campaign' && 'catalog-tab-shine-layer--muted',
                            )}
                          />
                        </span>
                        <span
                          className={cn(
                            'relative z-[2] inline-flex shrink-0',
                            stockBrowseMode === 'campaign' && 'catalog-tab-flame-flicker text-yellow-300',
                          )}
                        >
                          <Flame className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden />
                        </span>
                        <span className="relative z-[2] whitespace-nowrap">{t('catalogStockPicker.campaignStocksChip')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={toggleStockBrowseFavorites}
                        aria-pressed={stockBrowseMode === 'favorites'}
                        className={cn(
                          'group relative isolate flex shrink-0 items-center gap-2 overflow-visible rounded-xl border px-3 py-2 text-[11px] font-bold tracking-wide transition-all duration-300 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm',
                          stockBrowseMode === 'favorites'
                            ? 'scale-105 border-transparent bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950 shadow-[0_8px_20px_rgba(251,191,36,0.4)] ring-4 ring-amber-100 dark:ring-amber-950/50'
                            : 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-600 hover:from-amber-100 hover:to-yellow-100 dark:border-amber-800/45 dark:from-amber-950/40 dark:to-yellow-950/30 dark:text-amber-200 dark:hover:from-amber-900/50 dark:hover:to-yellow-900/40',
                        )}
                      >
                        <span className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl" aria-hidden>
                          <span
                            className={cn(
                              'catalog-tab-shine-layer catalog-tab-shine-layer--delay pointer-events-none',
                              stockBrowseMode !== 'favorites' && 'catalog-tab-shine-layer--muted',
                            )}
                          />
                        </span>
                        <span
                          className={cn(
                            'relative z-[2] inline-flex shrink-0',
                            stockBrowseMode === 'favorites' ? 'catalog-tab-star-twinkle' : 'catalog-tab-star-twinkle-soft',
                          )}
                        >
                          <Star
                            className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
                            strokeWidth={1.75}
                            fill={stockBrowseMode === 'favorites' ? 'currentColor' : 'none'}
                            aria-hidden
                          />
                        </span>
                        <span className="relative z-[2] whitespace-nowrap">{t('catalogStockPicker.favoriteStocksChip')}</span>
                      </button>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-2 sm:justify-end sm:gap-3">
                      <div
                        className="flex shrink-0 gap-0.5 rounded-lg border border-slate-300/90 bg-slate-50 p-0.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none"
                        role="group"
                        aria-label={t('catalogStockPicker.viewModeGroupLabel')}
                      >
                        <Button
                          type="button"
                          variant={stockLayoutMode === 'list' ? 'secondary' : 'ghost'}
                          size="sm"
                          className={cn(
                            'h-8 rounded-md px-2 text-slate-600 dark:text-slate-300 sm:h-8 sm:rounded-lg sm:px-2.5',
                            stockLayoutMode === 'list' &&
                            'border border-rose-500/30 bg-rose-500/15 text-rose-700 shadow-[0_0_14px_rgba(236,72,153,0.2)] dark:text-rose-100',
                          )}
                          onClick={() => setStockLayoutMode('list')}
                          aria-pressed={stockLayoutMode === 'list'}
                          title={t('catalogStockPicker.viewModeList')}
                        >
                          <List className="h-4 w-4" />
                          <span className="crm-ms-1-5 hidden text-xs font-medium sm:inline">{t('catalogStockPicker.viewModeList')}</span>
                        </Button>
                        <Button
                          type="button"
                          variant={stockLayoutMode === 'cards' ? 'secondary' : 'ghost'}
                          size="sm"
                          className={cn(
                            'h-8 rounded-md px-2 text-slate-600 dark:text-slate-300 sm:h-8 sm:rounded-lg sm:px-2.5',
                            stockLayoutMode === 'cards' &&
                            'border border-rose-500/30 bg-rose-500/15 text-rose-700 shadow-[0_0_14px_rgba(236,72,153,0.2)] dark:text-rose-100',
                          )}
                          onClick={() => setStockLayoutMode('cards')}
                          aria-pressed={stockLayoutMode === 'cards'}
                          title={t('catalogStockPicker.viewModeCards')}
                        >
                          <LayoutGrid className="h-4 w-4" />
                          <span className="crm-ms-1-5 hidden text-xs font-medium sm:inline">{t('catalogStockPicker.viewModeCards')}</span>
                        </Button>
                      </div>
                      <div className="relative min-w-0 w-full flex-1 sm:min-w-[200px] sm:max-w-md">
                        <Search className="pointer-events-none absolute crm-start-2-5 top-2.5 h-3.5 w-3.5 text-rose-500/70 dark:text-rose-400/70 sm:[inset-inline-start:0.75rem] sm:top-2.5 sm:h-4 sm:w-4" />
                        <Input
                          value={stockSearch}
                          onChange={(event) => setStockSearch(event.target.value)}
                          placeholder={t('catalogStockPicker.searchPlaceholder')}
                          className="h-8 rounded-xl border border-slate-300/90 bg-white crm-ps-8 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 backdrop-blur-sm focus-visible:border-rose-400/60 focus-visible:ring-rose-500/20 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-100 dark:placeholder:text-slate-500 dark:shadow-none dark:focus-visible:border-rose-500/40 sm:h-9 sm:rounded-2xl sm:[padding-inline-start:2.5rem]"
                          disabled={
                            (stockBrowseMode === 'category' && !selectedLeafCategory) ||
                            (leftPanelMode === 'code' && stockBrowseMode === 'specialCodes' && !specialCodeHasSelection)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {multiSelect && (sessionPicks.length > 0 || catalogDraftSnapshotList.length > 0) ? (
                  <div className="shrink-0 border-b border-slate-300/90 bg-white px-4 py-1.5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 sm:px-5">
                    <div className="rounded-xl border border-rose-400/35 bg-rose-50/90 p-2 shadow-sm ring-1 ring-rose-200/40 backdrop-blur-md dark:border-rose-500/25 dark:bg-rose-500/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-0 sm:rounded-2xl sm:p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-sm">
                            {t('catalogStockPicker.selectionPanelTitle')}
                          </div>
                          <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                            {t('catalogStockPicker.selectionPanelHint')}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-700 shadow-[0_0_14px_rgba(236,72,153,0.25)] dark:text-rose-100 sm:text-xs">
                          {t('catalogStockPicker.confirmTotalCount', {
                            count: catalogDraftSnapshotList.length + sessionPicks.length,
                          })}
                        </span>
                      </div>
                      {catalogDraftSnapshotList.length > 0 ? (
                        <p className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                          {t('catalogStockPicker.draftRetainedInConfirm', { count: catalogDraftSnapshotList.length })}
                        </p>
                      ) : null}
                      {sessionPicks.length > 0 ? (
                        <HorizontalScrollRow
                          syncKey={selectedScrollSyncKey}
                          scrollBackLabel={t('catalogStockPicker.scrollBack')}
                          scrollForwardLabel={t('catalogStockPicker.scrollForward')}
                          className="mt-1.5"
                          scrollStep={280}
                        >
                          {sessionPicks.map((pick) => (
                            <div
                              key={pick.pickId}
                              className="flex max-w-[min(320px,70vw)] shrink-0 items-center gap-1.5 rounded-xl border border-slate-300/90 bg-white px-2.5 py-1.5 text-xs shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none"
                            >
                              <div className="min-w-0 flex-1 truncate">
                                <span className="font-mono font-semibold text-rose-600 dark:text-rose-300">{pick.result.code}</span>
                                <span className="text-slate-400 dark:text-slate-500"> · </span>
                                <span className="text-slate-600 dark:text-slate-400">{pick.result.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => duplicateSessionPickById(pick.pickId)}
                                className="shrink-0 rounded-full p-1 text-slate-500 transition-colors hover:bg-emerald-100 hover:text-emerald-700 dark:text-slate-500 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300"
                                aria-label={t('catalogStockPicker.duplicateSelection')}
                                title={t('catalogStockPicker.duplicateSelection')}
                              >
                                <PlusCircle className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSessionPickById(pick.pickId)}
                                className="shrink-0 rounded-full p-1 text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                                aria-label={t('catalogStockPicker.removeSelection')}
                                title={t('catalogStockPicker.removeSelection')}
                              >
                                <MinusCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </HorizontalScrollRow>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {helperStrip}
                <div
                  className={cn(
                    'relative min-h-0 px-3 py-2 sm:px-5 sm:py-3',
                    'bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(244,63,94,0.04),transparent_55%),linear-gradient(180deg,rgba(248,250,252,0.9),rgba(241,245,249,0.55)_35%,rgba(241,245,249,0.35))]',
                    'ring-1 ring-inset ring-slate-200/90 dark:ring-0',
                    'dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_40%)]',
                    'max-lg:flex-none max-lg:min-h-0 max-lg:overflow-visible',
                    'lg:flex-1 lg:min-h-0 lg:touch-pan-y lg:overflow-y-auto lg:overscroll-y-contain lg:[-webkit-overflow-scrolling:touch]',
                  )}
                >
                  {stockListScrollInner}
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 shrink-0 px-3 pb-3 pt-2 sm:px-5 sm:pb-4">
            <div className="rounded-2xl border border-slate-300/90 bg-white px-4 py-3 shadow-[0_-12px_40px_rgba(15,23,42,0.12),0_0_40px_rgba(236,72,153,0.08)] ring-1 ring-slate-200/70 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_-12px_40px_rgba(0,0,0,0.35),0_0_40px_rgba(236,72,153,0.08)] dark:ring-0 sm:px-5 sm:py-3.5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="line-clamp-2 text-[11px] text-slate-600 dark:text-slate-400 sm:text-xs lg:line-clamp-none lg:max-w-[55%]">
                  {t('catalogStockPicker.footerHint')}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border border-slate-300/90 bg-white text-slate-800 shadow-sm backdrop-blur-sm hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-200 dark:shadow-none dark:hover:border-white/25 dark:hover:bg-white/10"
                    onClick={() => onOpenChange(false)}
                  >
                    {t('cancel', { ns: 'common' })}
                  </Button>
                  {multiSelect ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void handleConfirmMulti()}
                      disabled={sessionPicks.length === 0 && catalogDraftSnapshotList.length === 0}
                      className="min-w-[180px] border border-rose-500/35 bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-[0_0_24px_rgba(236,72,153,0.35)] hover:border-rose-400/60 hover:from-rose-500 hover:to-amber-500 hover:bg-gradient-to-r hover:text-white disabled:opacity-40"
                    >
                      {t('catalogStockPicker.confirmSelection')}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={hierarchyInfoOpen} onOpenChange={setHierarchyInfoOpen}>
        <DialogContent
          showCloseButton
          className="!z-[100] max-h-[min(90dvh,880px)] w-[calc(100vw-1rem)] max-w-2xl gap-0 overflow-y-auto border border-slate-200/80 bg-white p-0 sm:p-0 dark:border-white/10 dark:bg-zinc-950"
        >
          <DialogHeader className="border-b border-slate-200/80 px-6 py-5 crm-text-start dark:border-white/10">
            <DialogTitle className="text-xl">{t('catalogStockPicker.hierarchyBlueprintTitle')}</DialogTitle>
            <DialogDescription className="crm-text-start text-sm text-muted-foreground">
              {t('catalogStockPicker.hierarchyBlueprintDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">{t('catalogStockPicker.hierarchyExampleLabel')}:</span>{' '}
              {t('catalogStockPicker.hierarchyExampleValue')}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(['root', 'subcategory', 'brand', 'series', 'products'] as const).map((stage, index) => (
                <div
                  key={stage}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-zinc-950/60"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
                      {index + 1}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t(`catalogStockPicker.hierarchyStages.${stage}.title`)}
                    </div>
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {t(`catalogStockPicker.hierarchyStages.${stage}.description`)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RelatedStocksSelectionDialog
        open={relatedDialogOpen}
        onOpenChange={(nextOpen) => {
          setRelatedDialogOpen(nextOpen);
          if (!nextOpen) {
            setRelatedDialogStock(null);
            setRelatedDialogRelations([]);
          }
        }}
        relatedStocks={relatedDialogRelations}
        onConfirm={handleRelatedStocksConfirm}
      />
    </>
  );
}
