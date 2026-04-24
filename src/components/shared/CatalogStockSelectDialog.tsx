'use client';

import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FolderTree,
  LayoutGrid,
  List,
  MinusCircle,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { categoryDefinitionsApi } from '@/features/category-definitions/api/category-definitions-api';
import type {
  CatalogCategoryNodeDto,
  CatalogStockItemDto,
  ProductCatalogDto,
} from '@/features/category-definitions/types/category-definition-types';
import { stockMatchesDraftSnapshot, type ProductSelectionResult } from './ProductSelectDialog';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { stockApi } from '@/features/stock/api/stock-api';
import type { StockRelationDto } from '@/features/stock/types';
import { RelatedStocksSelectionDialog } from './RelatedStocksSelectionDialog';

interface CatalogStockSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: ProductSelectionResult) => void | Promise<void>;
  onMultiSelect?: (results: ProductSelectionResult[]) => void | Promise<void>;
  multiSelect?: boolean;
  initialSelectedResults?: ProductSelectionResult[];
  /** Belgedeki mevcut satır stokları — “Satırda” rozeti */
  existingLineStockMarkers?: ProductSelectionResult[];
}

const PAGE_SIZE = 24;

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
}: CatalogStockSelectDialogProps): ReactElement {
  const { t } = useTranslation('common');
  const [selectedCatalog, setSelectedCatalog] = useState<ProductCatalogDto | null>(null);
  const [navigationPath, setNavigationPath] = useState<CatalogCategoryNodeDto[]>([]);
  const [selectedLeafCategory, setSelectedLeafCategory] = useState<CatalogCategoryNodeDto | null>(null);
  const [includeDescendants, setIncludeDescendants] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedResults, setSelectedResults] = useState<ProductSelectionResult[]>([]);
  const [relatedDialogOpen, setRelatedDialogOpen] = useState(false);
  const [relatedDialogStock, setRelatedDialogStock] = useState<CatalogStockItemDto | null>(null);
  const [relatedDialogRelations, setRelatedDialogRelations] = useState<StockRelationDto[]>([]);
  const [hierarchyInfoOpen, setHierarchyInfoOpen] = useState(false);
  const [helperStripOpen, setHelperStripOpen] = useState(false);
  /** C: kompakt tablo satırları vs kartlar */
  const [stockLayoutMode, setStockLayoutMode] = useState<'cards' | 'list'>('list');
  /** Yalnızca max-lg: dar ekranda accordion; xl+ iki sütun düzeni değişmez */
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(true);
  const [mobileStocksOpen, setMobileStocksOpen] = useState(true);
  const debouncedStockSearch = useDebouncedValue(stockSearch, 300);
  const wasOpenRef = useRef(false);
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
      setSelectedResults([]);
      setRelatedDialogOpen(false);
      setRelatedDialogStock(null);
      setRelatedDialogRelations([]);
      setHierarchyInfoOpen(false);
      setHelperStripOpen(false);
      setStockLayoutMode('list');
      setMobileCategoriesOpen(true);
      setMobileStocksOpen(true);
      wasOpenRef.current = false;
      initialDraftSnapshotRef.current = [];
      documentLinesSnapshotRef.current = [];
      return;
    }

    if (!wasOpenRef.current) {
      const snapshot = initialSelectedResults.map((r) => ({ ...r }));
      initialDraftSnapshotRef.current = snapshot;
      documentLinesSnapshotRef.current = (existingLineStockMarkers ?? []).map((r) => ({ ...r }));
      setSelectedResults([]);
      wasOpenRef.current = true;
    }
  }, [initialSelectedResults, open, existingLineStockMarkers]);

  const catalogsQuery = useQuery({
    queryKey: ['catalog-stock-picker-catalogs'],
    queryFn: categoryDefinitionsApi.getCatalogs,
    enabled: open,
  });

  useEffect(() => {
    if (!open || !catalogsQuery.data?.length || selectedCatalog) return;
    setSelectedCatalog(catalogsQuery.data[0]);
  }, [open, catalogsQuery.data, selectedCatalog]);

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
  }, [open, selectedLeafCategory?.catalogCategoryId]);

  const currentParentCategoryId = navigationPath.length > 0
    ? navigationPath[navigationPath.length - 1]?.catalogCategoryId ?? null
    : null;

  const categoriesQuery = useQuery({
    queryKey: ['catalog-stock-picker-categories', selectedCatalog?.id, currentParentCategoryId],
    queryFn: () => categoryDefinitionsApi.getCatalogCategories(selectedCatalog!.id, currentParentCategoryId),
    enabled: open && selectedCatalog != null,
  });

  useEffect(() => {
    setPageNumber(1);
  }, [selectedLeafCategory?.catalogCategoryId, debouncedStockSearch, includeDescendants]);

  const stocksQuery = useQuery({
    queryKey: [
      'catalog-stock-picker-stocks',
      selectedCatalog?.id,
      selectedLeafCategory?.catalogCategoryId,
      includeDescendants,
      pageNumber,
      debouncedStockSearch,
    ],
    queryFn: () =>
      categoryDefinitionsApi.getCatalogCategoryStocks(selectedCatalog!.id, selectedLeafCategory!.catalogCategoryId, {
        pageNumber,
        pageSize: PAGE_SIZE,
        search: debouncedStockSearch.trim() || undefined,
        includeDescendants,
      }),
    enabled: open && selectedCatalog != null && selectedLeafCategory != null,
  });

  const stockItems = stocksQuery.data?.data ?? [];
  const totalCount = stocksQuery.data?.totalCount ?? stockItems.length;
  const hasNextPage = pageNumber * PAGE_SIZE < totalCount;

  const relationQueries = useQueries({
    queries: stockItems.map((stock) => ({
      queryKey: ['catalog-stock-picker-relations', stock.stockId],
      queryFn: () => stockApi.getRelations(stock.stockId),
      enabled: open && selectedLeafCategory != null,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const relationMap = useMemo(() => {
    const map = new Map<number, StockRelationDto[]>();
    stockItems.forEach((stock, index) => {
      const relations = relationQueries[index]?.data ?? [];
      map.set(stock.stockId, relations);
    });
    return map;
  }, [stockItems, relationQueries]);

  const getSelectionKey = (value: { id?: number; code: string }): string =>
    value.id != null ? `id:${value.id}` : `code:${value.code}`;

  const upsertSelection = (result: ProductSelectionResult): void => {
    const nextKey = getSelectionKey(result);
    setSelectedResults((prev) => {
      const existingIndex = prev.findIndex((item) => getSelectionKey(item) === nextKey);
      if (existingIndex >= 0) {
        return prev.map((item, index) => (index === existingIndex ? result : item));
      }
      return [...prev, result];
    });
  };

  const removeSelection = (result: ProductSelectionResult): void => {
    const targetKey = getSelectionKey(result);
    setSelectedResults((prev) => prev.filter((item) => getSelectionKey(item) !== targetKey));
  };

  const selectedKeys = useMemo(
    () => new Set(selectedResults.map((item) => getSelectionKey(item))),
    [selectedResults]
  );

  const selectedScrollSyncKey = useMemo(
    () => selectedResults.map((item) => getSelectionKey(item)).join('|'),
    [selectedResults]
  );

  const currentStep = !selectedCatalog ? 1 : !selectedLeafCategory ? 2 : 3;

  const handleCatalogChange = (catalog: ProductCatalogDto): void => {
    setSelectedCatalog(catalog);
    setNavigationPath([]);
    setSelectedLeafCategory(null);
    setIncludeDescendants(false);
    setStockSearch('');
    setPageNumber(1);
  };

  const handleCategoryClick = (category: CatalogCategoryNodeDto): void => {
    if (category.hasChildren) {
      setNavigationPath((prev) => [...prev, category]);
      setSelectedLeafCategory(null);
      setIncludeDescendants(false);
      return;
    }

    setSelectedLeafCategory(category);
    setIncludeDescendants(false);
  };

  const handleCategoryList = (category: CatalogCategoryNodeDto): void => {
    setSelectedLeafCategory(category);
    setIncludeDescendants(category.hasChildren);
    setPageNumber(1);
  };

  const handleBackLevel = (): void => {
    setNavigationPath((prev) => prev.slice(0, -1));
    setSelectedLeafCategory(null);
    setIncludeDescendants(false);
  };

  const handleBreadcrumbClick = (index: number): void => {
    setNavigationPath((prev) => prev.slice(0, index + 1));
    setSelectedLeafCategory(null);
    setIncludeDescendants(false);
  };

  const toSelectionResult = (stock: CatalogStockItemDto): ProductSelectionResult => ({
    id: stock.stockId,
    code: stock.erpStockCode,
    name: stock.stockName,
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
      if (selectedResults.some((item) => getSelectionKey(item) === key)) {
        removeSelection(result);
      } else {
        upsertSelection(result);
      }
      return;
    }

    await onSelect(result);
    onOpenChange(false);
  };

  const handleRelatedStocksConfirm = async (selectedStockIds: number[]): Promise<void> => {
    if (!relatedDialogStock) return;

    const result: ProductSelectionResult = {
      ...toSelectionResult(relatedDialogStock),
      relatedStockIds: selectedStockIds,
    };

    if (multiSelect) {
      upsertSelection(result);
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
    const session = selectedResults;
    if (draft.length === 0 && session.length === 0) return;
    const merged = [...draft, ...session];
    await onMultiSelect(merged);
    onOpenChange(false);
  };

  const selectedLeafLabel = selectedLeafCategory?.name ?? t('catalogStockPicker.noLeafSelected');
  const selectedLeafPathLabel = selectedLeafCategory?.fullPath ?? selectedLeafCategory?.name ?? t('catalogStockPicker.noLeafSelected');
  const selectionModeLabel = selectedLeafCategory
    ? includeDescendants
      ? t('catalogStockPicker.listDescendantsModeBadge')
      : t('catalogStockPicker.directCategoryModeBadge')
    : null;
  const currentHierarchyPath = useMemo(() => {
    const parts = [
      selectedCatalog?.name,
      ...navigationPath.map((item) => item.name),
      selectedLeafCategory?.name,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' / ') : t('catalogStockPicker.noCatalogSelected');
  }, [navigationPath, selectedCatalog?.name, selectedLeafCategory?.name, t]);

  const categoryScrollSyncKey = useMemo(
    () => `${selectedCatalog?.id ?? 0}-${navigationPath.map((p) => p.catalogCategoryId).join('-')}`,
    [navigationPath, selectedCatalog?.id],
  );

  const catalogHeaderScrollSyncKey = useMemo(
    () => `${catalogsQuery.data?.map((c) => c.id).join('-') ?? ''}-${selectedCatalog?.id ?? 0}`,
    [catalogsQuery.data, selectedCatalog?.id],
  );

  const catalogDraftSnapshotList = initialDraftSnapshotRef.current;
  const catalogDocumentLinesList = documentLinesSnapshotRef.current;

  const stockBadgesScrollSyncKey = useMemo(
    () =>
      `${selectedLeafCategory?.catalogCategoryId ?? 0}-${includeDescendants ? '1' : '0'}-${selectedResults.length + catalogDraftSnapshotList.length}-${currentHierarchyPath.length}`,
    [
      selectedLeafCategory?.catalogCategoryId,
      includeDescendants,
      selectedResults.length,
      catalogDraftSnapshotList.length,
      currentHierarchyPath.length,
    ],
  );

  const hasAnyPicksOrDraft = selectedResults.length > 0 || catalogDraftSnapshotList.length > 0;

  const helperTitle = !selectedLeafCategory
    ? t('catalogStockPicker.rightPanelTitle')
    : hasAnyPicksOrDraft
      ? t('catalogStockPicker.selectionReadyTitle')
      : stockItems.length > 0
        ? t('catalogStockPicker.stocksFoundTitle', { count: stockItems.length })
        : t('catalogStockPicker.emptyStocksTitle');

  const helperDescription = !selectedLeafCategory
    ? t('catalogStockPicker.selectLeafHint')
    : hasAnyPicksOrDraft
      ? t('catalogStockPicker.selectionReadyHint')
      : stockItems.length > 0
        ? t('catalogStockPicker.rightPanelLeafHint')
        : t('catalogStockPicker.emptyStocks');

  const helperStrip = (
    <div className="shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80">
      <button
        type="button"
        onClick={() => setHelperStripOpen((v) => !v)}
        aria-expanded={helperStripOpen}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-100/70 dark:hover:bg-white/[0.04] sm:gap-3 sm:px-5 sm:py-2"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-pink-500/25 bg-pink-500/10 text-pink-500 shadow-[0_0_18px_rgba(236,72,153,0.18)] dark:text-pink-400 sm:h-8 sm:w-8 sm:rounded-xl">
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
        <div className="border-t border-slate-200/80 px-3 pb-2 pt-1.5 dark:border-white/10 sm:px-5 sm:pb-3 sm:pt-2">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-2 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] sm:rounded-2xl sm:p-3">
            <div className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">{helperDescription}</div>
            {selectedLeafCategory ? (
              <div className="mt-2 rounded-xl border border-dashed border-pink-500/25 bg-pink-50/60 px-2.5 py-1.5 text-xs text-slate-700 backdrop-blur-sm dark:bg-zinc-950/40 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{t('catalogStockPicker.selectedPathLabel')}:</span>{' '}
                <span className="line-clamp-2 break-all font-mono text-[11px] text-pink-600 dark:text-pink-200/90">{selectedLeafPathLabel}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  const stockListScrollInner = !selectedLeafCategory ? (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm dark:border-white/15 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-6 sm:py-12">
      <div className="max-w-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-pink-500/30 bg-pink-500/10 text-pink-500 shadow-[0_0_24px_rgba(236,72,153,0.22)] dark:text-pink-400 dark:shadow-[0_0_28px_rgba(236,72,153,0.25)]">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {t('catalogStockPicker.selectLeafTitle')}
        </div>
        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('catalogStockPicker.selectLeafHint')}</div>
      </div>
    </div>
  ) : stocksQuery.isLoading ? (
    <div className="flex min-h-0 flex-1 items-center justify-center py-8 text-sm text-slate-500 dark:text-slate-400">
      {t('catalogStockPicker.loadingStocks')}
    </div>
  ) : stockItems.length ? (
    stockLayoutMode === 'list' ? (
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] max-lg:overflow-visible lg:overflow-hidden">
        <div className="min-h-0 flex-1 touch-pan-y overscroll-contain [-webkit-overflow-scrolling:touch] max-lg:overflow-visible lg:overflow-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 sm:text-[11px]">
                <th className="w-[120px] px-2 py-1.5 sm:px-3 sm:py-2">{t('catalogStockPicker.listColCode')}</th>
                <th className="px-2 py-1.5 sm:px-3 sm:py-2">{t('catalogStockPicker.listColName')}</th>
                <th className="w-14 px-2 py-1.5 sm:py-2">{t('catalogStockPicker.unit')}</th>
                <th className="w-24 px-2 py-1.5 sm:py-2">{t('catalogStockPicker.groupCode')}</th>
                <th className="w-16 px-2 py-1.5 text-center sm:py-2">{t('catalogStockPicker.listColRelated')}</th>
                <th className="w-28 px-2 py-1.5 text-right sm:py-2">{t('catalogStockPicker.listColAction')}</th>
              </tr>
            </thead>
            <tbody>
              {stockItems.map((stock) => {
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
                      'cursor-pointer border-b border-slate-100 transition-colors duration-200 hover:bg-pink-50/80 dark:border-white/5 dark:hover:bg-pink-500/[0.07]',
                      selected && 'bg-pink-50 dark:bg-pink-500/10 ring-1 ring-inset ring-pink-500/25',
                    )}
                    onClick={() => void handleStockClick(stock)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void handleStockClick(stock);
                      }
                    }}
                  >
                    <td className="px-2 py-1 align-middle sm:px-3 sm:py-1.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-mono text-[11px] font-semibold tracking-wide text-pink-700 dark:text-pink-300 sm:text-xs">
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
                    <td className="px-2 py-1 align-middle sm:px-3 sm:py-1.5">
                      <span className="line-clamp-2 text-sm font-medium leading-relaxed tracking-tight text-slate-900 dark:text-slate-100">{stock.stockName}</span>
                    </td>
                    <td className="px-2 py-1 align-middle font-mono text-[11px] text-slate-500 dark:text-slate-400 sm:py-1.5 sm:text-xs">{stock.unit || '—'}</td>
                    <td className="px-2 py-1 align-middle font-mono text-[11px] text-slate-500 dark:text-slate-400 sm:py-1.5 sm:text-xs">{stock.grupKodu || '—'}</td>
                    <td className="px-2 py-1 align-middle text-center sm:py-1.5">
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
                    <td className="px-2 py-1 align-middle text-right sm:py-1.5">
                      {selected ? (
                        <span className="inline-flex items-center justify-end gap-1 text-xs font-semibold text-pink-600 dark:text-pink-300">
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
        {hasNextPage ? (
          <div className="shrink-0 border-t border-slate-200 bg-slate-50/60 p-2 dark:border-white/10 dark:bg-white/[0.02] sm:p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full rounded-xl border-slate-200 bg-white/80 text-xs text-slate-700 backdrop-blur-sm hover:border-pink-400/50 hover:bg-pink-50 hover:text-pink-600 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:border-pink-500/40 dark:hover:bg-pink-500/10 dark:hover:text-pink-100"
              onClick={() => setPageNumber((prev) => prev + 1)}
            >
              {t('catalogStockPicker.loadMore')}
            </Button>
          </div>
        ) : null}
      </div>
    ) : (
      <div className="relative flex min-h-0 flex-1 flex-col max-lg:overflow-visible lg:overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(236,72,153,0.06),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(148,163,184,0.08),transparent_60%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(236,72,153,0.08),transparent_55%)]"
          aria-hidden
        />
        <div className="relative min-h-0 flex-1 touch-pan-y overscroll-contain px-1 pt-1.5 [-webkit-overflow-scrolling:touch] max-lg:overflow-visible lg:overflow-y-auto">
          <div className="grid grid-cols-2 gap-2.5 pb-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 2xl:gap-3">
            {stockItems.map((stock) => {
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
              const imageUrl = stock.imageUrl?.trim() ? stock.imageUrl : null;

              return (
                <button
                  key={stock.stockCategoryId}
                  type="button"
                  onClick={() => void handleStockClick(stock)}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_0_rgba(255,255,255,0.7)_inset] backdrop-blur-md transition-all duration-300 ease-out will-change-transform dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none',
                    'hover:-translate-y-0.5 hover:border-pink-400/60 hover:shadow-[0_10px_30px_-8px_rgba(236,72,153,0.28),0_2px_6px_rgba(15,23,42,0.06)] dark:hover:border-pink-500/45 dark:hover:bg-white/[0.05] dark:hover:shadow-[0_6px_24px_rgba(236,72,153,0.22)]',
                    selected &&
                      'border-pink-400/70 bg-gradient-to-b from-pink-50/90 to-white shadow-[0_6px_22px_-6px_rgba(236,72,153,0.28)] ring-1 ring-pink-400/40 dark:from-pink-500/[0.08] dark:to-transparent dark:border-pink-500/55 dark:shadow-[0_0_22px_rgba(236,72,153,0.2)] dark:ring-pink-500/30',
                  )}
                >
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-500/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  />

                  {selected ? (
                    <div
                      className="pointer-events-none absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-pink-400/80 bg-pink-500 shadow-[0_4px_14px_-2px_rgba(236,72,153,0.6)] ring-2 ring-white/90 backdrop-blur-md dark:ring-zinc-950/80"
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
                          alt={stock.stockName}
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
                          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.14),transparent_55%),radial-gradient(circle_at_80%_90%,rgba(59,130,246,0.09),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.18),transparent_55%),radial-gradient(circle_at_80%_90%,rgba(59,130,246,0.12),transparent_50%)]"
                          aria-hidden
                        />
                        <div
                          className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:18px_18px] dark:opacity-70 dark:[background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)]"
                          aria-hidden
                        />
                        <span
                          className="pointer-events-none absolute -bottom-2 left-1 select-none font-mono text-[clamp(2.25rem,7vw,4rem)] font-black uppercase leading-none tracking-tighter text-slate-900/[0.07] transition-all duration-500 group-hover:-translate-y-0.5 group-hover:text-pink-500/20 dark:text-white/[0.06] dark:group-hover:text-pink-300/[0.14]"
                          aria-hidden
                        >
                          {watermark}
                        </span>
                        <Package
                          className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-slate-400/70 transition-all duration-300 group-hover:text-pink-500/70 dark:text-white/15 dark:group-hover:text-pink-300/60"
                          aria-hidden
                        />
                        <div
                          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(241,245,249,0.9),transparent_55%)] dark:bg-[linear-gradient(to_top,rgba(9,9,11,0.85),transparent_50%)]"
                          aria-hidden
                        />
                      </>
                    )}
                    {(inOpeningDraft || onDocumentLine || relCount > 0) ? (
                      <div className="absolute bottom-1.5 left-1.5 z-10 flex flex-wrap items-center gap-1">
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
                              <span className="inline-flex items-center gap-0.5 rounded-full border border-orange-500/50 bg-orange-500 px-1.5 py-0 font-mono text-[8px] font-semibold text-white shadow-sm backdrop-blur-md dark:border-orange-400/50 dark:bg-orange-500/25 dark:text-orange-100">
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
                      <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-pink-600 dark:text-pink-300/90">
                        {stock.erpStockCode}
                      </span>
                      {stock.unit ? (
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                          {stock.unit}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="line-clamp-2 min-h-[2.2em] text-[12.5px] font-medium leading-snug tracking-tight text-slate-800 dark:text-slate-100">
                      {stock.stockName}
                    </h3>

                    {(stock.grupKodu || stock.kod1) ? (
                      <div className="mt-auto flex items-center gap-1 pt-0.5">
                        {stock.grupKodu ? (
                          <span className="truncate rounded bg-pink-50 px-1.5 py-0.5 font-mono text-[9px] text-pink-700/90 dark:bg-pink-500/[0.08] dark:text-pink-200/90">
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
        {hasNextPage ? (
          <div className="relative z-10 shrink-0 border-t border-slate-200 bg-slate-50/70 p-2 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.02] sm:p-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full rounded-xl border-slate-200 bg-white/80 text-xs text-slate-700 backdrop-blur-sm hover:border-pink-400/50 hover:bg-pink-50 hover:text-pink-600 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:border-pink-500/40 dark:hover:bg-pink-500/10 dark:hover:text-pink-100"
              onClick={() => setPageNumber((prev) => prev + 1)}
            >
              {t('catalogStockPicker.loadMore')}
            </Button>
          </div>
        ) : null}
      </div>
    )
  ) : (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:px-6 sm:py-12">
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
        className="!fixed !flex min-h-0 flex-col gap-0 !overflow-hidden border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc_40%,#f1f5f9)] p-0 text-slate-900 shadow-[0_0_50px_rgba(236,72,153,0.1),0_25px_80px_rgba(15,23,42,0.18)] backdrop-blur-3xl dark:border-white/10 dark:bg-zinc-950/85 dark:bg-none dark:text-slate-100 dark:shadow-[0_0_50px_rgba(236,72,153,0.1),0_25px_80px_rgba(0,0,0,0.45)] max-lg:!top-3 max-lg:!h-[calc(100svh-0.75rem)] max-lg:!max-h-[calc(100svh-0.75rem)] max-lg:!translate-y-0 max-lg:!w-[calc(100vw-0.5rem)] max-lg:!max-w-[calc(100vw-0.5rem)] lg:!top-1/2 lg:!left-1/2 lg:!h-[min(96dvh,980px)] lg:!max-h-[min(96dvh,980px)] lg:!w-[min(1520px,calc(100vw-1rem))] lg:!max-w-[min(1520px,calc(100vw-1rem))] lg:!-translate-x-1/2 lg:!-translate-y-1/2"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,rgba(236,72,153,0.07),transparent_50%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(59,130,246,0.04),transparent_45%)] dark:bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,rgba(236,72,153,0.14),transparent_50%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(59,130,246,0.08),transparent_45%)]"
          aria-hidden
        />
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label={t('common.cancel')}
          className="absolute right-2.5 top-2.5 z-30 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 text-slate-500 shadow-sm backdrop-blur-sm transition-all hover:border-red-400/60 hover:bg-red-50 hover:text-red-600 hover:shadow-[0_0_16px_rgba(239,68,68,0.35)] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-300 dark:hover:shadow-[0_0_18px_rgba(239,68,68,0.3)] sm:right-3 sm:top-3 sm:h-9 sm:w-9"
        >
          <X className="h-4 w-4" />
        </button>
        <DialogHeader className="relative z-10 shrink-0 border-b border-slate-200/80 bg-white/95 px-3 py-2 pr-12 backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-0 before:-bottom-px before:h-px before:bg-gradient-to-r before:from-transparent before:via-pink-500/35 before:to-transparent dark:border-white/10 dark:bg-zinc-950/80 sm:px-4 sm:py-2.5 sm:pr-14">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-lg">
                <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-pink-500/30 bg-gradient-to-br from-pink-500/20 to-fuchsia-500/10 text-pink-500 shadow-[0_0_24px_rgba(236,72,153,0.25)] dark:text-pink-300 dark:shadow-[0_0_24px_rgba(236,72,153,0.28)] sm:h-8 sm:w-8 sm:rounded-2xl">
                  <LayoutGrid className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  <span
                    className="pointer-events-none absolute inset-0 animate-pulse rounded-xl bg-pink-500/10 sm:rounded-2xl"
                    aria-hidden
                  />
                </div>
                <span className="truncate bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent dark:from-slate-50 dark:to-slate-300">
                  {t('catalogStockPicker.title')}
                </span>
              </DialogTitle>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                {t('catalogStockPicker.description')}
              </p>
              <div className="mt-1.5 min-w-0">
                {catalogsQuery.isLoading ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t('catalogStockPicker.loadingCatalogs')}</div>
                ) : (
                  <HorizontalScrollRow
                    syncKey={catalogHeaderScrollSyncKey}
                    scrollBackLabel={t('catalogStockPicker.scrollBack')}
                    scrollForwardLabel={t('catalogStockPicker.scrollForward')}
                    scrollStep={180}
                    trackClassName="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {catalogsQuery.data?.map((catalog) => (
                      <button
                        key={catalog.id}
                        type="button"
                        onClick={() => handleCatalogChange(catalog)}
                        className={cn(
                          'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all sm:px-3 sm:py-1.5 sm:text-[13px]',
                          selectedCatalog?.id === catalog.id
                            ? 'border-pink-500/50 bg-pink-500/15 text-pink-700 shadow-[0_0_20px_rgba(236,72,153,0.25)] backdrop-blur-sm dark:text-pink-100'
                            : 'border-slate-200 bg-white/70 text-slate-700 backdrop-blur-sm hover:border-pink-400/50 hover:text-pink-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-pink-500/35 dark:hover:text-pink-200'
                        )}
                      >
                        <span className="whitespace-nowrap">{catalog.name}</span>
                        <span
                          className={cn(
                            'ml-1.5 font-mono text-[10px] sm:text-xs',
                            selectedCatalog?.id === catalog.id
                              ? 'text-pink-600/90 dark:text-pink-200/90'
                              : 'text-slate-500',
                          )}
                        >
                          {catalog.code}
                        </span>
                      </button>
                    ))}
                  </HorizontalScrollRow>
                )}
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-1.5 lg:w-auto lg:min-w-[280px] xl:min-w-[300px]">
              <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={cn(
                      'relative overflow-hidden rounded-xl border px-2 py-1.5 text-left backdrop-blur-sm transition-all duration-300 sm:rounded-2xl sm:px-2.5 sm:py-2',
                      currentStep === step
                        ? 'border-pink-500/45 bg-gradient-to-br from-pink-500/15 to-fuchsia-500/5 text-pink-700 shadow-[0_0_20px_rgba(236,72,153,0.18)] dark:text-pink-100'
                        : currentStep > step
                          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100'
                          : 'border-slate-200 bg-white/60 text-slate-500 dark:border-white/10 dark:bg-white/[0.03]'
                    )}
                  >
                    {currentStep === step ? (
                      <span
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-400/60 to-transparent"
                        aria-hidden
                      />
                    ) : null}
                    <div className="text-[9px] font-semibold uppercase leading-tight tracking-[0.14em] text-slate-500 dark:text-slate-400 sm:text-[10px] sm:tracking-[0.16em]">
                      {t(`catalogStockPicker.step${step}Label`)}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-snug text-slate-900 dark:text-slate-100 sm:mt-1 sm:text-xs">
                      {t(`catalogStockPicker.step${step}Title`)}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full shrink-0 justify-center gap-1.5 rounded-lg border-slate-200 bg-white/70 px-2 text-[11px] font-medium text-slate-700 backdrop-blur-sm hover:border-pink-400/50 hover:bg-pink-50 hover:text-pink-600 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-pink-500/35 dark:hover:bg-pink-500/10 dark:hover:text-pink-100 sm:text-xs lg:max-w-none"
                onClick={() => setHierarchyInfoOpen(true)}
              >
                <CircleHelp className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                <span className="truncate">{t('catalogStockPicker.hierarchyInfoButton')}</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-0 overflow-hidden xl:grid xl:grid-cols-[minmax(260px,27%)_minmax(0,1fr)] 2xl:grid-cols-[minmax(300px,24%)_minmax(0,1fr)]">
          <div
            className={cn(
              'flex shrink-0 flex-col overflow-hidden border-b border-slate-200 backdrop-blur-sm dark:border-white/10',
              'bg-[linear-gradient(180deg,rgba(248,250,252,0.85),rgba(241,245,249,0.45))]',
              'dark:bg-white/[0.02] dark:bg-none',
              'min-h-0 max-xl:min-h-[100px] xl:h-full xl:max-h-none xl:border-r xl:border-b-0',
              mobileCategoriesOpen ? 'max-lg:max-h-[min(52dvh,460px)]' : 'max-lg:max-h-[2.75rem]',
              'lg:max-h-[min(42dvh,340px)] xl:max-h-none',
            )}
          >
            <button
              type="button"
              onClick={() => setMobileCategoriesOpen((v) => !v)}
              aria-expanded={mobileCategoriesOpen}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] lg:hidden"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <FolderTree className="h-4 w-4 shrink-0 text-pink-500 dark:text-pink-400" />
                <span className="truncate">{t('catalogStockPicker.mobileCategoriesAccordion')}</span>
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
                'flex min-h-0 flex-1 flex-col overflow-hidden',
                !mobileCategoriesOpen && 'max-lg:hidden lg:flex',
              )}
            >
            <div className="border-b border-slate-200 px-4 py-2.5 dark:border-white/10 sm:px-5">
              <div
                className={cn(
                  'flex items-center justify-between gap-3',
                  navigationPath.length === 0 && 'max-lg:hidden',
                )}
              >
                <div className="hidden items-center gap-2 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 lg:flex">
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <FolderTree className="h-4 w-4 text-pink-500 drop-shadow-[0_0_6px_rgba(244,114,182,0.45)] dark:text-pink-400 dark:drop-shadow-[0_0_6px_rgba(244,114,182,0.65)]" />
                  </span>
                  {t('catalogStockPicker.categoriesTitle')}
                </div>
                {navigationPath.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBackLevel}
                    className="ml-auto shrink-0 text-slate-600 hover:bg-slate-100 hover:text-pink-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-pink-200"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    {t('catalogStockPicker.back')}
                  </Button>
                ) : null}
              </div>

              <HorizontalScrollRow
                syncKey={categoryScrollSyncKey}
                scrollBackLabel={t('catalogStockPicker.scrollBack')}
                scrollForwardLabel={t('catalogStockPicker.scrollForward')}
                className="mt-2"
                scrollStep={220}
              >
                <span className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 backdrop-blur-sm dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-200">
                  {selectedCatalog?.name ?? t('catalogStockPicker.noCatalogSelected')}
                </span>
                {navigationPath.map((item, index) => (
                  <button
                    key={item.catalogCategoryId}
                    type="button"
                    onClick={() => handleBreadcrumbClick(index)}
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-xs text-slate-600 backdrop-blur-sm transition-colors hover:border-pink-400/50 hover:text-pink-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-pink-500/40 dark:hover:text-pink-200"
                  >
                    <span className="max-w-[160px] truncate">{item.name}</span>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  </button>
                ))}
              </HorizontalScrollRow>
            </div>

            <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-3 py-2 [-webkit-overflow-scrolling:touch] sm:px-4 sm:py-3">
              {categoriesQuery.isLoading ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('catalogStockPicker.loadingCategories')}</div>
              ) : categoriesQuery.data?.length ? (
                <div className="space-y-1.5">
                  {categoriesQuery.data.map((category) => {
                    const isActive = selectedLeafCategory?.catalogCategoryId === category.catalogCategoryId;
                    return (
                      <div
                        key={category.catalogCategoryId}
                        className={cn(
                          'group/category relative w-full overflow-hidden rounded-xl border px-2.5 py-2 text-left transition-all duration-200 sm:px-3',
                          isActive
                            ? 'border-pink-300/70 bg-gradient-to-r from-pink-50/95 via-white to-white shadow-[inset_2px_0_0_rgba(236,72,153,0.9)] dark:border-pink-500/30 dark:from-pink-500/[0.08] dark:via-white/[0.03] dark:to-transparent dark:shadow-[inset_2px_0_0_rgba(236,72,153,0.85)]'
                            : 'border-slate-200/80 bg-white/70 hover:border-pink-300/50 hover:bg-pink-50/30 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-pink-500/25 dark:hover:bg-white/[0.04]'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleCategoryClick(category)}
                          className="relative z-10 w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <div className="truncate text-[13px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{category.name}</div>
                                {category.hasChildren ? (
                                  <ChevronRight className="h-3 w-3 shrink-0 text-slate-400 transition-transform group-hover/category:translate-x-0.5 dark:text-slate-500" aria-hidden />
                                ) : null}
                              </div>
                              <div className="mt-0.5 font-mono text-[10px] tracking-wide text-pink-600/90 dark:text-pink-300/70">{category.code}</div>
                              {category.fullPath ? (
                                <div className="mt-0.5 line-clamp-1 font-mono text-[9.5px] tracking-wide text-slate-400 dark:text-slate-500">{category.fullPath}</div>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0 font-mono text-[9px] text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                                L{category.level}
                              </span>
                              {category.hasChildren ? (
                                <span className="rounded-full border border-cyan-300/60 bg-cyan-50 px-1.5 py-0 text-[9px] font-medium text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-200">
                                  {t('catalogStockPicker.subCategoryBadge')}
                                </span>
                              ) : (
                                <span className="rounded-full border border-pink-300/60 bg-pink-50 px-1.5 py-0 text-[9px] font-medium text-pink-700 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-300">
                                  {t('catalogStockPicker.leafBadge')}
                                </span>
                              )}
                            </div>
                          </div>
                          {category.description ? (
                            <div className="mt-1 line-clamp-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{category.description}</div>
                          ) : null}
                        </button>

                        <div className="relative z-10 mt-1.5 flex flex-wrap gap-1">
                          {category.hasChildren ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleCategoryClick(category)}
                              className="h-7 rounded-lg border-slate-200 bg-white/80 px-2 text-[11px] font-medium text-slate-700 backdrop-blur-sm hover:border-pink-400/50 hover:bg-pink-50 hover:text-pink-600 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-pink-500/35 dark:hover:bg-pink-500/10 dark:hover:text-pink-100"
                            >
                              {t('catalogStockPicker.browseChildrenButton')}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleCategoryList(category)}
                            className={cn(
                              'h-7 rounded-lg px-2 text-[11px] font-semibold backdrop-blur-sm transition-all',
                              isActive
                                ? 'border border-pink-500/60 bg-pink-500 text-white shadow-[0_2px_10px_-2px_rgba(236,72,153,0.55)] hover:bg-pink-600 dark:border-pink-400/60 dark:bg-pink-500 dark:text-white dark:hover:bg-pink-600'
                                : 'border border-pink-300/60 bg-pink-50 text-pink-700 hover:border-pink-400/70 hover:bg-pink-100 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-200 dark:hover:bg-pink-500/20',
                            )}
                            variant={category.hasChildren ? 'secondary' : 'default'}
                          >
                            {t('catalogStockPicker.listDescendantsButton')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500 dark:border-white/15 dark:bg-white/[0.02] dark:text-slate-400">
                  {t('catalogStockPicker.emptyCategories')}
                </div>
              )}
            </div>
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
              className="flex w-full items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] lg:hidden"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <ShoppingBag className="h-4 w-4 shrink-0 text-pink-500 dark:text-pink-400" />
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
                /* Mobilde: başlık + arama + seçtiklerin + yardımcı şerit + liste tek sütunda kayar */
                'max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto max-lg:overscroll-y-contain max-lg:touch-pan-y max-lg:[-webkit-overflow-scrolling:touch]',
                'lg:overflow-hidden',
                !mobileStocksOpen && 'max-lg:hidden lg:flex',
              )}
            >
            <div className="shrink-0 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 sm:px-5 sm:py-2.5">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
                <div className="min-w-0">
                  <div className="hidden items-center gap-1.5 text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-sm lg:flex">
                    <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-pink-500 drop-shadow-[0_0_6px_rgba(244,114,182,0.45)] dark:text-pink-400 dark:drop-shadow-[0_0_6px_rgba(244,114,182,0.6)] sm:h-4 sm:w-4" />
                    {t('catalogStockPicker.stocksTitle')}
                  </div>
                  <HorizontalScrollRow
                    syncKey={stockBadgesScrollSyncKey}
                    scrollBackLabel={t('catalogStockPicker.scrollBack')}
                    scrollForwardLabel={t('catalogStockPicker.scrollForward')}
                    className="mt-1.5"
                    scrollStep={240}
                  >
                    <span className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-sm dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-200 sm:text-xs">
                      <span className="max-w-[200px] truncate sm:max-w-[280px]">
                        {t('catalogStockPicker.selectedLeaf')}: {selectedLeafLabel}
                      </span>
                    </span>
                    <span className="max-w-[min(360px,55vw)] shrink-0 rounded-full border border-pink-500/25 bg-pink-500/10 px-2.5 py-1 text-[11px] text-pink-700 backdrop-blur-sm dark:text-pink-200 sm:text-xs">
                      <span className="truncate">
                        {t('catalogStockPicker.currentPathLabel')}: {currentHierarchyPath}
                      </span>
                    </span>
                    {selectedLeafCategory ? (
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] text-cyan-700 backdrop-blur-sm dark:text-cyan-200 sm:text-[11px]">
                        {t('catalogStockPicker.levelBadge', { level: selectedLeafCategory.level })}
                      </span>
                    ) : null}
                    {selectionModeLabel ? (
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-600 backdrop-blur-sm dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-300 sm:text-[11px]">
                        {selectionModeLabel}
                      </span>
                    ) : null}
                    {multiSelect && (selectedResults.length > 0 || catalogDraftSnapshotList.length > 0) ? (
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-pink-500/40 bg-pink-500/15 px-2.5 py-1 text-[10px] font-semibold text-pink-700 shadow-[0_0_16px_rgba(236,72,153,0.25)] backdrop-blur-sm dark:text-pink-100 sm:text-xs">
                        {t('catalogStockPicker.confirmTotalCount', {
                          count: catalogDraftSnapshotList.length + selectedResults.length,
                        })}
                      </span>
                    ) : null}
                  </HorizontalScrollRow>
                </div>

                <div className="flex w-full shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
                  <div
                    className="flex shrink-0 gap-0.5 rounded-lg border border-slate-200 bg-white/70 p-0.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
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
                          'border border-pink-500/30 bg-pink-500/15 text-pink-700 shadow-[0_0_14px_rgba(236,72,153,0.2)] dark:text-pink-100',
                      )}
                      onClick={() => setStockLayoutMode('list')}
                      aria-pressed={stockLayoutMode === 'list'}
                      title={t('catalogStockPicker.viewModeList')}
                    >
                      <List className="h-4 w-4" />
                      <span className="ml-1.5 hidden text-xs font-medium sm:inline">{t('catalogStockPicker.viewModeList')}</span>
                    </Button>
                    <Button
                      type="button"
                      variant={stockLayoutMode === 'cards' ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-8 rounded-md px-2 text-slate-600 dark:text-slate-300 sm:h-8 sm:rounded-lg sm:px-2.5',
                        stockLayoutMode === 'cards' &&
                          'border border-pink-500/30 bg-pink-500/15 text-pink-700 shadow-[0_0_14px_rgba(236,72,153,0.2)] dark:text-pink-100',
                      )}
                      onClick={() => setStockLayoutMode('cards')}
                      aria-pressed={stockLayoutMode === 'cards'}
                      title={t('catalogStockPicker.viewModeCards')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="ml-1.5 hidden text-xs font-medium sm:inline">{t('catalogStockPicker.viewModeCards')}</span>
                    </Button>
                  </div>
                  <div className="relative min-w-0 flex-1 sm:max-w-[360px]">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-pink-500/70 dark:text-pink-400/70 sm:left-3 sm:top-2.5 sm:h-4 sm:w-4" />
                    <Input
                      value={stockSearch}
                      onChange={(event) => setStockSearch(event.target.value)}
                      placeholder={t('catalogStockPicker.searchPlaceholder')}
                      className="h-8 rounded-xl border-slate-200 bg-white/90 pl-8 text-sm text-slate-900 placeholder:text-slate-400 backdrop-blur-sm focus-visible:border-pink-400/60 focus-visible:ring-pink-500/20 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-pink-500/40 sm:h-9 sm:rounded-2xl sm:pl-10"
                      disabled={!selectedLeafCategory}
                    />
                  </div>
                </div>
              </div>
            </div>

            {multiSelect && (selectedResults.length > 0 || catalogDraftSnapshotList.length > 0) ? (
              <div className="shrink-0 border-b border-slate-200 bg-white/95 px-4 py-1.5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 sm:px-5">
                <div className="rounded-xl border border-pink-500/25 bg-pink-50/80 p-2 shadow-sm backdrop-blur-md dark:bg-pink-500/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:rounded-2xl sm:p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-sm">
                        {t('catalogStockPicker.selectionPanelTitle')}
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                        {t('catalogStockPicker.selectionPanelHint')}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-pink-500/40 bg-pink-500/15 px-2 py-0.5 text-[10px] font-semibold text-pink-700 shadow-[0_0_14px_rgba(236,72,153,0.25)] dark:text-pink-100 sm:text-xs">
                      {t('catalogStockPicker.confirmTotalCount', {
                        count: catalogDraftSnapshotList.length + selectedResults.length,
                      })}
                    </span>
                  </div>
                  {catalogDraftSnapshotList.length > 0 ? (
                    <p className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                      {t('catalogStockPicker.draftRetainedInConfirm', { count: catalogDraftSnapshotList.length })}
                    </p>
                  ) : null}
                  {selectedResults.length > 0 ? (
                    <HorizontalScrollRow
                      syncKey={selectedScrollSyncKey}
                      scrollBackLabel={t('catalogStockPicker.scrollBack')}
                      scrollForwardLabel={t('catalogStockPicker.scrollForward')}
                      className="mt-1.5"
                      scrollStep={280}
                    >
                      {selectedResults.map((item) => (
                        <div
                          key={getSelectionKey(item)}
                          className="flex max-w-[min(320px,70vw)] shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]"
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-mono font-semibold text-pink-600 dark:text-pink-300">{item.code}</span>
                            <span className="text-slate-400 dark:text-slate-500"> · </span>
                            <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSelection(item)}
                            className="shrink-0 rounded-full p-1 text-slate-500 transition-colors hover:bg-pink-100 hover:text-pink-600 dark:text-slate-500 dark:hover:bg-pink-500/15 dark:hover:text-pink-300"
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
                'bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(236,72,153,0.04),transparent_55%),linear-gradient(180deg,rgba(248,250,252,0.9),rgba(241,245,249,0.55)_35%,rgba(241,245,249,0.35))]',
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
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-12px_40px_rgba(15,23,42,0.12),0_0_40px_rgba(236,72,153,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_-12px_40px_rgba(0,0,0,0.35),0_0_40px_rgba(236,72,153,0.08)] sm:px-5 sm:py-3.5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="line-clamp-2 text-[11px] text-slate-600 dark:text-slate-400 sm:text-xs lg:line-clamp-none lg:max-w-[55%]">
                {t('catalogStockPicker.footerHint')}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-200 bg-white/90 text-slate-700 backdrop-blur-sm hover:border-slate-300 hover:bg-slate-50 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:border-white/25 dark:hover:bg-white/10"
                  onClick={() => onOpenChange(false)}
                >
                  {t('common.cancel')}
                </Button>
                {multiSelect ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void handleConfirmMulti()}
                    disabled={selectedResults.length === 0 && catalogDraftSnapshotList.length === 0}
                    className="min-w-[180px] border border-pink-500/35 bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white shadow-[0_0_24px_rgba(236,72,153,0.35)] hover:border-pink-400/60 hover:from-pink-500 hover:to-fuchsia-500 hover:bg-gradient-to-r hover:text-white disabled:opacity-40"
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
        <DialogHeader className="border-b border-slate-200/80 px-6 py-5 text-left dark:border-white/10">
          <DialogTitle className="text-xl">{t('catalogStockPicker.hierarchyBlueprintTitle')}</DialogTitle>
          <DialogDescription className="text-left text-sm text-muted-foreground">
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
