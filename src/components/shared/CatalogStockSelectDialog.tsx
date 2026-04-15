'use client';

import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FolderTree,
  LayoutGrid,
  MinusCircle,
  Search,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { categoryDefinitionsApi } from '@/features/category-definitions/api/category-definitions-api';
import type {
  CatalogCategoryNodeDto,
  CatalogStockItemDto,
  ProductCatalogDto,
} from '@/features/category-definitions/types/category-definition-types';
import type { ProductSelectionResult } from './ProductSelectDialog';
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
}

const PAGE_SIZE = 24;

export function CatalogStockSelectDialog({
  open,
  onOpenChange,
  onSelect,
  onMultiSelect,
  multiSelect = false,
  initialSelectedResults = [],
}: CatalogStockSelectDialogProps): ReactElement {
  const { t } = useTranslation('common');
  const [selectedCatalog, setSelectedCatalog] = useState<ProductCatalogDto | null>(null);
  const [navigationPath, setNavigationPath] = useState<CatalogCategoryNodeDto[]>([]);
  const [selectedLeafCategory, setSelectedLeafCategory] = useState<CatalogCategoryNodeDto | null>(null);
  const [stockSearch, setStockSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedResults, setSelectedResults] = useState<ProductSelectionResult[]>([]);
  const [relatedDialogOpen, setRelatedDialogOpen] = useState(false);
  const [relatedDialogStock, setRelatedDialogStock] = useState<CatalogStockItemDto | null>(null);
  const [relatedDialogRelations, setRelatedDialogRelations] = useState<StockRelationDto[]>([]);
  const debouncedStockSearch = useDebouncedValue(stockSearch, 300);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setSelectedCatalog(null);
      setNavigationPath([]);
      setSelectedLeafCategory(null);
      setStockSearch('');
      setPageNumber(1);
      setSelectedResults([]);
      setRelatedDialogOpen(false);
      setRelatedDialogStock(null);
      setRelatedDialogRelations([]);
      wasOpenRef.current = false;
      return;
    }

    if (!wasOpenRef.current) {
      setSelectedResults(initialSelectedResults);
      wasOpenRef.current = true;
    }
  }, [initialSelectedResults, open]);

  const catalogsQuery = useQuery({
    queryKey: ['catalog-stock-picker-catalogs'],
    queryFn: categoryDefinitionsApi.getCatalogs,
    enabled: open,
  });

  useEffect(() => {
    if (!open || !catalogsQuery.data?.length || selectedCatalog) return;
    setSelectedCatalog(catalogsQuery.data[0]);
  }, [open, catalogsQuery.data, selectedCatalog]);

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
  }, [selectedLeafCategory?.catalogCategoryId, debouncedStockSearch]);

  const stocksQuery = useQuery({
    queryKey: [
      'catalog-stock-picker-stocks',
      selectedCatalog?.id,
      selectedLeafCategory?.catalogCategoryId,
      pageNumber,
      debouncedStockSearch,
    ],
    queryFn: () =>
      categoryDefinitionsApi.getCatalogCategoryStocks(selectedCatalog!.id, selectedLeafCategory!.catalogCategoryId, {
        pageNumber,
        pageSize: PAGE_SIZE,
        search: debouncedStockSearch.trim() || undefined,
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

  const currentStep = !selectedCatalog ? 1 : !selectedLeafCategory ? 2 : 3;

  const handleCatalogChange = (catalog: ProductCatalogDto): void => {
    setSelectedCatalog(catalog);
    setNavigationPath([]);
    setSelectedLeafCategory(null);
    setStockSearch('');
    setPageNumber(1);
  };

  const handleCategoryClick = (category: CatalogCategoryNodeDto): void => {
    if (category.hasChildren) {
      setNavigationPath((prev) => [...prev, category]);
      setSelectedLeafCategory(null);
      return;
    }

    setSelectedLeafCategory(category);
  };

  const handleBackLevel = (): void => {
    setNavigationPath((prev) => prev.slice(0, -1));
    setSelectedLeafCategory(null);
  };

  const handleBreadcrumbClick = (index: number): void => {
    setNavigationPath((prev) => prev.slice(0, index + 1));
    setSelectedLeafCategory(null);
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
    if (!multiSelect || !onMultiSelect || selectedResults.length === 0) return;
    await onMultiSelect(selectedResults);
    onOpenChange(false);
  };

  const selectedLeafLabel = selectedLeafCategory?.name ?? t('catalogStockPicker.noLeafSelected');
  const selectedLeafPathLabel = selectedLeafCategory?.fullPath ?? selectedLeafCategory?.name ?? t('catalogStockPicker.noLeafSelected');
  const currentHierarchyPath = useMemo(() => {
    const parts = [
      selectedCatalog?.name,
      ...navigationPath.map((item) => item.name),
      selectedLeafCategory?.name,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' / ') : t('catalogStockPicker.noCatalogSelected');
  }, [navigationPath, selectedCatalog?.name, selectedLeafCategory?.name, t]);
  const helperTitle = !selectedLeafCategory
    ? t('catalogStockPicker.rightPanelTitle')
    : selectedResults.length > 0
      ? t('catalogStockPicker.selectionReadyTitle')
      : stockItems.length > 0
        ? t('catalogStockPicker.stocksFoundTitle', { count: stockItems.length })
        : t('catalogStockPicker.emptyStocksTitle');

  const helperDescription = !selectedLeafCategory
    ? t('catalogStockPicker.selectLeafHint')
    : selectedResults.length > 0
      ? t('catalogStockPicker.selectionReadyHint')
      : stockItems.length > 0
        ? t('catalogStockPicker.rightPanelLeafHint')
        : t('catalogStockPicker.emptyStocks');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[min(1360px,calc(100vw-2rem))] !max-w-[min(1360px,calc(100vw-2rem))] h-[min(92vh,920px)] p-0 overflow-hidden border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 flex flex-col">
        <DialogHeader className="border-b border-slate-200/80 px-6 py-5 dark:border-white/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-500">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                {t('catalogStockPicker.title')}
              </DialogTitle>
              <div className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {t('catalogStockPicker.description')}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 xl:min-w-[360px]">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={cn(
                    'rounded-2xl border px-3 py-2 text-left transition-all',
                    currentStep === step
                      ? 'border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-200'
                      : currentStep > step
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                        : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400'
                  )}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                    {t(`catalogStockPicker.step${step}Label`)}
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {t(`catalogStockPicker.step${step}Title`)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {catalogsQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">{t('catalogStockPicker.loadingCatalogs')}</div>
            ) : (
              catalogsQuery.data?.map((catalog) => (
                <button
                  key={catalog.id}
                  type="button"
                  onClick={() => handleCatalogChange(catalog)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-semibold transition-all',
                    selectedCatalog?.id === catalog.id
                      ? 'border-pink-400 bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-pink-300 hover:text-pink-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-pink-500/30 dark:hover:text-pink-300'
                  )}
                >
                  <span>{catalog.name}</span>
                  <span className={cn('ml-2 text-xs', selectedCatalog?.id === catalog.id ? 'text-pink-100' : 'text-muted-foreground')}>
                    {catalog.code}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {t('catalogStockPicker.hierarchyBlueprintTitle')}
                </div>
                <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {t('catalogStockPicker.hierarchyBlueprintDescription')}
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-white/10 dark:bg-zinc-950/60 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">{t('catalogStockPicker.hierarchyExampleLabel')}:</span>{' '}
                {t('catalogStockPicker.hierarchyExampleValue')}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {(['root', 'subcategory', 'brand', 'series', 'products'] as const).map((stage, index) => (
                <div
                  key={stage}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-zinc-950/60"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
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
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-b border-slate-200/80 dark:border-white/10 xl:border-r xl:border-b-0">
            <div className="border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <FolderTree className="h-4 w-4 text-pink-500" />
                  {t('catalogStockPicker.categoriesTitle')}
                </div>
                {navigationPath.length > 0 ? (
                  <Button type="button" variant="ghost" size="sm" onClick={handleBackLevel}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    {t('catalogStockPicker.back')}
                  </Button>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {selectedCatalog?.name ?? t('catalogStockPicker.noCatalogSelected')}
                </Badge>
                {navigationPath.map((item, index) => (
                  <button
                    key={item.catalogCategoryId}
                    type="button"
                    onClick={() => handleBreadcrumbClick(index)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:border-pink-300 hover:text-pink-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-pink-500/40 dark:hover:text-pink-300"
                  >
                    <span>{item.name}</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {categoriesQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">{t('catalogStockPicker.loadingCategories')}</div>
              ) : categoriesQuery.data?.length ? (
                <div className="space-y-3">
                  {categoriesQuery.data.map((category) => (
                    <button
                      key={category.catalogCategoryId}
                      type="button"
                      onClick={() => handleCategoryClick(category)}
                      className={cn(
                        'w-full rounded-3xl border px-4 py-4 text-left transition-all',
                        selectedLeafCategory?.catalogCategoryId === category.catalogCategoryId
                          ? 'border-pink-400 bg-pink-50 text-pink-700 shadow-md shadow-pink-500/10 dark:border-pink-500/50 dark:bg-pink-500/10 dark:text-pink-200'
                          : 'border-slate-200 bg-white hover:border-pink-200 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-pink-500/30 dark:hover:bg-white/10'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold">{category.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{category.code}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 dark:border-white/10 dark:bg-white/5">
                              {t('catalogStockPicker.levelBadge', { level: category.level })}
                            </span>
                            {category.fullPath ? (
                              <span className="line-clamp-1">{category.fullPath}</span>
                            ) : null}
                          </div>
                          {category.description ? (
                            <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">{category.description}</div>
                          ) : null}
                        </div>
                        <div className="shrink-0">
                          {category.hasChildren ? (
                            <Badge variant="secondary">{t('catalogStockPicker.subCategoryBadge')}</Badge>
                          ) : (
                            <Badge variant="outline">{t('catalogStockPicker.leafBadge')}</Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm text-muted-foreground dark:border-white/10">
                  {t('catalogStockPicker.emptyCategories')}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <ShoppingBag className="h-4 w-4 text-pink-500" />
                    {t('catalogStockPicker.stocksTitle')}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                      {t('catalogStockPicker.selectedLeaf')}: {selectedLeafLabel}
                    </Badge>
                    <Badge variant="outline">
                      {t('catalogStockPicker.currentPathLabel')}: {currentHierarchyPath}
                    </Badge>
                    {selectedLeafCategory ? (
                      <Badge variant="outline">
                        {t('catalogStockPicker.levelBadge', { level: selectedLeafCategory.level })}
                      </Badge>
                    ) : null}
                    {multiSelect && selectedResults.length > 0 ? (
                      <Badge className="bg-pink-500">
                        {t('catalogStockPicker.selectedCount', { count: selectedResults.length })}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="relative xl:w-[360px]">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={stockSearch}
                    onChange={(event) => setStockSearch(event.target.value)}
                    placeholder={t('catalogStockPicker.searchPlaceholder')}
                    className="h-11 rounded-2xl pl-10"
                    disabled={!selectedLeafCategory}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-500">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {helperTitle}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {helperDescription}
                    </div>
                    {selectedLeafCategory ? (
                      <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-zinc-950/50 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-white">{t('catalogStockPicker.selectedPathLabel')}:</span>{' '}
                        {selectedLeafPathLabel}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {multiSelect && selectedResults.length > 0 ? (
                <div className="mt-4 rounded-3xl border border-pink-200 bg-pink-50/70 p-4 dark:border-pink-500/20 dark:bg-pink-500/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t('catalogStockPicker.selectionPanelTitle')}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t('catalogStockPicker.selectionPanelHint')}
                      </div>
                    </div>
                    <Badge className="bg-pink-500">
                      {t('catalogStockPicker.selectedCount', { count: selectedResults.length })}
                    </Badge>
                  </div>

                  <div className="mt-3 flex max-h-[136px] flex-wrap gap-2 overflow-y-auto pr-1">
                    {selectedResults.map((item) => (
                      <div
                        key={getSelectionKey(item)}
                        className="flex items-center gap-2 rounded-2xl border border-pink-200 bg-white px-3 py-2 text-xs dark:border-pink-500/20 dark:bg-zinc-950/60"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-semibold text-pink-600 dark:text-pink-300">
                            {item.code}
                          </div>
                          <div className="max-w-[180px] truncate text-muted-foreground">
                            {item.name}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelection(item)}
                          className="rounded-full p-1 text-slate-400 transition-colors hover:bg-pink-100 hover:text-pink-600 dark:hover:bg-pink-500/10 dark:hover:text-pink-300"
                          aria-label={t('catalogStockPicker.removeSelection')}
                          title={t('catalogStockPicker.removeSelection')}
                        >
                          <MinusCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {!selectedLeafCategory ? (
                <div className="flex h-full min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center dark:border-white/10 dark:bg-white/5">
                  <div className="max-w-md">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-pink-500/10 text-pink-500">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                      {t('catalogStockPicker.selectLeafTitle')}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {t('catalogStockPicker.selectLeafHint')}
                    </div>
                  </div>
                </div>
              ) : stocksQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">{t('catalogStockPicker.loadingStocks')}</div>
              ) : stockItems.length ? (
                <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                  {stockItems.map((stock) => {
                    const selectionKey = getSelectionKey({ id: stock.stockId, code: stock.erpStockCode });
                    const selected = selectedKeys.has(selectionKey) || initialSelectedResults.some((item) => getSelectionKey(item) === selectionKey);

                    return (
                      <button
                        key={stock.stockCategoryId}
                        type="button"
                        onClick={() => void handleStockClick(stock)}
                        className={cn(
                          'group rounded-3xl border p-4 text-left transition-all',
                          selected
                            ? 'border-pink-400 bg-pink-50 shadow-md shadow-pink-500/10 dark:border-pink-500/50 dark:bg-pink-500/10'
                            : 'border-slate-200 bg-white hover:border-pink-300 hover:shadow-lg hover:shadow-pink-500/10 dark:border-white/10 dark:bg-white/5 dark:hover:border-pink-500/30 dark:hover:bg-white/10'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-xl border border-pink-200 bg-pink-100 px-2 py-1 font-mono text-[11px] font-semibold text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/30 dark:text-pink-300">
                                {stock.erpStockCode}
                              </span>
                              {selected ? <Check className="h-4 w-4 text-pink-500" /> : null}
                            </div>

                            <div className="mt-3 line-clamp-2 text-base font-semibold text-slate-900 dark:text-white">
                              {stock.stockName}
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                                <div className="text-[11px] uppercase tracking-[0.12em]">{t('catalogStockPicker.groupCode')}</div>
                                <div className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{stock.grupKodu || '-'}</div>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                                <div className="text-[11px] uppercase tracking-[0.12em]">{t('catalogStockPicker.unit')}</div>
                                <div className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{stock.unit || '-'}</div>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                                <div className="text-[11px] uppercase tracking-[0.12em]">{t('catalogStockPicker.code1')}</div>
                                <div className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{stock.kod1 || '-'}</div>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                                <div className="text-[11px] uppercase tracking-[0.12em]">{t('catalogStockPicker.code2')}</div>
                                <div className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{stock.kod2 || '-'}</div>
                              </div>
                            </div>
                            {(relationMap.get(stock.stockId)?.length ?? 0) > 0 ? (
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Badge className="bg-orange-500/90 text-white">
                                  {t('catalogStockPicker.relatedStocksBadge', { count: relationMap.get(stock.stockId)?.length ?? 0 })}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {t('catalogStockPicker.relatedStocksHint')}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <div className="shrink-0">
                            <div className={cn(
                              'rounded-2xl px-3 py-2 text-xs font-semibold',
                              selected
                                ? 'bg-pink-500 text-white'
                                : 'bg-slate-100 text-slate-700 group-hover:bg-pink-100 group-hover:text-pink-700 dark:bg-white/10 dark:text-slate-200 dark:group-hover:bg-pink-500/20 dark:group-hover:text-pink-200'
                            )}>
                              {selected ? t('catalogStockPicker.selectedBadge') : t('catalogStockPicker.selectStockButton')}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {hasNextPage ? (
                    <div className="2xl:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-2xl"
                        onClick={() => setPageNumber((prev) => prev + 1)}
                      >
                        {t('catalogStockPicker.loadMore')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center dark:border-white/10 dark:bg-white/5">
                  <div className="max-w-md">
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                      {t('catalogStockPicker.emptyStocksTitle')}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {t('catalogStockPicker.emptyStocks')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/80 px-6 py-4 dark:border-white/10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-muted-foreground">
              {t('catalogStockPicker.footerHint')}
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              {multiSelect ? (
                <Button
                  type="button"
                  onClick={() => void handleConfirmMulti()}
                  disabled={selectedResults.length === 0}
                  className="min-w-[180px]"
                >
                  {t('catalogStockPicker.confirmSelection')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>

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
    </Dialog>
  );
}
